from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get('/')

    assert response.status_code == 200
    assert response.json().get('status') == 'ok'


def test_policy_evaluate_endpoint_supports_container_scope():
    response = client.post(
        '/policies/evaluate',
        json={
            'cpu_pct': 95,
            'mem_mb': 256,
            'duration_seconds': 60,
            'container_name': 'web-1',
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert 'violations' in payload
    assert 'cost' in payload
    assert 'carbon_g' in payload


def test_policy_violations_endpoint_returns_list():
    response = client.get('/policies/violations', params={'limit': 5})

    assert response.status_code == 200
    assert isinstance(response.json(), list)
