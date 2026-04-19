# LocalScale Detailed Context File for Report Generation

This document is a high-detail project context source intended for downstream report generation.
Use it as factual grounding for a formal report.

## Abstract
LocalScale is a local-first orchestration and governance platform that emulates core cloud operations on a single machine. The system integrates Docker-based workload management, predictive auto-scaling, cost and carbon simulation, and policy-governed observability into a single application stack. Its objective is to provide a practical testbed where deployment, scaling, governance, and sustainability trade-offs can be explored without requiring a live cloud account.

The platform is implemented with a FastAPI backend, a React and TypeScript frontend, Docker Engine for container execution, and SQLite for local persistence. The backend continuously samples workload metrics, computes estimated economics and carbon impact, evaluates governance rules, and executes scaling decisions when trend criteria are met. The frontend provides real-time operational views for containers, metrics, economics, policies, violations, logs, and auto-scaling behavior.

LocalScale has been validated through automated backend and frontend tests, lint and build checks, runtime end-to-end scripts, and short synthetic load validation. The resulting system is suitable for demonstrations, experimentation, and academic reporting on cloud management concepts in a local environment.

## Introduction
### Problem Context
Cloud-native systems are increasingly judged on a combination of performance, reliability, cost efficiency, and environmental footprint. Evaluating control strategies for these dimensions in production is expensive and risky. Teams need a low-friction environment where they can test governance and scaling logic rapidly.

### Project Motivation
LocalScale was created to address the following gap:

1. There is limited access to a practical local platform that combines orchestration, economics simulation, and policy governance.
2. Typical local demos focus on deployment only, while real operations require visibility into cost, carbon, and policy compliance.
3. Many auto-scaling examples are reactive threshold systems; trend-aware behavior is often omitted.

### Project Objectives
LocalScale pursues six core objectives:

1. Deploy and control containerized services locally through a unified API and dashboard.
2. Collect and persist live container metrics for historical analysis.
3. Estimate usage-linked cost and carbon impact using transparent formulas.
4. Evaluate governance policies from structured rules and natural-language-like inputs.
5. Apply predictive, trend-based scaling with configurable parameters.
6. Provide an integrated UI that makes all these behaviors observable in near real time.

### Scope and Boundaries
In scope:

1. Local execution only.
2. Docker-backed container lifecycle and stats.
3. Rule-based policy evaluation and violation logging.
4. Predictive scaling with linear trend analysis.
5. Simulated economics and carbon estimation.

Out of scope:

1. Multi-node orchestration and distributed scheduling.
2. Real cloud billing integration.
3. Advanced machine-learning forecasting.
4. Full enterprise security and identity controls.

## System Design and Methodology
### Architecture Overview
The architecture follows a frontend-backend-control-loop model:

1. Frontend: React and TypeScript dashboard for control and visualization.
2. Backend: FastAPI service exposing APIs for deployment, scaling, metrics, policies, and logs.
3. Runtime substrate: Docker Engine via Docker SDK.
4. Persistence: SQLite tables for metrics history, scaling events, and policy violations.
5. Scheduler: APScheduler interval job for periodic metrics collection and policy checks.

### Control and Data Flow
Primary runtime loop:

1. Scheduler runs every 10 seconds.
2. Running containers are listed.
3. Per-container stats are sampled.
4. CPU and memory are transformed to estimated cost and carbon.
5. Samples are inserted into metrics_history.
6. Policy engine evaluates the sample.
7. Violations are inserted into policy_violations and surfaced by API.
8. Predictive scaler evaluates service groups and may call scale actions.
9. Scaling decisions are inserted into scaling_events.

### Metrics and Sampling Methodology
Sampled fields include:

1. cpu_pct
2. mem_mb
3. timestamp
4. estimated_cost
5. carbon_g

CPU percentage is derived from Docker statistics using deltas:

$$
\text{CPU\%} = \frac{\Delta\text{container_cpu}}{\Delta\text{system_cpu}} \times \text{online_cpus} \times 100
$$

Memory is represented as MiB values parsed from Docker memory usage output.

### Cost Methodology
Cost estimation in simulator module:

$$
\text{Cost} = (\text{vCPU Hours} \times \text{Rate}_{\text{vCPU}}) + (\text{RAM GB Hours} \times \text{Rate}_{\text{RAM}})
$$

Where:

1. Docker CPU percent is converted to abstract vCPU units as cpu_percent / 100.
2. RAM MB is converted to GB.
3. Duration in seconds is converted to hours.

Rate cards include default model plus CSP-style presets (for example AWS t3, GCP e2, Azure B2s approximations).

