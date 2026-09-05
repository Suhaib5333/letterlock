#!/usr/bin/env bash
# One-time VPS provisioning for Letterlock (LAUNCH_PLAN Phase 2.1), adapted from
# palmandplate/scripts/server-setup.sh. Idempotent: safe to re-run.
#
#   python infra/vps.py "DB_PASS=<pw> bash -s" < deploy/server-setup.sh
#
# Creates: Postgres role `letterlock` + databases `letterlock`, `letterlock_dev`
# on the existing native Postgres (localhost only); /opt/letterlock{,-dev} trees;
# the Traefik dynamic file; the nightly backup cron. Never touches ufw (22/2222/80/443
# stay as they are; API ports are loopback-only) and never touches other tenants.
set -euo pipefail

: "${DB_PASS:?DB_PASS is required (openssl rand -base64 24)}"

echo "== Postgres role + databases =="
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'letterlock') THEN
    CREATE ROLE letterlock LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE letterlock WITH PASSWORD '${DB_PASS}';
  END IF;
END \$\$;
SQL
for db in letterlock letterlock_dev; do
  if ! sudo -u postgres psql -Atc "select 1 from pg_database where datname='$db'" | grep -q 1; then
    sudo -u postgres createdb -O letterlock "$db"
    echo "created $db"
  fi
  # pgcrypto is not needed on PG16 (gen_random_uuid is core) but the migrations may
  # create extensions; let the owner do so.
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -c "GRANT ALL ON SCHEMA public TO letterlock;" >/dev/null
done

echo "== Directories =="
for root in /opt/letterlock /opt/letterlock-dev; do
  mkdir -p "$root"/{incoming,releases,bundles,backups}
  chmod 700 "$root"
done

echo "== Traefik dynamic config =="
if [ -f /opt/letterlock/incoming/letterlock.yml ]; then
  install -m 644 /opt/letterlock/incoming/letterlock.yml /root/traefik-dynamic/letterlock.yml
  echo "installed /root/traefik-dynamic/letterlock.yml"
fi

echo "== Backup cron (03:45 daily, 14-day rotation) =="
if [ -f /opt/letterlock/incoming/backup.sh ]; then
  install -m 700 /opt/letterlock/incoming/backup.sh /opt/letterlock/backup.sh
fi
( crontab -l 2>/dev/null | grep -v '/opt/letterlock/backup.sh' ; echo '45 3 * * * /opt/letterlock/backup.sh >> /opt/letterlock/backups/backup.log 2>&1' ) | crontab -

echo "== PM2 =="
command -v pm2 >/dev/null || npm install -g pm2
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# LAUNCH_PLAN Phase 7 "Uptime". Uptime Kuma in Docker, bound to LOCALHOST only and
# published through the existing Traefik entry for status.letterlock.raltech.dev, so
# it never opens another port on a box shared with the other RAL projects. Idempotent:
# re-running server-setup leaves a healthy container alone.
echo "== Uptime Kuma (status page) =="
# Compose, not `docker run`. Every other project on this box is Compose managed, so
# Hostinger's Docker Manager lists them by project; a plain container carries no
# Compose labels and is invisible there, which means it cannot be restarted or even
# noticed when it dies from the panel. deploy/status/docker-compose.yml pins the
# container name (Traefik routes to the NAME, not a port) and marks the volume and
# network external so it adopts what already exists instead of duplicating it.
if command -v docker >/dev/null; then
  mkdir -p /opt/letterlock/status
  if [ -f /opt/letterlock/incoming/status-compose.yml ]; then
    install -m 644 /opt/letterlock/incoming/status-compose.yml /opt/letterlock/status/docker-compose.yml
  fi
  if [ -f /opt/letterlock/status/docker-compose.yml ]; then
    docker volume create letterlock-status >/dev/null 2>&1 || true
    ( cd /opt/letterlock/status && docker compose up -d )
    echo "status page up; open https://status.letterlock.raltech.dev and add the monitors:"
    echo "  https://letterlock.raltech.dev/                 HTTP 200"
    echo "  https://api.letterlock.raltech.dev/healthz      keyword \"db\":true"
    echo "  https://api.letterlock.raltech.dev/app-config   HTTP 200"
    echo "  api.letterlock.raltech.dev:443                  TCP (Socket.IO reachability)"
  else
    echo "no compose file at /opt/letterlock/status/docker-compose.yml; skipping"
  fi
else
  echo "docker not installed; skipping (apt-get install docker.io, then re-run)"
fi

# Phase 7 "Updates": fail2ban on sshd. Moving to SSH keys is still a manual TODO
# shared with the other RAL repos, so until then this blunts password guessing.
echo "== fail2ban =="
if ! command -v fail2ban-server >/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y fail2ban >/dev/null 2>&1 || true
fi
if [ -d /etc/fail2ban ] && [ ! -f /etc/fail2ban/jail.d/sshd.local ]; then
  printf '[sshd]
enabled = true
port = 22,2222
maxretry = 5
bantime = 1h
findtime = 10m
'     > /etc/fail2ban/jail.d/sshd.local
  systemctl restart fail2ban >/dev/null 2>&1 || true
  echo "sshd jail installed (5 tries, 1h ban)"
else
  echo "already configured"
fi

echo "== Done. Databases: =="
sudo -u postgres psql -Atc "select datname from pg_database where datname like 'letterlock%'"
