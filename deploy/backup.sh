#!/usr/bin/env bash
# Nightly backups for Letterlock (LAUNCH_PLAN Phase 7 / 2.10), from jawhara's script.
# pg_dump -Fc of both databases + a copy of the API env files, 14-day local rotation,
# then an off-box copy with rclone when a remote named `letterlock-backup` exists
# (configure once with `rclone config`; B2 or S3, 30-day retention on the bucket).
set -euo pipefail
DEST=/opt/letterlock/backups
STAMP=$(date +%F)
mkdir -p "$DEST"
for db in letterlock letterlock_dev; do
  sudo -u postgres pg_dump -Fc "$db" > "$DEST/$db-$STAMP.dump"
done
tar czf "$DEST/env-$STAMP.tgz" -C / opt/letterlock/.env opt/letterlock-dev/.env 2>/dev/null || true
# Verify the prod dump restores (schema only, into a scratch db).
# NOTE: pg_restore runs as `postgres`, and /opt/letterlock is 0700 root, so postgres
# cannot open the dump itself. Feed it on STDIN so the root shell opens the file.
# Getting this wrong is silent: `cmd && echo ok` just prints nothing (it did, for the
# script's whole life). Report the failure loudly instead.
sudo -u postgres psql -qc "drop database if exists letterlock_restorecheck" >/dev/null 2>&1
sudo -u postgres createdb letterlock_restorecheck
if sudo -u postgres pg_restore -d letterlock_restorecheck --schema-only      < "$DEST/letterlock-$STAMP.dump" >/dev/null 2>&1; then
  TABLES=$(sudo -u postgres psql -d letterlock_restorecheck -qtAc     "select count(*) from information_schema.tables where table_schema='public'")
  if [ "${TABLES:-0}" -ge 10 ]; then
    echo "$STAMP restore check ok ($TABLES tables)"
  else
    echo "$STAMP RESTORE CHECK FAILED: only $TABLES tables in the restored schema"
  fi
else
  echo "$STAMP RESTORE CHECK FAILED: pg_restore could not read $DEST/letterlock-$STAMP.dump"
fi
sudo -u postgres psql -qc "drop database letterlock_restorecheck" >/dev/null
find "$DEST" -name '*.dump' -mtime +14 -delete
find "$DEST" -name 'env-*.tgz' -mtime +14 -delete
if command -v rclone >/dev/null && rclone listremotes | grep -q '^letterlock-backup:'; then
  rclone copy "$DEST" letterlock-backup:letterlock-backups --include "*-$STAMP.*" && echo "$STAMP off-box copy ok"
else
  echo "$STAMP no rclone remote 'letterlock-backup' yet (LAUNCH_PLAN Phase 7): local copy only"
fi
