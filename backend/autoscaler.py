"""Predictive Scaling Engine for LocalScale

Implements a lightweight predictive auto-scaler that:
1. Reads the last N minutes of CPU usage from SQLite.
2. Applies a moving-average filter to smooth Docker-stat noise.
3. Runs a linear-regression trend analysis (slope) to predict
   upcoming load changes.
4. Issues SCALE_UP / SCALE_DOWN decisions based on configurable
   thresholds, with a cool-down period to prevent thrashing.
5. Logs every scaling decision to a `scaling_events` table.

All models used here are intentionally simple (no external ML libs
required beyond numpy) so the engine stays lightweight and
educational.
"""
from __future__ import annotations

import datetime
import json
import logging
import os
import sqlite3
import threading
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger("localscale.autoscaler")

# ---------------------------------------------------------------------------
# Simple numpy-free linear regression (fallback if numpy is unavailable)
# ---------------------------------------------------------------------------
def _linreg(x: List[float], y: List[float]):
    """Return (slope, intercept) via least-squares.  Uses numpy when
    available, falls back to a pure-python implementation."""
    n = len(x)
    if n < 2:
        return 0.0, 0.0
    try:
        import numpy as np
        coeffs = np.polyfit(x, y, 1)
        return float(coeffs[0]), float(coeffs[1])
    except ImportError:
        pass

    # Pure-python fallback
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi * xi for xi in x)
    denom = n * sum_x2 - sum_x * sum_x
    if denom == 0:
        return 0.0, (sum_y / n) if n else 0.0
    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def _moving_average(values: List[float], window: int = 3) -> List[float]:
    """Apply a simple moving-average filter to smooth noisy stats."""
    if window < 2 or len(values) < window:
        return values
    smoothed: List[float] = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        smoothed.append(sum(values[start:i + 1]) / (i - start + 1))
    return smoothed


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
@dataclass
class AutoScalerConfig:
    """Tunable knobs for the predictive scaler."""
    enabled: bool = False
    # Analysis window: how far back to look
    lookback_minutes: int = 5
    # Minimum data points required before predictions are made
    min_data_points: int = 5
    # Slope thresholds (CPU-percent per sample-step)
    slope_up_threshold: float = 5.0     # ≥ this slope → scale up
    slope_down_threshold: float = -2.0  # ≤ this slope → scale down
    # Current CPU must be below this % for a scale-down
    cpu_low_for_down: float = 20.0
    # Cooldown seconds between successive scaling actions (per service)
    cooldown_seconds: int = 60
    # Max / min replicas
    max_replicas: int = 10
    min_replicas: int = 1
    # Moving-average window size for smoothing
    ma_window: int = 3

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "AutoScalerConfig":
        known = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in d.items() if k in known})


# ---------------------------------------------------------------------------
# Scaling decision results
# ---------------------------------------------------------------------------
@dataclass
class ScalingDecision:
    action: str  # "SCALE_UP", "SCALE_DOWN", "NONE"
    container_name: str
    slope: float
    current_cpu: float
    current_replicas: int
    target_replicas: int
    reason: str
    timestamp: str = field(default_factory=lambda: datetime.datetime.utcnow().isoformat() + "Z")


