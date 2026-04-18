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
    def parse_rule_text(rule: str) -> Optional[Dict[str, Any]]:
        r = rule.strip()
        # cost per day: "Never spend more than $5.00/day"
        m = re.search(r"\$?([0-9]+(?:\.[0-9]+)?)\s*(?:/|per)?\s*(day)", r, re.I)
        if m and "spend" in r.lower():
            try:
                val = float(m.group(1))
            except Exception:
                return None
            return {"metric": "cost", "threshold": val, "period": "day", "raw": rule}

        # cost without explicit /day (per-run)
        m2 = re.search(r"spend\s+more\s+than\s+\$?([0-9]+(?:\.[0-9]+)?)", r, re.I)
        if m2:
            try:
                val = float(m2.group(1))
            except Exception:
                return None
            return {"metric": "cost", "threshold": val, "period": "run", "raw": rule}

        # carbon footprint: "Keep carbon footprint under 10g"
        m3 = re.search(r"carbon\s+footprint\s+under\s+([0-9]+(?:\.[0-9]+)?)\s*g", r, re.I)
        if m3:
            try:
                val = float(m3.group(1))
            except Exception:
                return None
            return {"metric": "carbon", "threshold": val, "period": "run", "raw": rule}

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
            self.policies.append(policy)

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
        results: Dict[str, Any] = {
            "cost": cost,
            "carbon_g": carbon,
            "duration_seconds": float(max(duration_seconds, 0.0)),
            "violations": [],
        }

        for p in self.policies:
            metric = p.get("metric") if isinstance(p, dict) else None
            threshold = p.get("threshold") if isinstance(p, dict) else None
            period = p.get("period") if isinstance(p, dict) else None
            c_name = p.get("container") if isinstance(p, dict) else None
            raw = p.get("raw") if isinstance(p, dict) else (p if isinstance(p, str) else str(p))
            
            if c_name and container_name and c_name not in container_name:
                continue


            if metric == "cost" and threshold is not None:
                observed = cost
                if period == "day" and duration_seconds > 0:
                    observed = cost * (86400.0 / float(duration_seconds))
                if observed > float(threshold):
                    results["violations"].append({
                        "policy": raw,
                        "metric": "cost",
                        "threshold": threshold,
                        "observed": round(observed, 8),
                        "period": period,
                        "recommended_action": "alert",
                    })

            if metric == "carbon" and threshold is not None:
                observed = carbon
                if period == "day" and duration_seconds > 0:
                    observed = carbon * (86400.0 / float(duration_seconds))
                if observed > float(threshold):
                    results["violations"].append({
                        "policy": raw,
                        "metric": "carbon",
                        "threshold": threshold,
                        "observed": round(observed, 4),
                        "period": period,
                        "recommended_action": "alert",
                    })

        return results


__all__ = ["PolicyEngine"]
