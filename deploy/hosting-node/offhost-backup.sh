#!/usr/bin/env bash
set -euo pipefail

# Nightly PROD bundle: fleet zip, PROD env files, Control Plane sqlite.
# A destination on the same filesystem as /opt/sic is refused. That is not off-host.
# Tests may set SIC_OFFHOST_ALLOW_SAME_FS=1. Production cron must not.

ROOT=${SIC_ROOT:-/opt/sic/crm_marketing_saas}
CP_URL=${CONTROL_PLANE_URL:-http://127.0.0.1:52100}
STATUS_DIR=${SIC_BACKUP_STATUS_DIR:-/var/lib/sic/backups}
STATUS_FILE="$STATUS_DIR/offhost-status.txt"
STAGING=${SIC_OFFHOST_STAGING:-/var/lib/sic/backups/staging}
ENV_FILE=${SIC_OFFHOST_ENV:-/etc/sic/offhost.env}
RETENTION_DAYS=${SIC_OFFHOST_RETENTION_DAYS:-14}

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

DEST=${SIC_OFFHOST_DEST:-}
mkdir -p "$STATUS_DIR" "$STAGING"

fail() {
  local code=$1
  shift
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >"$STATUS_FILE"
  echo "$*" >&2
  exit "$code"
}

device_of() {
  stat -c %d "$1"
}

if [[ -z "$DEST" ]]; then
  fail 2 "MISSING_DESTINATION Set SIC_OFFHOST_DEST in $ENV_FILE to a directory that is not on this VPS disk."
fi

if [[ ! -d "$DEST" ]]; then
  fail 2 "MISSING_DESTINATION $DEST does not exist."
fi

src_dev=$(device_of "$ROOT")
dest_dev=$(device_of "$DEST")
if [[ "$src_dev" == "$dest_dev" && "${SIC_OFFHOST_ALLOW_SAME_FS:-}" != "1" ]]; then
  fail 3 "SAME_DISK $DEST is on the production filesystem. Refusing to call that off-host."
fi

DB="$ROOT/control_plane/data/control-plane.sqlite"
if [[ ! -f "$DB" ]]; then
  fail 4 "MISSING_REGISTRY $DB"
fi

mapfile -t PROD_IDS < <(python3 - "$DB" <<'PY'
import sqlite3, sys
con = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
rows = con.execute("select id from environments where type='PROD' and lifecycle_status not in ('decommissioned','archived','failed') and archived_at is null").fetchall()
for row in rows:
    print(row[0])
PY
)

if [[ ${#PROD_IDS[@]} -eq 0 ]]; then
  fail 5 "NO_PROD_ENVIRONMENTS"
fi

STAMP=$(date -u +%Y%m%d_%H%M%S)
BUNDLE="$STAGING/$STAMP"
mkdir -p "$BUNDLE/env" "$BUNDLE/registry" "$BUNDLE/zip" "$DEST/$STAMP/env" "$DEST/$STAMP/registry"

for id in "${PROD_IDS[@]}"; do
  code=$(curl -sS -o "$BUNDLE/backup-$id.json" -w '%{http_code}' -X POST "$CP_URL/api/environments/$id/backup" -H 'content-type: application/json' -d '{}')
  if [[ "$code" != "200" ]]; then
    fail 6 "BACKUP_FAILED $id http $code"
  fi
  zip_path=$(python3 - "$BUNDLE/backup-$id.json" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
backup = body.get("backup") or body
path = backup.get("zipPath") or ""
if not path:
    raise SystemExit("zip path missing")
print(path)
PY
  )
  cp -a "$zip_path" "$BUNDLE/zip/"
  env_src="$ROOT/control_plane/data/provisioned/$id.env"
  if [[ ! -f "$env_src" ]]; then
    fail 7 "MISSING_ENV $env_src"
  fi
  cp -a "$env_src" "$BUNDLE/env/"
done

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" "VACUUM INTO '$BUNDLE/registry/control-plane.sqlite'"
else
  cp -a "$DB" "$BUNDLE/registry/control-plane.sqlite"
fi

cp -a "$BUNDLE/env/." "$DEST/$STAMP/env/"
cp -a "$BUNDLE/registry/." "$DEST/$STAMP/registry/"
find "$DEST" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

for id in "${PROD_IDS[@]}"; do
  code=$(curl -sS -o "$BUNDLE/copy-$id.json" -w '%{http_code}' -X POST "$CP_URL/api/environments/$id/backup/copy" \
    -H 'content-type: application/json' \
    -d "{\"destinationDir\":\"$DEST/$STAMP\"}")
  if [[ "$code" != "200" ]]; then
    fail 8 "OFFHOST_RECORD_FAILED $id http $code"
  fi
done

printf '%s OK %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DEST/$STAMP" >"$STATUS_FILE"
echo "Off-host bundle $DEST/$STAMP"
