#!/usr/bin/env python3
"""
Jawhara — VPS SSH helper (copied from custompc, reads infra/vps-creds).

Reads connection details from `vps-creds` at the repo root (git-ignored)
and runs the command(s) passed on argv against the KVM via paramiko.

Usage:
    python scripts/kvm.py 'pwd && ls -la'
    python scripts/kvm.py 'cd /opt/custompc && git pull && docker compose up -d --build frontend'

Designed for invocation from the Bash tool — non-interactive, no TTY, no
prompts. stdout/stderr from the remote command are streamed back to the
local stdout/stderr; exit code mirrors the remote exit code.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Windows consoles default to cp1252 which chokes on UTF-8 output from
# remote commands. Force stdout/stderr to UTF-8 with replacement so a stray
# non-ASCII byte never aborts the deploy.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO_ROOT = Path(__file__).resolve().parent
CREDS = REPO_ROOT / "vps-creds"


def parse_creds(path: Path) -> dict:
    if not path.exists():
        sys.stderr.write(
            f"ERROR: {path} not found. Create it from vps-creds template.\n"
        )
        sys.exit(2)
    out: dict = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v
    return out


def main(argv: list[str]) -> int:
    if len(argv) < 1:
        sys.stderr.write("Usage: kvm.py <command> [<command> ...]\n")
        return 64

    creds = parse_creds(CREDS)
    host = creds.get("KVM_HOST", "").strip()
    host6 = creds.get("KVM_HOST6", "").strip()  # IPv6 fallback (see vps-creds)
    user = creds.get("KVM_USER", "root").strip() or "root"
    port = int((creds.get("KVM_PORT") or "22").strip() or 22)
    password = creds.get("KVM_PASS", "")

    if not host:
        sys.stderr.write(
            "ERROR: KVM_HOST is empty in vps-creds. Set it and retry.\n"
        )
        return 2
    if not password:
        sys.stderr.write("ERROR: KVM_PASS is empty in vps-creds.\n")
        return 2

    try:
        import paramiko  # type: ignore
    except ImportError:
        sys.stderr.write(
            "ERROR: paramiko not installed. Run: python -m pip install paramiko\n"
        )
        return 2

    client = paramiko.SSHClient()
    # First-run host key trust: accept whatever the server presents and pin
    # it. If the host key changes between runs, paramiko will raise.
    known_hosts = REPO_ROOT / ".kvm-known-hosts"
    if known_hosts.exists():
        client.load_host_keys(str(known_hosts))
    else:
        # AutoAddPolicy on first contact, then we save it.
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    def _connect(target: str, timeout: int) -> None:
        client.connect(
            hostname=target,
            port=port,
            username=user,
            password=password,
            allow_agent=False,
            look_for_keys=False,
            timeout=timeout,
            banner_timeout=timeout,
            auth_timeout=timeout,
        )

    try:
        try:
            # Short timeout on IPv4 so a firewall-dropped v4 fails fast, then
            # fall back to IPv6 (Hostinger edge blocks our office IPv4).
            _connect(host, 8 if host6 else 15)
        except (paramiko.ssh_exception.NoValidConnectionsError, OSError, EOFError) as e:
            if not host6:
                raise
            sys.stderr.write(
                f"WARN: IPv4 {host} unreachable ({type(e).__name__}); "
                f"falling back to IPv6 {host6}\n"
            )
            _connect(host6, 15)
    except paramiko.AuthenticationException:
        sys.stderr.write(
            "ERROR: SSH auth rejected. Check KVM_USER / KVM_PASS in vps-creds.\n"
        )
        return 3
    except Exception as e:  # noqa: BLE001
        sys.stderr.write(f"ERROR: connect failed: {type(e).__name__}: {e}\n")
        return 4

    # Persist the host key so subsequent runs detect MITM.
    try:
        client.save_host_keys(str(known_hosts))
    except Exception:
        pass

    rc = 0
    try:
        for cmd in argv:
            sys.stdout.write(f"\n# remote $ {cmd}\n")
            sys.stdout.flush()
            stdin_, stdout_, stderr_ = client.exec_command(cmd, get_pty=False)
            stdin_.close()
            # Stream concurrently — use channel readiness rather than blocking
            # reads so a long-running build doesn't starve.
            chan = stdout_.channel
            while True:
                if chan.recv_ready():
                    sys.stdout.buffer.write(chan.recv(4096))
                    sys.stdout.flush()
                if chan.recv_stderr_ready():
                    sys.stderr.buffer.write(chan.recv_stderr(4096))
                    sys.stderr.flush()
                if chan.exit_status_ready():
                    # Drain anything left.
                    while chan.recv_ready():
                        sys.stdout.buffer.write(chan.recv(65536))
                    while chan.recv_stderr_ready():
                        sys.stderr.buffer.write(chan.recv_stderr(65536))
                    sys.stdout.flush()
                    sys.stderr.flush()
                    break
            rc = chan.recv_exit_status()
            sys.stdout.write(f"\n# remote exit: {rc}\n")
            if rc != 0:
                break
    finally:
        client.close()

    return rc


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
