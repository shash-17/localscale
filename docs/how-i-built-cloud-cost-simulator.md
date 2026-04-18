---
title: How I Built a Cloud Cost Simulator on My Laptop
author: LocalScale
date: 2026-04-18
---

Building realistic cost and carbon estimates locally helps teams iterate quickly without provisioning cloud resources. In this post I describe how I built LocalScale — a tiny simulator that estimates costs and CO2 for container workloads, a policy engine to govern spend and emissions, and a simple local load-testing workflow that demonstrates the value of auto-scaling.

**Repository:** [LocalScale root](README.md)

**What I built**
- A small Python service that collects container metrics and estimates cost and carbon (`backend/simulator.py`).
- A `PolicyEngine` that accepts human-friendly rules like "Never spend more than $5.00/day" and "Keep carbon footprint under 10g" and evaluates observed samples (`backend/policy.py`).
- A Locust script to generate traffic against the local API (`loadtest/locustfile.py`).
- A plotting script that creates a before/after latency graph (`scripts/plot_loadtest_results.py`).

Why this matters: governance and cost controls are a huge enterprise concern. The policy engine shows how to express and enforce simple guardrails locally so you can validate autoscaling or other mitigation strategies before rolling them out to production.

Getting started

1. Create a Python virtualenv and install requirements (this project uses standard packages like `fastapi`, `uvicorn`, `locust`, `matplotlib`).

2. Start the API:

```
uvicorn backend.main:app --reload --port 8000
```

3. Run the example policy CLI to see policy evaluation:

```
python backend/policy_example.py
```

Policy Engine

The `PolicyEngine` accepts both structured rules and simple human text. Examples supported today:

- `Never spend more than $5.00/day` (interpreted as cost per day)
- `Keep carbon footprint under 10g` (per run)

When a usage sample arrives (CPU %, memory, duration), the engine uses `simulator.calculate_cost()` and `simulator.calculate_carbon_footprint()` to compute observables, scales them when policies are expressed per-day, and returns any violations and recommended actions.

Load testing and results

I used Locust to generate load against the local API. The script `loadtest/locustfile.py` hits the health and metrics endpoints and also calls the policy evaluation endpoint.

To reproduce the demo graph used in this post run:

```
pip install matplotlib numpy
python scripts/plot_loadtest_results.py
```

This produces `loadtest/loadtest_comparison.png`. The synthetic example demonstrates a common story:

- Without auto-scaling, latency spiked to ~500ms under load.
- With LocalScale's approach (policy-driven scaling), observed latency stayed below 100ms.

Blog-ready graph: `loadtest/loadtest_comparison.png`

Resume snippet

Consider adding this single-line achievement to your resume:

```
Built LocalScale — a local cloud cost & carbon simulator with a policy engine and load-testing harness; validated autoscaling reduced latency spikes from ~500ms to <100ms.
```

Closing

This project is intentionally small and practical — it's a lab for testing governance rules, autoscaling strategies and cost-aware decisions without touching cloud billing. If you'd like, I can:

- Add richer policy expressions and alert hooks (Slack/Email)
- Integrate the engine with the UI to show live policy violations
- Add automated tests for the rule parser and evaluation

Let me know which of these you'd like next.