### Carbon Methodology
Carbon estimation uses power assumptions and region intensity:

$$
\text{CO2 (g)} = \text{Energy (kWh)} \times \text{Grid Intensity (gCO2/kWh)}
$$

With:

1. W_PER_VCPU = 10.0
2. W_PER_GB_RAM = 0.5
3. Region intensity map with fallback global value.

### Predictive Auto-Scaling Methodology
Scaling logic (PredictiveScaler):

1. Query last lookback window from metrics_history.
2. Aggregate per-service history using base-name grouping (for example web and web-1 are aligned).
3. Smooth CPU series with moving average.
4. Fit linear trend and compute slope.
5. Evaluate decisions:
   - Scale up when slope is above up-threshold and cooldown allows.
   - Scale down when slope is below down-threshold, current CPU is low, and cooldown allows.
6. Enforce max/min replicas and cooldown.
7. Persist events to scaling_events.

Default/active configuration values (from autoscaler config):

1. enabled: true
2. lookback_minutes: 1
3. min_data_points: 5
4. slope_up_threshold: 5.0
5. slope_down_threshold: -2.0
6. cpu_low_for_down: 20.0
7. cooldown_seconds: 60
8. max_replicas: 10
9. min_replicas: 1
10. ma_window: 3

### Governance and Policy Methodology
Policy engine features:

1. Accept policies as strings or structured dictionaries.
2. Parse natural-language-like expressions for cost and carbon bounds.
3. Normalize metric aliases (for example carbon_g to carbon, cpu to cpu_percent).
4. Normalize period aliases (run, minute, hour, day forms).
5. Support container-scoped policies with optional target container.
6. Evaluate cost, carbon, CPU percent, and memory MB against thresholds.
7. Return violation objects with policy, metric, threshold, observed, period, and recommended action.

Violations are continuously evaluated during metrics collection and saved for UI display and auditability.

## Implementation
### Technology Stack
Backend:

1. Python 3.10+
2. FastAPI
3. APScheduler
4. Docker SDK for Python
5. SQLite

Frontend:

1. React 19
2. TypeScript
3. Vite
4. Axios
5. Recharts
6. Lucide icons

### Backend Module Responsibilities
backend/main.py:

1. Defines API contracts using Pydantic models.
2. Initializes manager, policy engine, and predictive scaler.
3. Exposes container lifecycle APIs.
4. Exposes metrics, policy, and auto-scaling APIs.
5. Initializes SQLite tables.
6. Runs scheduled metrics collection and policy evaluation.

backend/docker_manager.py:

1. Wraps Docker operations for list, start, stop, remove, logs, and stats.
2. Computes normalized container info and port mappings.
3. Includes robust image label fallback for missing image metadata.
4. Tracks last container start error for better API diagnostics.
5. Handles scaling by service name and replica suffix convention.
6. Avoids fixed host-port collisions by assigning dynamic host ports for replicas beyond first instance when fixed bindings are requested.

backend/autoscaler.py:

1. Implements trend analysis and decision generation.
2. Uses base-name grouping to align replicas.
3. Persists decisions in scaling_events.
4. Executes scale actions through manager callback.

backend/policy.py:

1. Parses policies.
2. Normalizes metric and period aliases.
3. Evaluates policies against runtime samples.
4. Supports scoped and global rule behavior.

backend/simulator.py:

1. Defines pricing models and carbon intensity maps.
2. Converts Docker metrics to vCPU and memory-hour units.
3. Calculates estimated cost and carbon values.

### Frontend Module Responsibilities
Dashboard view orchestrates key panels:

1. ContainerList for fleet inventory and quick actions.
2. MetricsChart for time-series visualization.
3. EconomicsPanel for cost and carbon interpretation.
4. ControlPanel for deploy and scale workflows.
5. AutoScalerPanel for config and event monitoring.
6. PolicyPanel for rule authoring.
7. PolicyViolationsPanel for global and scoped violations.
8. LogViewer for container logs.

Frontend API layer maps directly to backend endpoints and typed contracts, including deploy/scale calls, metrics history, policies, auto-scaler status/events/config, and policy violations.

### API Surface Summary
Container APIs:

1. GET /containers
2. GET /containers/{id}/stats
3. GET /containers/{id}/logs
4. POST /containers/{id}/start
5. POST /containers/{id}/stop
6. DELETE /containers/{id}
7. POST /deploy
8. POST /scale

Metrics and policy APIs:

1. GET /metrics/history
2. GET /policies
3. POST /policies
4. POST /policies/evaluate
5. GET /policies/violations

