"""
Simple simulator for pricing and carbon footprint estimations.
This module provides:
- PRICING_MODELS: hardcoded USD rates
- CARBON_INTENSITY: simulated gCO2/kWh by region
- calculate_cost(...)
- calculate_carbon_footprint(...)
- docker_cpu_percent_to_vcpu(...)

All values are simulated and for local testing only.
"""
from typing import Dict, Optional

PRICING_MODELS: Dict[str, float] = {
    "vCPU_hour": 0.01,      # USD per vCPU-hour
    "GB_RAM_hour": 0.005,   # USD per GB-RAM-hour
}

CARBON_INTENSITY: Dict[str, float] = {
    # grams CO2 per kWh (simulated values)
    "us-east-1": 450.0,
    "eu-west-1": 200.0,
    "global": 400.0,
}

# Simulated power draw assumptions (watts)
W_PER_VCPU = 10.0      # watts consumed by 1 vCPU at full utilization
W_PER_GB_RAM = 0.5     # watts consumed per GB of RAM


def docker_cpu_percent_to_vcpu(cpu_percent: float, host_cpus: Optional[int] = None, clamp: bool = True) -> float:
    """Convert Docker `CPU %` to abstract vCPU units.

    - A `cpu_percent` of 100 -> 1 vCPU for the duration.
    - 200 -> 2 vCPUs, etc.
    - If `host_cpus` is provided and `clamp` is True, the result
      is capped at `host_cpus`.

    Returns a non-negative float representing vCPU units.
    """
    try:
        cpu_percent = float(cpu_percent)
    except (TypeError, ValueError):
        return 0.0
    vcpus = max(cpu_percent, 0.0) / 100.0
    if clamp and host_cpus is not None:
        try:
            host_cpus_float = float(host_cpus)
            vcpus = min(vcpus, host_cpus_float)
        except (TypeError, ValueError):
            pass
    return vcpus


def calculate_cost(
    cpu_usage_percent: float,
    memory_mb: float,
    duration_seconds: float,
    pricing_models: Optional[Dict[str, float]] = None,
    host_cpus: Optional[int] = None,
) -> float:
    """Estimate cost (USD) for given usage over `duration_seconds`.

    - `cpu_usage_percent`: Docker-style CPU % (e.g., 50.0)
    - `memory_mb`: memory usage in megabytes
    - `duration_seconds`: elapsed time in seconds

    Uses PRICING_MODELS by default; returns a float USD value.
    """
    pricing = pricing_models or PRICING_MODELS
    vcpus = docker_cpu_percent_to_vcpu(cpu_usage_percent, host_cpus)
    hours = float(max(duration_seconds, 0.0)) / 3600.0
    vcpu_hours = vcpus * hours
    gb_ram = float(max(memory_mb, 0.0)) / 1024.0
    gb_ram_hours = gb_ram * hours
    cost = vcpu_hours * pricing.get("vCPU_hour", 0.0) + gb_ram_hours * pricing.get("GB_RAM_hour", 0.0)
    return round(float(cost), 8)


def calculate_carbon_footprint(
    cpu_usage_percent: float,
    memory_mb: float,
    duration_seconds: float,
    region: str = "us-east-1",
    carbon_intensity: Optional[Dict[str, float]] = None,
    host_cpus: Optional[int] = None,
) -> float:
    """Estimate grams of CO2 for the given usage over `duration_seconds`.

    This uses simple power assumptions (W_PER_VCPU, W_PER_GB_RAM) to
    convert resource-hours into energy (kWh), then multiplies by the
    region's carbon intensity (gCO2/kWh).
    """
    ci = carbon_intensity or CARBON_INTENSITY
    intensity = float(ci.get(region, ci.get("global", 400.0)))
    vcpus = docker_cpu_percent_to_vcpu(cpu_usage_percent, host_cpus)
    hours = float(max(duration_seconds, 0.0)) / 3600.0
    vcpu_hours = vcpus * hours
    gb_ram_hours = (float(max(memory_mb, 0.0)) / 1024.0) * hours
    energy_kwh_cpu = vcpu_hours * W_PER_VCPU / 1000.0
    energy_kwh_mem = gb_ram_hours * W_PER_GB_RAM / 1000.0
    total_energy_kwh = energy_kwh_cpu + energy_kwh_mem
    grams_co2 = total_energy_kwh * intensity
    return round(float(grams_co2), 2)


__all__ = [
    "PRICING_MODELS",
    "CARBON_INTENSITY",
    "docker_cpu_percent_to_vcpu",
    "calculate_cost",
    "calculate_carbon_footprint",
]


if __name__ == "__main__":
    # Quick example
    print("Example: 50% CPU, 512MiB, 3600s")
    print("cost:", calculate_cost(50.0, 512, 3600))
    print("co2 (eu-west-1):", calculate_carbon_footprint(50.0, 512, 3600, region="eu-west-1"))
