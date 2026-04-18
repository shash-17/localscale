import re

with open("backend/policy.py", "r") as f:
    text = f.read()

# Make evaluate accept container_name optionally
evaluate_sig_old = """    def evaluate(
        self,
        cpu_pct: float,
        mem_mb: float,
        duration_seconds: float,
        region: str = "us-east-1",
        host_cpus: Optional[int] = None,
    ) -> Dict[str, Any]:"""
evaluate_sig_new = """    def evaluate(
        self,
        cpu_pct: float,
        mem_mb: float,
        duration_seconds: float,
        region: str = "us-east-1",
        host_cpus: Optional[int] = None,
        container_name: Optional[str] = None,
    ) -> Dict[str, Any]:"""
text = text.replace(evaluate_sig_old, evaluate_sig_new)

for_loop_old_chunk = """        for p in self.policies:
            metric = p.get("metric") if isinstance(p, dict) else None
            threshold = p.get("threshold") if isinstance(p, dict) else None
            period = p.get("period") if isinstance(p, dict) else None
            raw = p.get("raw") if isinstance(p, dict) else (p if isinstance(p, str) else str(p))"""

for_loop_new_chunk = """        for p in self.policies:
            metric = p.get("metric") if isinstance(p, dict) else None
            threshold = p.get("threshold") if isinstance(p, dict) else None
            period = p.get("period") if isinstance(p, dict) else None
            c_name = p.get("container") if isinstance(p, dict) else None
            raw = p.get("raw") if isinstance(p, dict) else (p if isinstance(p, str) else str(p))
            
            if c_name and container_name and c_name not in container_name:
                continue
"""
text = text.replace(for_loop_old_chunk, for_loop_new_chunk)

with open("backend/policy.py", "w") as f:
    f.write(text)

