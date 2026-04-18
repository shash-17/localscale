from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import sqlite3
import logging
import asyncio
import datetime

# Try relative import first (when run as package), fall back to top-level import
try:
    from .docker_manager import ContainerManager
except Exception:
    try:
        from docker_manager import ContainerManager
    except Exception:
        ContainerManager = None

# Import simulator helpers (with fallbacks)
try:
    from .simulator import calculate_cost, calculate_carbon_footprint, docker_cpu_percent_to_vcpu
except Exception:
    try:
        from simulator import calculate_cost, calculate_carbon_footprint, docker_cpu_percent_to_vcpu
    except Exception:
        def calculate_cost(*args, **kwargs):
            return 0.0
        def calculate_carbon_footprint(*args, **kwargs):
            return 0.0
        def docker_cpu_percent_to_vcpu(cpu, host_cpus=None, clamp=True):
            try:
                return float(cpu) / 100.0
            except Exception:
                return 0.0

# APScheduler (async) -- optional fallback if not installed
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
except Exception:
    AsyncIOScheduler = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("localscale.backend")

app = FastAPI(title="LocalScale API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ContainerInfo(BaseModel):
    id: str
    name: str
    status: str
    image: str


class ContainerStats(BaseModel):
    cpu_percent: float
    memory: str
    network_io: str


class DeployRequest(BaseModel):
    image: str
    name: str
    replicas: int = 1
    ports: Optional[Dict[str, Any]] = None


class ScaleRequest(BaseModel):
    name: str
    replicas: int


class MetricEntry(BaseModel):
    id: Optional[int]
    container_name: str
    cpu_pct: float
    mem_mb: float
    timestamp: str
    estimated_cost: float
    carbon_g: float


class PolicyCreate(BaseModel):
    policy: str


class PolicyEvaluateRequest(BaseModel):
    cpu_pct: float
    mem_mb: float
    duration_seconds: float
    region: str = "us-east-1"
    host_cpus: Optional[int] = None


# Initialize ContainerManager (it handles Docker initialization/errors internally)
manager = None
if ContainerManager is not None:
    try:
        manager = ContainerManager()
    except Exception as e:
        logger.exception("ContainerManager init failed: %s", e)
        manager = None


# Metrics DB path and scheduler placeholder
DB_PATH = os.path.join(os.path.dirname(__file__), "metrics.db")
scheduler = None

# Policy engine (optional)
try:
    from .policy import PolicyEngine
except Exception:
    try:
        from policy import PolicyEngine
    except Exception:
        PolicyEngine = None

POLICIES_PATH = os.path.join(os.path.dirname(__file__), "policies.json")
policy_engine = None
if PolicyEngine is not None:
    try:
        policy_engine = PolicyEngine()
        if os.path.exists(POLICIES_PATH):
            policy_engine.load_from_file(POLICIES_PATH)
    except Exception:
        logger.exception("Failed to initialize PolicyEngine")
        policy_engine = PolicyEngine()


def docker_required():
    global manager
    # If manager isn't initialized or has no client, try to initialize it (lazy init)
    if not manager or not getattr(manager, "client", None):
        if ContainerManager is not None:
            try:
                manager = ContainerManager()
            except Exception:
                manager = None
    if not manager or not getattr(manager, "client", None):
        raise HTTPException(status_code=503, detail="Docker daemon not available")


@app.get("/")
def health():
    return {"status": "ok"}


@app.get("/containers", response_model=List[ContainerInfo])
def list_containers():
    docker_required()
    containers = manager.list_containers()
    converted = []
    for c in containers:
        converted.append({
            "id": c.get("ID") or c.get("id") or "",
            "name": c.get("Name") or c.get("name") or "",
            "status": c.get("Status") or c.get("status") or "",
            "image": c.get("Image") or c.get("image") or "",
        })
    return converted


@app.get("/containers/{container_id}/stats", response_model=ContainerStats)
def get_stats(container_id: str):
    docker_required()
    stats = manager.get_container_stats(container_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Container not found or stats unavailable")
    cpu = stats.get("CPU %") or stats.get("cpu_percent") or 0.0
    try:
        cpu = float(cpu)
    except Exception:
        cpu = 0.0
    memory = stats.get("Memory Usage") or stats.get("memory") or ""
    network_io = stats.get("Network I/O") or stats.get("network_io") or ""
    return {"cpu_percent": cpu, "memory": memory, "network_io": network_io}


@app.post("/deploy")
def deploy(req: DeployRequest):
    docker_required()
    # Use ContainerManager.scale_container to create the initial replicas (name-1..name-N)
    results = manager.scale_container(req.name, req.replicas, image=req.image, ports=req.ports)
    return {"results": results}


@app.post("/scale")
def scale(req: ScaleRequest):
    docker_required()
    results = manager.scale_container(req.name, req.replicas)
    return {"results": results}


@app.get("/metrics/history", response_model=List[MetricEntry])
def metrics_history(limit: int = 100):
    if not os.path.exists(DB_PATH):
        return []
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            "SELECT id, container_name, cpu_pct, mem_mb, timestamp, estimated_cost, carbon_g FROM metrics_history ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        )
        rows = cur.fetchall()
        out = []
        for r in rows:
            out.append({
                "id": int(r["id"]),
                "container_name": r["container_name"],
                "cpu_pct": float(r["cpu_pct"]),
                "mem_mb": float(r["mem_mb"]),
                "timestamp": r["timestamp"],
                "estimated_cost": float(r["estimated_cost"]),
                "carbon_g": float(r["carbon_g"]),
            })
        return out
    except sqlite3.OperationalError:
        # table missing or schema mismatch
        return []
    except sqlite3.Error as e:
        logger.exception("Metrics DB error: %s", e)
        raise HTTPException(status_code=500, detail="Metrics DB error")
    finally:
        if conn:
            conn.close()


@app.get("/policies")
def list_policies():
    if policy_engine is None:
        return []
    return policy_engine.list_policies()


@app.post("/policies")
def add_policy(pc: PolicyCreate):
    if policy_engine is None:
        raise HTTPException(status_code=500, detail="Policy engine unavailable")
    policy_engine.add_policy(pc.policy)
    try:
        policy_engine.save_to_file(POLICIES_PATH)
    except Exception:
        logger.exception("Failed to save policies")
    return {"status": "ok", "policies": policy_engine.list_policies()}


@app.post("/policies/evaluate")
def evaluate_policy(req: PolicyEvaluateRequest):
    if policy_engine is None:
        raise HTTPException(status_code=500, detail="Policy engine unavailable")
    result = policy_engine.evaluate(req.cpu_pct, req.mem_mb, req.duration_seconds, req.region, req.host_cpus)
    return result


def init_db():
    """Create metrics_history table if missing."""
    try:
        conn = sqlite3.connect(DB_PATH)
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
    except sqlite3.Error as e:
        logger.exception("Failed to initialize metrics DB: %s", e)
    finally:
        try:
            conn.close()
        except Exception:
            pass


async def collect_metrics():
    """Job that collects stats for all running containers, estimates cost/carbon, and writes to SQLite."""
    global manager
    # Lazy re-init manager if Docker became available after startup
    if not manager or not getattr(manager, "client", None):
        if ContainerManager is not None:
            try:
                manager = ContainerManager()
            except Exception:
                manager = None
    if not manager or not getattr(manager, "client", None):
        logger.debug("Docker not available; skipping metrics collection")
        return
    try:
        containers = await asyncio.to_thread(manager.list_containers)
        if not containers:
            return
        now = datetime.datetime.utcnow().isoformat() + "Z"
        duration = 10.0
        for c in containers:
            name = c.get("Name") or c.get("name") or c.get("ID") or ""
            cid = c.get("ID") or c.get("id")
            if not cid:
                continue
            stats = await asyncio.to_thread(manager.get_container_stats, cid)
            cpu = 0.0
            mem_mb = 0.0
            if stats:
                # CPU
                try:
                    cpu = float(stats.get("CPU %") or stats.get("cpu_percent") or 0.0)
                except Exception:
                    cpu = 0.0
                # Memory parsing from string like '123.45 MiB / 2048.00 MiB (6.02%)'
                mem_str = stats.get("Memory Usage") or stats.get("memory") or ""
                try:
                    mem_mb = float(mem_str.split(" MiB")[0])
                except Exception:
                    import re

                    m = re.search(r"([0-9]+\.?[0-9]*)\s*MiB", mem_str)
                    if m:
                        mem_mb = float(m.group(1))
                    else:
                        mem_mb = 0.0
            estimated_cost = calculate_cost(cpu, mem_mb, duration)
            carbon_g = calculate_carbon_footprint(cpu, mem_mb, duration)

            def _write():
                try:
                    conn = sqlite3.connect(DB_PATH)
                    cur = conn.cursor()
                    cur.execute(
                        "INSERT INTO metrics_history (container_name, cpu_pct, mem_mb, timestamp, estimated_cost, carbon_g) VALUES (?, ?, ?, ?, ?, ?)",
                        (name, cpu, mem_mb, now, estimated_cost, carbon_g),
                    )
                    conn.commit()
                except sqlite3.Error:
                    logger.exception("Failed writing metrics to DB")
                finally:
                    try:
                        conn.close()
                    except Exception:
                        pass

            await asyncio.to_thread(_write)
    except Exception:
        logger.exception("Error in metrics collection job")


@app.on_event("startup")
async def on_startup():
    # Ensure DB exists
    init_db()
    # Start scheduler
    global scheduler
    if AsyncIOScheduler is not None:
        try:
            scheduler = AsyncIOScheduler()
            scheduler.add_job(collect_metrics, "interval", seconds=10, id="collect_metrics", next_run_time=datetime.datetime.utcnow())
            scheduler.start()
            logger.info("Metrics scheduler started")
        except Exception:
            logger.exception("Failed to start metrics scheduler")
    else:
        logger.warning("APScheduler not installed; metrics collection disabled")


@app.on_event("shutdown")
async def on_shutdown():
    global scheduler
    if scheduler is not None:
        try:
            scheduler.shutdown(wait=False)
            logger.info("Metrics scheduler shut down")
        except Exception:
            logger.exception("Error shutting down scheduler")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