# ---------------------------------------------------------------------------
# Predictive Scaling Engine
# ---------------------------------------------------------------------------
class PredictiveScaler:
    """Runs alongside the metrics scheduler and evaluates scaling
    decisions for each container group every tick."""

    def __init__(self, db_path: str, config: Optional[AutoScalerConfig] = None):
        self.db_path = db_path
        self.config = config or AutoScalerConfig()
        self._last_scale: Dict[str, float] = {}  # container → last scale epoch
        self._lock = threading.Lock()

    @staticmethod
    def _base_name(name: str) -> str:
        parts = str(name).rsplit("-", 1)
        if len(parts) == 2 and parts[1].isdigit():
            return parts[0]
        return str(name)

    # --- DB helpers ---
    def _init_events_table(self):
        """Create the ``scaling_events`` table if it doesn't exist."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS scaling_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    container_name TEXT,
                    action TEXT,
                    slope REAL,
                    current_cpu REAL,
                    current_replicas INTEGER,
                    target_replicas INTEGER,
                    reason TEXT,
                    timestamp TEXT
                )
                """
            )
            conn.commit()
        except sqlite3.Error as e:
            logger.exception("Failed to create scaling_events table: %s", e)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def _read_history(self, container_name: str) -> List[Dict[str, Any]]:
        """Return last N minutes of CPU data from metrics_history."""
        cutoff = (datetime.datetime.utcnow() - datetime.timedelta(minutes=self.config.lookback_minutes)).isoformat() + "Z"
        rows: List[Dict[str, Any]] = []
        base_name = self._base_name(container_name)
        if not base_name:
            return rows
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute(
                "SELECT cpu_pct, mem_mb, timestamp FROM metrics_history "
                "WHERE timestamp >= ? AND (container_name = ? OR container_name = ? OR container_name LIKE ?) "
                "ORDER BY timestamp ASC",
                (cutoff, container_name, base_name, f"{base_name}-%"),
            )
            buckets: Dict[str, Dict[str, float]] = {}
            for r in cur.fetchall():
                ts = str(r["timestamp"])
                b = buckets.setdefault(ts, {"cpu_sum": 0.0, "cpu_count": 0.0, "mem_sum": 0.0})
                b["cpu_sum"] += float(r["cpu_pct"])
                b["cpu_count"] += 1.0
                b["mem_sum"] += float(r["mem_mb"])

            for ts in sorted(buckets.keys()):
                b = buckets[ts]
                cpu_count = b["cpu_count"] if b["cpu_count"] > 0 else 1.0
                rows.append(
                    {
                        "cpu_percent": b["cpu_sum"] / cpu_count,
                        "mem_mb": b["mem_sum"],
                        "timestamp": ts,
                    }
                )
        except sqlite3.Error as e:
            logger.debug("Error reading metrics history: %s", e)
        finally:
            try:
                conn.close()
            except Exception:
                pass
        return rows

    def _write_event(self, decision: ScalingDecision):
        """Persist a scaling event to SQLite."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute(
                "INSERT INTO scaling_events (container_name, action, slope, current_cpu, "
                "current_replicas, target_replicas, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    decision.container_name,
                    decision.action,
                    decision.slope,
                    decision.current_cpu,
                    decision.current_replicas,
                    decision.target_replicas,
                    decision.reason,
                    decision.timestamp,
                ),
            )
            conn.commit()
        except sqlite3.Error as e:
            logger.exception("Failed to write scaling event: %s", e)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def get_events(self, limit: int = 50, container_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return recent scaling events."""
        self._init_events_table()
        events: List[Dict[str, Any]] = []
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            if container_name:
                base_name = self._base_name(container_name)
                cur.execute(
                    "SELECT * FROM scaling_events WHERE container_name = ? OR container_name = ? "
                    "ORDER BY timestamp DESC LIMIT ?",
                    (container_name, base_name, limit),
                )
            else:
                cur.execute("SELECT * FROM scaling_events ORDER BY timestamp DESC LIMIT ?", (limit,))
            for r in cur.fetchall():
                events.append(dict(r))
        except sqlite3.Error:
            logger.debug("scaling_events table may not exist yet")
        finally:
            try:
                conn.close()
            except Exception:
                pass
        return events

    # --- Core prediction logic ---
    def predict_scaling(self, container_name: str, current_replicas: int = 1) -> ScalingDecision:
        """Analyze trends and return a ScalingDecision."""
        history = self._read_history(container_name)

        if len(history) < self.config.min_data_points:
            return ScalingDecision(
                action="NONE",
                container_name=container_name,
                slope=0.0,
                current_cpu=history[-1]["cpu_percent"] if history else 0.0,
                current_replicas=current_replicas,
                target_replicas=current_replicas,
                reason=f"Insufficient data ({len(history)}/{self.config.min_data_points} points)",
            )

        # Apply moving-average smoothing
        raw_cpus = [h["cpu_percent"] for h in history]
        smoothed = _moving_average(raw_cpus, self.config.ma_window)

        # Linear regression for trend
        x = list(range(len(smoothed)))
        slope, _intercept = _linreg(x, smoothed)
        current_cpu = smoothed[-1]

        # Cooldown check
        now_epoch = time.time()
        with self._lock:
            last = self._last_scale.get(container_name, 0.0)
        in_cooldown = (now_epoch - last) < self.config.cooldown_seconds

        # Decision
        if slope >= self.config.slope_up_threshold and not in_cooldown:
            target = min(current_replicas + 1, self.config.max_replicas)
            if target == current_replicas:
                return ScalingDecision(
                    action="NONE", container_name=container_name,
                    slope=round(slope, 3), current_cpu=round(current_cpu, 2),
                    current_replicas=current_replicas, target_replicas=current_replicas,
                    reason=f"Already at max replicas ({self.config.max_replicas})",
                )
            return ScalingDecision(
                action="SCALE_UP", container_name=container_name,
                slope=round(slope, 3), current_cpu=round(current_cpu, 2),
                current_replicas=current_replicas, target_replicas=target,
                reason=f"CPU trend rising (slope={slope:.2f} >= {self.config.slope_up_threshold})",
            )

        if (slope <= self.config.slope_down_threshold
                and current_cpu < self.config.cpu_low_for_down
                and not in_cooldown):
            target = max(current_replicas - 1, self.config.min_replicas)
            if target == current_replicas:
                return ScalingDecision(
                    action="NONE", container_name=container_name,
                    slope=round(slope, 3), current_cpu=round(current_cpu, 2),
                    current_replicas=current_replicas, target_replicas=current_replicas,
                    reason=f"Already at min replicas ({self.config.min_replicas})",
                )
            return ScalingDecision(
                action="SCALE_DOWN", container_name=container_name,
                slope=round(slope, 3), current_cpu=round(current_cpu, 2),
                current_replicas=current_replicas, target_replicas=target,
                reason=f"CPU falling (slope={slope:.2f}) and low usage ({current_cpu:.1f}%)",
            )

        if in_cooldown:
            reason = f"In cooldown ({self.config.cooldown_seconds}s)"
        else:
            reason = f"CPU trend stable (slope={slope:.2f})"

        return ScalingDecision(
            action="NONE", container_name=container_name,
            slope=round(slope, 3), current_cpu=round(current_cpu, 2),
            current_replicas=current_replicas, target_replicas=current_replicas,
            reason=reason,
        )

    def record_scale_action(self, container_name: str, decision: ScalingDecision):
        """Mark that a scaling action was executed so cooldown can be enforced."""
        with self._lock:
            self._last_scale[container_name] = time.time()
        self._write_event(decision)

    def evaluate_all(self, containers: List[Dict[str, Any]], manager: Any) -> List[ScalingDecision]:
        """Run the predictive scaler across all container groups.

        ``containers`` is the list returned by ContainerManager.list_containers().
        Returns a list of decisions. If a decision triggers an action, this
        method calls ``manager.scale_container()`` to execute it.
        """
        if not self.config.enabled:
            return []

        # Group containers by base-name (strip trailing "-N")
        groups: Dict[str, int] = {}
        for c in containers:
            name = c.get("Name") or c.get("name") or ""
            if not name:
                continue
            # Detect base name: "web-1", "web-2" → "web"
            base = self._base_name(name)
            groups[base] = groups.get(base, 0) + 1

        decisions: List[ScalingDecision] = []
        for base_name, replica_count in groups.items():
            decision = self.predict_scaling(base_name, replica_count)
            decisions.append(decision)

            if decision.action in ("SCALE_UP", "SCALE_DOWN"):
                logger.info(
                    "Auto-scaler: %s %s → %d replicas (was %d). Reason: %s",
                    decision.action, base_name, decision.target_replicas,
                    decision.current_replicas, decision.reason,
                )
                try:
                    if manager and hasattr(manager, "scale_container"):
                        manager.scale_container(base_name, decision.target_replicas)
                    self.record_scale_action(base_name, decision)
                except Exception:
                    logger.exception("Failed to execute scaling action for %s", base_name)

        return decisions


__all__ = [
    "AutoScalerConfig",
    "ScalingDecision",
    "PredictiveScaler",
]
