"""Simple Locust load test for LocalScale backend.

Usage:
1. Install: `pip install locust`
2. Start the API: `uvicorn backend.main:app --reload --port 8000`
3. Run Locust: `locust -f loadtest/locustfile.py --host http://localhost:8000`
4. Open http://localhost:8089 in your browser to start the test.
"""
from locust import HttpUser, task, between


class LocalScaleUser(HttpUser):
    wait_time = between(0.5, 1.5)

    @task(5)
    def health(self):
        self.client.get("/")

    @task(2)
    def metrics(self):
        self.client.get("/metrics/history")

    @task(1)
    def evaluate_policy(self):
        payload = {"cpu_pct": 50.0, "mem_mb": 512.0, "duration_seconds": 60.0}
        self.client.post("/policies/evaluate", json=payload)
