"""Policy engine for LocalScale

Supports simple human-readable rules like:
- "Never spend more than $5.00/day"
- "Keep carbon footprint under 10g"

Provides an in-memory policy store with simple JSON persistence and
an evaluator that uses the simulator helpers to compute cost/carbon
for a given resource sample and report violations.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

try:
    from .simulator import calculate_cost, calculate_carbon_footprint
except Exception:
    try:
        from simulator import calculate_cost, calculate_carbon_footprint
    except Exception:
        def calculate_cost(*args, **kwargs):
            return 0.0

        def calculate_carbon_footprint(*args, **kwargs):
            return 0.0


class PolicyEngine:
    def __init__(self, policies: Optional[List[Dict[str, Any]]] = None):
        self.policies: List[Dict[str, Any]] = policies or []

    @staticmethod
    def _normalize_metric(metric: Any) -> Optional[str]:
        if metric is None:
            return None
        m = str(metric).strip().lower()
        aliases = {
            "cost": "cost",
            "estimated_cost": "cost",
            "carbon": "carbon",
            "carbon_g": "carbon",
            "cpu": "cpu_percent",
            "cpu_pct": "cpu_percent",
            "cpu_percent": "cpu_percent",
            "mem": "mem_mb",
            "memory": "mem_mb",
            "memory_mb": "mem_mb",
            "mem_mb": "mem_mb",
        }
        return aliases.get(m)

    @staticmethod
    def _normalize_period(period: Any) -> str:
        if period is None:
            return "run"
        p = str(period).strip().lower()
        aliases = {
            "run": "run",
            "sample": "run",
            "instant": "run",
            "none": "run",
            "min": "minute",
            "minute": "minute",
            "minutes": "minute",
            "hr": "hour",
            "hour": "hour",
            "hours": "hour",
            "day": "day",
            "daily": "day",
        }
        return aliases.get(p, "run")

    @staticmethod
    def _scale_for_period(value: float, duration_seconds: float, period: str) -> float:
        if duration_seconds <= 0:
            return value
        if period == "day":
            return value * (86400.0 / float(duration_seconds))
        if period == "hour":
            return value * (3600.0 / float(duration_seconds))
        if period == "minute":
            return value * (60.0 / float(duration_seconds))
        return value

    @staticmethod
    def parse_rule_text(rule: str) -> Optional[Dict[str, Any]]:
        r = rule.strip()
        container: Optional[str] = None

        # Optional target suffix: "... in web-1"
        cm = re.search(r"\bin\s+([a-zA-Z0-9_.-]+)\s*$", r, re.I)
        if cm:
            container = cm.group(1)
            r = r[: cm.start()].strip()

        # cost per day: "Never spend more than $5.00/day"
        m = re.search(r"\$?([0-9]+(?:\.[0-9]+)?)\s*(?:/|per)?\s*(day|hr|hour|min|minute)", r, re.I)
        if m and ("spend" in r.lower() or "cost" in r.lower()):
            try:
                val = float(m.group(1))
            except Exception:
                return None
            out: Dict[str, Any] = {
                "metric": "cost",
                "threshold": val,
                "period": PolicyEngine._normalize_period(m.group(2)),
                "raw": rule,
            }
            if container:
                out["container"] = container
            return out

        # cost without explicit /day (per-run)
        m2 = re.search(r"spend\s+more\s+than\s+\$?([0-9]+(?:\.[0-9]+)?)", r, re.I)
        if m2:
            try:
                val = float(m2.group(1))
            except Exception:
                return None
            out = {"metric": "cost", "threshold": val, "period": "run", "raw": rule}
            if container:
                out["container"] = container
            return out

        # carbon footprint: "Keep carbon footprint under 10g"
        m3 = re.search(
            r"carbon(?:\s+footprint)?\s+under\s+([0-9]+(?:\.[0-9]+)?)\s*g(?:\s*(?:/|per)?\s*(day|hr|hour|min|minute))?",
            r,
            re.I,
        )
        if m3:
            try:
                val = float(m3.group(1))
            except Exception:
                return None
            out = {
                "metric": "carbon",
                "threshold": val,
                "period": PolicyEngine._normalize_period(m3.group(2) or "run"),
                "raw": rule,
            }
            if container:
                out["container"] = container
            return out

        return None

    def add_policy(self, policy: Any) -> None:
        """Add a policy. Accepts either a string (human rule) or a dict.

        If a string is passed we attempt to parse it into a structured policy.
        """
        if isinstance(policy, str):
            parsed = self.parse_rule_text(policy)
            if parsed:
                self.policies.append(parsed)
                return
            # fall back to storing as freeform text
            self.policies.append({"metric": "unknown", "raw": policy})
            return
        if isinstance(policy, dict):
            normalized = dict(policy)
            metric = self._normalize_metric(normalized.get("metric"))
            if metric:
                normalized["metric"] = metric
            normalized["period"] = self._normalize_period(normalized.get("period"))
            if isinstance(normalized.get("container"), str):
                normalized["container"] = normalized["container"].strip()
            self.policies.append(normalized)

    def list_policies(self) -> List[Dict[str, Any]]:
        return self.policies

    def load_from_file(self, path: str) -> None:
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        # accept either list of strings or list of objects
        self.policies = []
        for item in data:
            self.add_policy(item)

    def save_to_file(self, path: str) -> None:
        # Save as list of raw representations when possible
        out: List[Any] = []
        for p in self.policies:
            if isinstance(p, dict) and p.get("raw"):
                out.append(p.get("raw"))
            else:
                out.append(p)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=2)

    def evaluate(
        self,
        cpu_pct: float,
        mem_mb: float,
        duration_seconds: float,
        region: str = "us-east-1",
        host_cpus: Optional[int] = None,
        container_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Evaluate current policies against an observed sample.

        Returns a dict containing calculated metrics and any violations.
        """
        cost = float(calculate_cost(cpu_pct, mem_mb, duration_seconds, host_cpus=host_cpus))
        carbon = float(
            calculate_carbon_footprint(cpu_pct, mem_mb, duration_seconds, region=region, host_cpus=host_cpus)
        )
        duration_seconds = float(max(duration_seconds, 0.0))
        cpu_pct = float(max(cpu_pct, 0.0))
        mem_mb = float(max(mem_mb, 0.0))
        results: Dict[str, Any] = {
            "cpu_percent": cpu_pct,
            "mem_mb": mem_mb,
            "cost": cost,
            "carbon_g": carbon,
            "duration_seconds": duration_seconds,
            "violations": [],
        }

        for p in self.policies:
            metric_input = p.get("metric") if isinstance(p, dict) else None
            metric = self._normalize_metric(metric_input)
            threshold = p.get("threshold") if isinstance(p, dict) else None
            period = self._normalize_period(p.get("period")) if isinstance(p, dict) else "run"
            c_name = p.get("container") if isinstance(p, dict) else None
            raw = p.get("raw") if isinstance(p, dict) else (p if isinstance(p, str) else str(p))

            if c_name:
                if not container_name:
                    continue
                if str(c_name).lower() not in str(container_name).lower():
                    continue

            if threshold is None or metric is None:
                continue

            if metric == "cost":
                observed = cost
                observed = self._scale_for_period(observed, duration_seconds, period)
                if observed > float(threshold):
                    results["violations"].append({
                        "policy": raw,
                        "metric": "cost",
                        "threshold": threshold,
                        "observed": round(observed, 8),
                        "period": period,
                        "recommended_action": "alert",
                    })

            if metric == "carbon":
                observed = carbon
                observed = self._scale_for_period(observed, duration_seconds, period)
                if observed > float(threshold):
                    results["violations"].append({
                        "policy": raw,
                        "metric": "carbon",
                        "threshold": threshold,
                        "observed": round(observed, 4),
                        "period": period,
                        "recommended_action": "alert",
                    })

            if metric == "cpu_percent":
                observed = cpu_pct
                if observed > float(threshold):
                    results["violations"].append({
                        "policy": raw,
                        "metric": "cpu_percent",
                        "threshold": threshold,
                        "observed": round(observed, 4),
                        "period": "run",
                        "recommended_action": "alert",
                    })

            if metric == "mem_mb":
                observed = mem_mb
                if observed > float(threshold):
                    results["violations"].append({
                        "policy": raw,
                        "metric": "mem_mb",
                        "threshold": threshold,
                        "observed": round(observed, 4),
                        "period": "run",
                        "recommended_action": "alert",
                    })

        return results


__all__ = ["PolicyEngine"]
