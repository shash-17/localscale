"""Full End-to-End Demo using real Docker containers and LocalScale API.

Requires:
- Docker running locally
- LocalScale API (uvicorn backend.main:app)
"""
import requests
import time
import sys

BASE_URL = "http://localhost:8000"

def wait_for_api():
    print("Waiting for LocalScale API to be ready...")
    for _ in range(10):
        try:
            resp = requests.get(f"{BASE_URL}/")
            if resp.status_code == 200:
                print("API is ready.")
                return True
        except:
            pass
        time.sleep(1)
    print("Failed to connect to API.")
    return False

def check_docker():
    resp = list_containers()
    if resp is None:
        return False
    return True

def list_containers():
    try:
        resp = requests.get(f"{BASE_URL}/containers")
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 503:
            print("Docker daemon not available (503 response). Please start Docker!")
            return None
        return []
    except requests.exceptions.RequestException as e:
        print(f"Error calling API: {e}")
        return None

def deploy(image="nginx:alpine", name="demo-web", replicas=1):
    print(f"Deploying {replicas} replica(s) of '{image}' named '{name}'...")
    resp = requests.post(f"{BASE_URL}/deploy", json={
        "image": image,
        "name": name,
        "replicas": replicas,
        "ports": {"80/tcp": None}
    })
    return resp.json()

def scale(name="demo-web", replicas=0):
    print(f"Scaling '{name}' to {replicas} replica(s)...")
    resp = requests.post(f"{BASE_URL}/scale", json={
        "name": name,
        "replicas": replicas
    })
    return resp.json()

def get_stats(container_id):
    resp = requests.get(f"{BASE_URL}/containers/{container_id}/stats")
    return resp.json()

def evaluate_policy(cpu_pct, mem_mb, duration_seconds=60.0):
    print(f"\nEvaluating policy with observable metrics (CPU: {cpu_pct}%, Mem: {mem_mb} MiB, Dur: {duration_seconds}s)")
    resp = requests.post(f"{BASE_URL}/policies/evaluate", json={
        "cpu_pct": float(cpu_pct),
        "mem_mb": float(mem_mb),
        "duration_seconds": float(duration_seconds)
    })
    return resp.json()

def fetch_metrics_history():
    resp = requests.get(f"{BASE_URL}/metrics/history?limit=5")
    return resp.json()

def run_demo():
    if not wait_for_api():
        sys.exit(1)
    
    if not check_docker():
        sys.exit(1)

    # 1. Clean up any existing demo
    scale("demo-web", 0)

    # 2. Deploy real container
    print("\n--- STEP 1: Deploy a Real Container ---")
    deploy("nginx:alpine", "demo-web", 1)
    time.sleep(3) # allow Docker to pull and start
    
    containers = list_containers()
    demo_c = [c for c in containers if "demo-web" in c["name"]]
    if not demo_c:
        print("Container failed to start.")
        sys.exit(1)
    
    cid = demo_c[0]["id"]
    print(f"Container '{demo_c[0]['name']}' is running with ID: {cid[:12]}")

    # 3. Get Real-Time Stats
    print("\n--- STEP 2: Live Docker Stats ---")
    print("Collecting live docker stats (takes a couple seconds)...")
    for _ in range(2):
        stats = get_stats(cid)
        print(f"Stats -> CPU: {stats.get('cpu_percent')}%, Memory: {stats.get('memory')}")
        time.sleep(2)

    # 4. Wait for Background Job to collect metrics (10 seconds)
    print("\n--- STEP 3: Await Metrics Collector ---")
    print("Waiting 15 seconds for the background scheduler to record real metrics...")
    time.sleep(15)

    # 5. Fetch actual history from DB
    history = fetch_metrics_history()
    print("Recent records from metrics_history DB:")
    for h in history:
        print(f"  Container: {h['container_name']:12} | CPU: {h['cpu_pct']:>5.2f}% | Mem: {h['mem_mb']:>6.2f} MiB | Cost: ${h['estimated_cost']:.6f} | Carbon: {h['carbon_g']:.4f}g")

    # 6. Evaluate Policy using real metrics
    print("\n--- STEP 4: Evaluate Policy Using Real Data ---")
    if history:
        latest = history[0]
        cpu = latest['cpu_pct']
        mem = latest['mem_mb']
        # Let's project these real stats over a full month
        month_seconds = 30 * 24 * 3600
        print(f"Projecting this real usage ({cpu}% CPU, {mem} MiB) simulating 30 days (applies to /day rules):")
        evaluation = evaluate_policy(cpu, mem, month_seconds)
        
        print("\nPolicy Engine Result:")
        import json
        print(json.dumps(evaluation, indent=2))
        
        if evaluation.get("violations"):
            print("\nWARNING: Policies were violated based on real usage scaling!")
        else:
            print("\nSUCCESS: Real usage is within policy limits.")
    else:
        print("No metrics history found (maybe the scheduler missed it).")

    # 7. Cleanup
    print("\n--- STEP 5: Cleanup ---")
    scale("demo-web", 0)
    print("Demo complete! All deployed containers scaled to 0.")

if __name__ == "__main__":
    run_demo()
