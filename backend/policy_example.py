"""Small CLI example showing PolicyEngine usage.

Run: python -m backend.policy_example (from repo root) or python backend/policy_example.py
"""
import json
import os

try:
    from .policy import PolicyEngine
    from .simulator import calculate_cost, calculate_carbon_footprint
except Exception:
    try:
        from policy import PolicyEngine
        from simulator import calculate_cost, calculate_carbon_footprint
    except Exception:
        PolicyEngine = None


def main():
    path = os.path.join(os.path.dirname(__file__), "policies.json")
    engine = PolicyEngine() if PolicyEngine is not None else None
    if engine is None:
        print("PolicyEngine not available in this environment")
        return
    if os.path.exists(path):
        engine.load_from_file(path)
    else:
        engine.add_policy("Never spend more than $5.00/day")
        engine.add_policy("Keep carbon footprint under 10g")

    sample = {
        "cpu_pct": 50.0,
        "mem_mb": 512.0,
        "duration_seconds": 3600.0,
        "region": "eu-west-1",
    }

    print("Loaded policies:")
    print(json.dumps(engine.list_policies(), indent=2))
    print("\nEvaluating sample usage:")
    result = engine.evaluate(sample["cpu_pct"], sample["mem_mb"], sample["duration_seconds"], sample["region"])
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
