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

echo "== Done. Databases: =="
sudo -u postgres psql -Atc "select datname from pg_database where datname like 'letterlock%'"
