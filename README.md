# LocalScale

**A CSP-Agnostic Local Container Orchestrator with Predictive Auto-Scaling and Simulated Cloud Economics**

---

## Overview

LocalScale is a lightweight, local-first container orchestration engine that simulates Cloud Service Provider (CSP) behaviors on a single machine. It integrates three core components:

1. **Docker-based Orchestration** — Manage container lifecycles (deploy, scale, start/stop, logs) from an intuitive dashboard.
2. **Predictive Auto-Scaling** — A linear-regression trend analysis engine that proactively adjusts replica counts *before* load spikes hit.
3. **Cloud Economics Simulator** — Maps local CPU/memory consumption to real-world AWS/GCP/Azure pricing and regional carbon intensity data.

Built with **Python (FastAPI)**, **React + TypeScript**, and **SQLite**, LocalScale operates entirely offline — no CSP accounts required.

---

## Features

| Module | Description |
|--------|-------------|
| 🐳 Container Manager | Deploy, scale, start/stop, remove containers via Docker SDK |
| 📊 Live Metrics | Real-time CPU, memory, network I/O monitoring with Recharts |
| ⚡ Predictive Auto-Scaler | Linear regression slope detection with configurable thresholds |
| 💲 Cost Economics | AWS t3/GCP e2/Azure B2s rate cards with session cost tracking |
| 🌱 Carbon Footprint | Energy × grid-intensity model (per-region gCO₂/kWh) |
| 🛡️ Governance Policies | Structured rule builder + natural language policy parser |
| 📜 Container Logs | Real-time log streaming with auto-tail toggle |

---

## Architecture

```
┌──────────────┐    HTTP/REST    ┌──────────────────┐    Docker SDK    ┌─────────┐
│  React SPA   │ ◄─────────────► │  FastAPI Backend  │ ◄──────────────► │ Docker  │
│  (Vite/TS)   │    :5173→:8000  │  + APScheduler    │                  │ Engine  │
└──────────────┘                 │  + AutoScaler     │                  └─────────┘
                                 │  + PolicyEngine   │
                                 └────────┬─────────┘
                                          │ SQLite
                                 ┌────────▼─────────┐
                                 │   metrics.db      │
                                 │  - metrics_history│
                                 │  - scaling_events │
                                 └──────────────────┘
```

---

## Quick Start

### Prerequisites

- Docker Desktop (running)
- Python 3.10+
- Node.js 18+

### Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the API server
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to access the dashboard.

---

## Predictive Auto-Scaling

The scaling engine runs on a 10-second interval via APScheduler:

1. Retrieves the last 5 minutes of CPU usage from SQLite
2. Applies a moving-average filter to smooth Docker stats noise
3. Calculates the rate of change (slope) using linear regression
4. **Slope ≥ 5.0** → `SCALE_UP` (adds 1 replica, up to max)
5. **Slope ≤ -2.0** AND **CPU < 20%** → `SCALE_DOWN` (removes 1 replica, down to min)
6. Enforces a configurable cooldown period between actions

All parameters are tunable from the dashboard's Auto-Scaler panel.

---

## Economics Simulation

Cost is calculated as:

```
Cost = (vCPU_Hours × Rate_vCPU) + (Memory_GB_Hours × Rate_RAM)
```

Carbon is estimated as:

```
CO₂(g) = Energy(kWh) × Grid_Intensity(gCO₂/kWh)
Energy  = vCPU_Hours × 10W/vCPU / 1000 + GB_RAM_Hours × 0.5W/GB / 1000
```

Rates are sourced from public AWS t3.medium, GCP e2-medium, and Azure B2s pricing.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/containers` | List active containers |
| POST | `/deploy` | Deploy new container(s) |
| POST | `/scale` | Scale a service up/down |
| GET | `/containers/{id}/stats` | Get container stats |
| GET | `/containers/{id}/logs` | Get container logs |
| POST | `/containers/{id}/start` | Start a container |
| POST | `/containers/{id}/stop` | Stop a container |
| DELETE | `/containers/{id}` | Remove a container |
| GET | `/metrics/history` | Time-series metrics data |
| GET | `/policies` | List governance policies |
| POST | `/policies` | Add a policy |
| POST | `/policies/evaluate` | Evaluate policies against metrics |
| GET | `/scaling/events` | Get auto-scaler event log |
| GET | `/scaling/config` | Get auto-scaler configuration |
| POST | `/scaling/config` | Update auto-scaler settings |
| GET | `/scaling/status` | Get auto-scaler status + recent events |

---

## Tech Stack

- **Backend:** Python 3.10, FastAPI, Uvicorn, Docker-py, APScheduler, NumPy, SQLite3
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Axios
- **Infrastructure:** Docker Desktop, Git

---

## Project Structure

```
localscale/
├── backend/
│   ├── main.py              # FastAPI app + scheduler
│   ├── docker_manager.py    # Docker SDK wrapper
│   ├── autoscaler.py        # Predictive scaling engine
│   ├── simulator.py         # Cost + carbon calculator
│   ├── policy.py            # Governance policy engine
│   └── metrics.db           # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Landing page + Dashboard
│   │   └── services/        # API client
│   └── package.json
├── loadtest/                # Locust load test configs
├── scripts/                 # Utility scripts
└── requirements.txt
```

---

## Load Testing

```bash
pip install locust
locust -f loadtest/locustfile.py --host http://localhost:8000
```

---

## License

MIT
