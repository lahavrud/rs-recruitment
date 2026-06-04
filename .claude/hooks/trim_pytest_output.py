import json
import sys

d = json.load(sys.stdin)
out = d.get("output", "")
if "pytest" in d.get("command", "") and len(out) > 3000:
    lines = out.splitlines()
    failures = [l for l in lines if any(x in l for x in ["FAILED", "ERROR", "AssertionError", "short test summary"])]
    passed = next((l for l in lines if "passed" in l or "failed" in l), "")
    summary = "\n".join(failures[-40:] + ([passed] if passed else []))
    print(f"[trimmed pytest output]\n{summary}")
sys.exit(0)
