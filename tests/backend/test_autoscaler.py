import os
import sqlite3
from datetime import datetime, timedelta, timezone

from backend.autoscaler import AutoScalerConfig, PredictiveScaler, ScalingDecision


def _make_metrics_db(path: str):
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS metrics_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            container_name TEXT,
            cpu_pct REAL,
            mem_mb REAL,
            timestamp TEXT,
            estimated_cost REAL,
            carbon_g REAL
        )
        """
    )
    conn.commit()
    conn.close()


def _insert_series(path: str, container_name: str, cpu_values: list[float]):
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    now = datetime.now(timezone.utc)
    rows = []
    for idx, cpu in enumerate(cpu_values):
        ts = (now - timedelta(minutes=(len(cpu_values) - 1 - idx))).isoformat().replace("+00:00", "Z")
        rows.append((container_name, cpu, 256.0, ts, 0.0, 0.0))
    cur.executemany(
        "INSERT INTO metrics_history (container_name, cpu_pct, mem_mb, timestamp, estimated_cost, carbon_g) VALUES (?, ?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    conn.close()


def test_predict_scaling_uses_base_name_history(tmp_path):
    db_path = str(tmp_path / "metrics.db")
    _make_metrics_db(db_path)
    _insert_series(db_path, "web-1", [20, 40, 60, 80, 100])

    config = AutoScalerConfig(lookback_minutes=10, min_data_points=5, slope_up_threshold=1.0)
    scaler = PredictiveScaler(db_path, config)

    base_decision = scaler.predict_scaling("web", current_replicas=1)
    replica_decision = scaler.predict_scaling("web-1", current_replicas=1)

    assert "Insufficient data" not in base_decision.reason
    assert base_decision.action == replica_decision.action
    assert base_decision.target_replicas == replica_decision.target_replicas


def test_get_events_filters_by_base_name(tmp_path):
    db_path = str(tmp_path / "metrics.db")
    _make_metrics_db(db_path)

    scaler = PredictiveScaler(db_path)
    scaler._init_events_table()

    web_decision = ScalingDecision(
        action="SCALE_UP",
        container_name="web",
        slope=6.0,
        current_cpu=88.0,
        current_replicas=1,
        target_replicas=2,
        reason="test",
    )
    api_decision = ScalingDecision(
        action="SCALE_DOWN",
        container_name="api",
        slope=-3.0,
        current_cpu=10.0,
        current_replicas=2,
        target_replicas=1,
        reason="test",
    )

    scaler.record_scale_action("web", web_decision)
    scaler.record_scale_action("api", api_decision)

    web_events = scaler.get_events(limit=10, container_name="web-1")
    api_events = scaler.get_events(limit=10, container_name="api-1")

    assert any(e["container_name"] == "web" for e in web_events)
    assert any(e["container_name"] == "api" for e in api_events)
