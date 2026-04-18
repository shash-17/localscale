LocalScale — Local Cloud Cost & Carbon Simulator
===============================================

Quick links:

- Blog post: How I Built a Cloud Cost Simulator on My Laptop — [docs/how-i-built-cloud-cost-simulator.md](docs/how-i-built-cloud-cost-simulator.md)
- Policy engine: `backend/policy.py`
- Load test (Locust): `loadtest/locustfile.py`
- Plotting script: `scripts/plot_loadtest_results.py` (creates `loadtest/loadtest_comparison.png`)

Run the API:

```
uvicorn backend.main:app --reload --port 8000
```

Run the example policy evaluation:

```
python backend/policy_example.py
```

Run a Locust load test (recommended for the demo):

```
pip install locust
locust -f loadtest/locustfile.py --host http://localhost:8000
```

Create the demo plot:

```
pip install matplotlib numpy
python scripts/plot_loadtest_results.py
```

