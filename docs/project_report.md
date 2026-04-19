# LocalScale Project Report

## Abstract
LocalScale is a local-first orchestration and governance platform that emulates core cloud operations on a single machine. The system combines Docker-based lifecycle control, predictive auto-scaling, cloud cost and carbon simulation, and policy-based governance into one integrated workflow. The project objective was to provide a practical environment where teams can test deployment, scaling, observability, and sustainability guardrails without using a live cloud account. The final implementation delivers real-time container monitoring, configurable auto-scaling decisions, policy evaluation (structured and natural language), and a frontend dashboard for interactive control and visibility. Validation outcomes show stable operation under normal and stress scenarios, with passing backend and frontend test suites, successful build and lint checks, and successful end-to-end runtime demonstrations.

## Introduction
Modern cloud-native systems require continuous decisions about performance, cost, and environmental impact. In production environments, testing these decisions can be expensive and risky. LocalScale addresses this gap by creating a controlled local environment that reproduces essential cloud management concerns:

1. How services are deployed and scaled.
2. How resource consumption translates into economic and carbon outcomes.
3. How governance rules can be enforced automatically.
4. How operational signals can be observed and acted upon in real time.

The project was designed for developers, students, and engineering teams who need fast iteration cycles for auto-scaling and governance logic before production rollout.

## System Design and Methodology
### Architecture
The system follows a layered architecture:

1. React and TypeScript frontend for control and visualization.
2. FastAPI backend for orchestration, policy evaluation, and scaling decisions.
3. Docker Engine as the execution substrate.
4. SQLite as local persistence for metrics, scaling events, and policy violations.

### Metrics and Sampling Methodology
The backend scheduler collects metrics at fixed intervals and stores CPU, memory, timestamp, estimated cost, and carbon fields. These samples provide both historical observability and model input for scaling and policy checks.

### Predictive Auto-Scaling Methodology
Auto-scaling decisions are based on short-term CPU trend analysis:

1. Pull recent metrics for a service window.
2. Smooth noise using moving averages.
3. Estimate slope using linear regression.
4. Trigger scale up or scale down using threshold and cooldown constraints.

This proactive method improves responsiveness compared with purely reactive thresholding.

### Economics and Carbon Methodology
Cost and carbon are estimated from local resource usage using rate-card and intensity mappings:

$$
\text{Cost} = (\text{vCPU Hours} \times \text{Rate}_{\text{vCPU}}) + (\text{RAM GB Hours} \times \text{Rate}_{\text{RAM}})
$$

$$
\text{CO2 (g)} = \text{Energy (kWh)} \times \text{Grid Intensity (gCO2/kWh)}
$$

This creates a transparent and reproducible approximation for comparative optimization.

### Governance Methodology
Policies can be expressed in structured form or natural-language-like text. Rules are normalized into canonical metrics and periods, then evaluated continuously against observed samples. Violations are persisted and exposed in the dashboard for both global and container-scoped views.

## Implementation
### Backend
Core backend modules implement orchestration and analytics responsibilities:

1. Container management for deploy, start, stop, remove, stats, and logs.
2. Metrics collector and scheduler integration.
3. Predictive scaler with event recording and configurable parameters.
4. Policy engine with metric and period normalization.
5. Economics simulator for estimated cost and carbon.

Database tables include:

1. metrics_history
2. scaling_events
3. policy_violations

Recent runtime hardening improved demo reliability:

1. Container listing now tolerates missing image metadata.
2. Multi-replica deploy avoids host-port collisions by allowing dynamic host binding for replicas beyond the first fixed-port instance.
3. Deploy and scale APIs now return explicit conflict errors when replicas fail to start.

### Frontend
The frontend implements a dashboard-driven operational surface:

1. Container list and lifecycle controls.
2. Metrics charts and economics panels.
3. Auto-scaler status, configuration, and event timeline.
4. Policy creation and violation monitoring.
5. Log viewer for container-level diagnostics.

The UI integrates polling and API orchestration to provide near real-time updates during active load tests.

## Testing and Results
### Automated Verification
The project includes automated checks across backend and frontend:

1. Backend tests with pytest: 9 passed.
2. Frontend tests with Vitest: 3 passed.
3. Frontend lint: passed.
4. Frontend production build: passed.

### Runtime Demonstration
End-to-end runtime validation was completed successfully:

1. Local API startup and scheduler operation on port 8000.
2. Real container demo script completed with successful flow and cleanup.
3. Policy evaluation endpoint returned expected observables and violation structures.
4. Autoscaler and policy violation streams were available through dashboard and API endpoints.

### Load Validation
A short headless load run completed with no request failures in prior validation, confirming baseline API stability under moderate synthetic load.

### Observed Limitations
One non-blocking frontend bundle-size warning remains during build. This does not prevent deployment or demonstration but suggests future code-splitting optimization.

## Conclusion
LocalScale achieves its primary goal: a practical, local environment for testing orchestration, predictive scaling, economics simulation, and governance policies in one platform. The system is functional, demonstrable, and validated through automated tests and runtime exercises. Beyond technical completeness, the project provides a useful experimentation framework for teams that need to evaluate reliability, cost, and sustainability trade-offs before production deployment.

Future improvements can focus on:

1. Stronger CI/CD gates and performance regression automation.
2. Expanded policy grammar and richer violation actions.
3. Advanced forecasting models beyond linear trend analysis.
4. Frontend bundle optimization and larger-scale stress benchmarks.
