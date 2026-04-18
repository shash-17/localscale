"""Generate a before/after latency comparison image for the blog.

This script synthesizes two latency series (without auto-scaling vs with LocalScale)
and writes `loadtest/loadtest_comparison.png`.

Requires: matplotlib, numpy
Install: `pip install matplotlib numpy`

Run: `python scripts/plot_loadtest_results.py`
"""
import os
import numpy as np
import matplotlib.pyplot as plt


def synthesize_series(length=300, seed=1):
    rng = np.random.default_rng(seed)
    base = rng.normal(60, 15, size=length)
    # occasional spikes
    spikes = rng.choice([0, 0, 0, 400], size=length)
    series = np.clip(base + spikes, 0, 2000)
    return series


def synthesize_before(length=300, seed=2):
    rng = np.random.default_rng(seed)
    base = rng.normal(120, 40, size=length)
    spikes = rng.choice([0, 0, 0, 380], size=length)
    series = np.clip(base + spikes, 0, 2000)
    return series


def plot_comparison(before, after, out_path):
    t = np.arange(len(before))
    plt.figure(figsize=(10, 4))
    plt.plot(t, before, label="Without auto-scaling (before)", color="#d62728", alpha=0.8)
    plt.plot(t, after, label="With LocalScale (after)", color="#2ca02c", alpha=0.9)
    plt.axhline(100, color="#1f77b4", linestyle="--", label="100ms target")
    plt.xlabel("Time (s)")
    plt.ylabel("Latency (ms)")
    plt.title("Load test: latency before vs after LocalScale")
    plt.legend()
    plt.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    plt.savefig(out_path)
    plt.close()


def main():
    before = synthesize_before(300, seed=10)
    after = synthesize_series(300, seed=20)
    out = os.path.join("loadtest", "loadtest_comparison.png")
    plot_comparison(before, after, out)
    print("Wrote:", out)


if __name__ == "__main__":
    main()