Auto-scaler APIs:

1. GET /scaling/status
2. GET /scaling/events
3. GET /scaling/config
4. POST /scaling/config

### Persistence Schema
metrics_history columns:

1. id
2. container_name
3. cpu_pct
4. mem_mb
5. timestamp
6. estimated_cost
7. carbon_g

scaling_events columns:

1. id
2. container_name
3. action
4. slope
5. current_cpu
6. current_replicas
7. target_replicas
8. reason
9. timestamp

policy_violations columns:

1. id
2. container_name
3. policy
4. metric
5. threshold
6. observed
7. period
8. timestamp

### Demo and Operations Scripts
scripts/run_real_container_demo.py:

1. Waits for API readiness.
2. Verifies Docker availability.
3. Deploys a real container.
4. Reads stats and waits for scheduler samples.
5. Fetches metrics history and evaluates policy on sampled values.
6. Cleans up by scaling to zero.

demo-app workload:

1. Flask app exposing /compute for CPU-intensive prime calculation.
2. load.sh script generates concurrent load for demonstration.

## Testing and Results
### Automated Test Coverage
Backend pytest suite includes:

1. Policy parser and normalization behavior.
2. Scoped policy enforcement behavior.
3. Auto-scaler base-name history alignment.
4. Auto-scaler event filtering by base name.
5. API smoke checks for health and policy endpoints.

Frontend Vitest suite includes:

1. Policy violations panel empty and populated states.
2. Dashboard rendering of global and scoped policy-violation panel integration.

### Verified Automation Outcomes
Validated outcomes from project session:

1. Backend pytest: 9 passed.
2. Frontend vitest: 3 passed.
3. Frontend lint: passed.
4. Frontend production build: passed.

### Runtime Validation Outcomes
Runtime evidence in session included:

1. API startup on port 8000 completed.
2. APScheduler metrics job started and executed on interval.
3. Dashboard polling paths returned successful responses.
4. End-to-end script execution completed with exit code 0.

### Load Validation Outcomes
Short load-testing evidence from prior run:

1. 89 requests.
2. 0 failures.
3. Approximate average latency around 2 ms.
4. Approximate throughput around 4.53 req/s.

These values represent a short synthetic run for baseline health, not large-scale benchmarking.

### Defects Found and Fixes Applied
Issue 1: Replica host-port collisions during multi-replica deploy with fixed host bindings.

1. Symptom: deployment attempts failed when multiple replicas tried to bind same host port.
2. Fix: only first fixed-port replica retains explicit host binding; additional replicas use dynamic host ports.
3. Outcome: reduced deployment failures in demo scenarios.

Issue 2: Repeated container listing errors when image metadata was unavailable.

1. Symptom: noisy Docker image lookup errors during list operations.
2. Fix: resilient image label fallback path with safe container attribute access.
3. Outcome: stable list behavior and reduced runtime log noise.

Issue 3: Ambiguous deploy success semantics.

1. Symptom: partial or failed starts could still appear as success to callers.
2. Fix: deploy and scale endpoints now return HTTP 409 with failure details when any replica fails to start.
3. Outcome: clearer operational error signaling and easier frontend handling.

### Known Constraints
1. Build currently emits a non-blocking bundle-size warning.
2. Carbon and pricing values are simulated approximations, not billing-authoritative values.
3. Auto-scaling model is intentionally simple and slope-based.

## Conclusion
LocalScale successfully demonstrates an integrated local platform for container orchestration, predictive scaling, policy governance, and cloud-economics simulation. The system combines practical developer workflows with observability and governance features typically associated with managed cloud platforms, while remaining portable and local-only.

From an engineering perspective, the project is mature enough for demonstrations and educational reporting. It includes clear API contracts, persistence-backed observability, configurable scaling logic, policy evaluation pipelines, and validated test coverage across backend and frontend layers. Runtime hardening work also improved resilience in common demo failure modes.

The most meaningful outcome is the end-to-end feedback loop it enables:

1. Deploy workload.
2. Observe metrics and economics.
3. Evaluate policy compliance.
4. Trigger or observe scaling decisions.
5. Reassess outcomes.

This loop is central to modern cloud operations, and LocalScale provides a compact local environment for studying and presenting that workflow.

### Suggested Future Work
1. Add CI pipeline enforcement for lint, tests, and build gates.
2. Expand policy grammar and add enforcement actions beyond alerts.
3. Add richer forecasting options and model comparison framework.
4. Improve large-run benchmarking with repeatable scenarios and reporting templates.
5. Reduce frontend bundle size through code-splitting and lazy route loading.
