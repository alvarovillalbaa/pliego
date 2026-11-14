"""Bound one free hosted-browser invocation and preserve all outer streams."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time
import uuid

repo = Path(__file__).resolve().parents[2]
output = Path(os.environ["PLIEGO_OUTPUT"])
output.mkdir(exist_ok=False)
scratch = Path(tempfile.mkdtemp(prefix="pliego-studio-"))
nonce = uuid.uuid4().hex
(scratch / "owner").write_text(nonce)
identity = scratch.stat().st_ino
(scratch / "tmp").mkdir()
env = dict(os.environ, PLAYWRIGHT_BROWSERS_PATH=str(scratch / "browsers"),
           npm_config_cache=str(scratch / "npm-cache"), TMPDIR=str(scratch / "tmp"))
receipt = {"commands": [], "passed": False, "cleanup": False}

def vector():
    names = subprocess.check_output(["git", "ls-files", "-z"], cwd=repo).split(b"\0")
    return [{"path": os.fsdecode(name), "bytes": (repo / os.fsdecode(name)).stat().st_size,
             "sha256": hashlib.sha256((repo / os.fsdecode(name)).read_bytes()).hexdigest()}
            for name in names if name]

before = vector()
(output / "source-before.json").write_text(json.dumps(before, indent=2))

def execute(name, args, timeout):
    started = time.monotonic()
    process = subprocess.Popen(args, cwd=repo, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    timed_out = False
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(process.pid, signal.SIGTERM)
        try:
            stdout, stderr = process.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            stdout, stderr = process.communicate(timeout=10)
    (output / f"{name}.stdout.txt").write_bytes(stdout)
    (output / f"{name}.stderr.txt").write_bytes(stderr)
    deadline = time.monotonic() + 10
    absent = False
    while time.monotonic() < deadline:
        try:
            os.killpg(process.pid, 0)
            time.sleep(0.1)
        except ProcessLookupError:
            absent = True
            break
    row = {"name": name, "argv": args, "exit": process.returncode, "timedOut": timed_out,
           "leaderReaped": process.poll() is not None, "groupAbsent": absent,
           "seconds": time.monotonic() - started, "stdoutBytes": len(stdout), "stderrBytes": len(stderr),
           "stdoutSha256": hashlib.sha256(stdout).hexdigest(), "stderrSha256": hashlib.sha256(stderr).hexdigest()}
    receipt["commands"].append(row)
    print(json.dumps(row), flush=True)
    if process.returncode or timed_out or not absent:
        raise RuntimeError(f"{name} did not complete successfully")

try:
    execute("versions", ["node", "--version"], 10)
    execute("tools", ["npm", "install", "--prefix", str(scratch / "tools"), "--ignore-scripts", "--no-audit", "--no-fund", "playwright@1.56.1"], 240)
    shutil.copyfile(scratch / "tools/package-lock.json", output / "tools-lock.json")
    execute("chromium", ["node", str(scratch / "tools/node_modules/playwright/cli.js"), "install", "chromium"], 240)
    env["PLIEGO_PLAYWRIGHT"] = str(scratch / "tools/node_modules/playwright/index.mjs")
    execute("browser", ["node", "tests/e2e/studio.mjs"], 300)
    result = json.loads((output / "browser-result.json").read_text())
    if not result["passed"]:
        raise RuntimeError("Browser result not accepted")
    receipt["passed"] = True
except Exception as error:
    receipt["error"] = repr(error)
finally:
    after = vector()
    (output / "source-after.json").write_text(json.dumps(after, indent=2))
    receipt["sourceUnchanged"] = before == after
    receipt["scratchBytes"] = sum(p.stat().st_size for p in scratch.rglob("*") if p.is_file() and not p.is_symlink())
    if scratch.stat().st_ino == identity and (scratch / "owner").read_text() == nonce and all(row["groupAbsent"] for row in receipt["commands"]):
        shutil.rmtree(scratch)
        receipt["cleanup"] = not scratch.exists()
    receipt["passed"] = receipt["passed"] and receipt["sourceUnchanged"] and receipt["cleanup"]
    (output / "receipt.json").write_text(json.dumps(receipt, indent=2))
    print(json.dumps(receipt), flush=True)
if not receipt["passed"]:
    raise SystemExit(1)
