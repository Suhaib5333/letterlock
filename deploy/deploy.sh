#!/usr/bin/env bash
# Server-side release step for Letterlock (LAUNCH_PLAN Phase 2.9). Run by
# .github/workflows/deploy-vps.yml over SSH after it uploaded bundle.tgz + .env:
#
#   bash deploy.sh prod <sha>     (or: dev <sha>)
#
# Bundle layout: api/ (dist, node_modules, prisma, prisma.config.ts, package.json,
# src/generated), web/ (vite dist), deploy/ (ecosystem.config.js, traefik yml, backup.sh).
# Releases live under $ROOT/releases/<sha>; $ROOT/current is a symlink; the last 5 stay.
set -euo pipefail
ENV="${1:?prod|dev}"; SHA="${2:?sha}"
case "$ENV" in
  prod) ROOT=/opt/letterlock; API=letterlock-api; WEB=letterlock-web; PORT=3100 ;;
  dev)  ROOT=/opt/letterlock-dev; API=letterlock-api-dev; WEB=letterlock-web-dev; PORT=3101 ;;
  *) echo "unknown env $ENV"; exit 2 ;;
esac
export PATH="$HOME/.bun/bin:$PATH"
REL="$ROOT/releases/$SHA"
rm -rf "$REL"; mkdir -p "$REL"
tar xzf "$ROOT/incoming/bundle.tgz" -C "$REL"
# .env uploaded next to the bundle becomes the persisted env for this environment.
if [ -f "$ROOT/incoming/.env" ]; then install -m 600 "$ROOT/incoming/.env" "$ROOT/.env"; rm -f "$ROOT/incoming/.env"; fi
install -m 600 "$ROOT/.env" "$REL/api/.env"
grep -q '^BUNDLES_DIR=' "$REL/api/.env" || echo "BUNDLES_DIR=$ROOT/bundles" >> "$REL/api/.env"

echo "== prisma migrate deploy ($ENV) =="
( cd "$REL/api" && bunx prisma migrate deploy )

ln -sfn "$REL" "$ROOT/current"
install -m 644 "$REL/deploy/traefik/letterlock.yml" /root/traefik-dynamic/letterlock.yml
[ "$ENV" = prod ] && install -m 700 "$REL/deploy/backup.sh" /opt/letterlock/backup.sh

echo "== pm2 =="
pm2 startOrReload "$REL/deploy/ecosystem.config.js" --only "$API" --update-env >/dev/null
pm2 startOrReload "$REL/deploy/ecosystem.config.js" --only "$WEB" --update-env >/dev/null
pm2 save >/dev/null

# The API binds to the docker bridge, not loopback, so Traefik (a container) can
# reach it: see deploy/ecosystem.config.js. Health-checking 127.0.0.1 therefore never
# succeeds, the script exits 1 after 60s, and the deploy's SSH retry loop re-runs the
# whole release up to 8 times, restarting the API each round while reporting failure.
HEALTH_HOST="${API_HOST:-172.17.0.1}"
echo "== health (http://$HEALTH_HOST:$PORT/healthz) =="
for i in $(seq 1 20); do
  sleep 3
  if curl -fs "http://$HEALTH_HOST:$PORT/healthz" | grep -q '"db":true'; then
    echo "$API healthy on :$PORT"
    ls -dt "$ROOT"/releases/* | tail -n +6 | xargs -r rm -rf
    pm2 ls | grep letterlock
    exit 0
  fi
done
echo "!! $API failed the health check"; pm2 logs "$API" --lines 50 --nostream; exit 1
