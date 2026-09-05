#!/usr/bin/env python3
"""Upload one local file to the VPS over SFTP, using the same infra/vps-creds as vps.py.

    python infra/put.py deploy/backup.sh /opt/letterlock/incoming/backup.sh
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from vps import CREDS, parse_creds  # noqa: E402


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        sys.stderr.write("Usage: put.py <local> <remote>\n")
        return 64
    import paramiko  # type: ignore

    c = parse_creds(CREDS)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    kw = dict(port=int(c.get("KVM_PORT") or 22), username=c.get("KVM_USER", "root"), password=c["KVM_PASS"],
              allow_agent=False, look_for_keys=False, timeout=15)
    try:
        client.connect(c["KVM_HOST"].strip(), **kw)
    except Exception:
        client.connect(c["KVM_HOST6"].strip(), **kw)
    sftp = client.open_sftp()
    sftp.put(argv[0], argv[1])
    st = sftp.stat(argv[1])
    print(f"uploaded {argv[0]} -> {argv[1]} ({st.st_size} bytes)")
    sftp.close()
    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
