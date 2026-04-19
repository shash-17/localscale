from backend.policy import PolicyEngine


def test_structured_cpu_policy_violation_is_enforced():
    engine = PolicyEngine([
        {"metric": "cpu_percent", "threshold": 80, "period": "hr"},
    ])

    result = engine.evaluate(cpu_pct=95, mem_mb=128, duration_seconds=60)

    assert any(v["metric"] == "cpu_percent" for v in result["violations"])


def test_alias_metrics_are_normalized_and_evaluated():
    engine = PolicyEngine([
        {"metric": "carbon_g", "threshold": 0.01, "period": "run"},
    ])

    result = engine.evaluate(cpu_pct=95, mem_mb=256, duration_seconds=60)

    assert any(v["metric"] == "carbon" for v in result["violations"])


def test_container_scoped_policy_only_applies_to_matching_container():
    engine = PolicyEngine([
        {"metric": "cpu_percent", "threshold": 80, "period": "run", "container": "web"},
    ])

    matching = engine.evaluate(cpu_pct=95, mem_mb=128, duration_seconds=60, container_name="web-1")
    non_matching = engine.evaluate(cpu_pct=95, mem_mb=128, duration_seconds=60, container_name="api-1")
    missing_context = engine.evaluate(cpu_pct=95, mem_mb=128, duration_seconds=60)

    assert len(matching["violations"]) == 1
    assert non_matching["violations"] == []
    assert missing_context["violations"] == []


def test_parse_rule_text_extracts_period_and_container_scope():
    parsed = PolicyEngine.parse_rule_text("Never spend more than $5/day in web-1")

    assert parsed is not None
    assert parsed["metric"] == "cost"
    assert parsed["period"] == "day"
    assert parsed["container"] == "web-1"
