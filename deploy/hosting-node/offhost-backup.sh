#!/usr/bin/env bash
set -euo pipefail

# Nightly PROD recovery set: fleet zip, PROD env files, Control Plane sqlite.
# Production destination is an rclone remote (SIC_OFFHOST_REMOTE), not a folder on this VPS.
# A directory destination remains for tests and refuses the same filesystem as /opt/sic.
# Tests may set SIC_OFFHOST_ALLOW_SAME_FS=1. Production cron must not.

ROOT=${SIC_ROOT:-/opt/sic/crm_marketing_saas}
CP_URL=${CONTROL_PLANE_URL:-http://127.0.0.1:52100}
STATUS_DIR=${SIC_BACKUP_STATUS_DIR:-/var/lib/sic/backups}
STATUS_FILE="$STATUS_DIR/offhost-status.txt"
STAGING=${SIC_OFFHOST_STAGING:-/var/lib/sic/backups/staging}
ENV_FILE=${SIC_OFFHOST_ENV:-/etc/sic/offhost.env}
RETENTION_DAYS=${SIC_OFFHOST_RETENTION_DAYS:-14}
RCLONE_CONFIG=${SIC_RCLONE_CONFIG:-/root/.config/rclone/rclone.conf}

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

DEST=${SIC_OFFHOST_DEST:-}
REMOTE=${SIC_OFFHOST_REMOTE:-}
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

remote_dest_for() {
  local base=$1
  local stamp=$2
  if [[ "$base" == *: ]]; then
    printf '%s%s\n' "$base" "$stamp"
  else
    printf '%s/%s\n' "${base%/}" "$stamp"
  fi
}

if [[ -z "$REMOTE" && -z "$DEST" ]]; then
  fail 2 "MISSING_DESTINATION Set SIC_OFFHOST_REMOTE (rclone) or SIC_OFFHOST_DEST in $ENV_FILE."
fi

if [[ -n "$REMOTE" ]]; then
  if [[ "$REMOTE" != *:* ]]; then
    fail 2 "REMOTE_INVALID SIC_OFFHOST_REMOTE must be an rclone remote path."
  fi
  if ! command -v rclone >/dev/null 2>&1; then
    fail 2 "MISSING_RCLONE rclone is not installed."
  fi
  if [[ ! -f "$RCLONE_CONFIG" ]]; then
    fail 2 "MISSING_RCLONE_CONFIG $RCLONE_CONFIG"
  fi
  export RCLONE_CONFIG
else
  if [[ ! -d "$DEST" ]]; then
    fail 2 "MISSING_DESTINATION $DEST does not exist."
  fi
  src_dev=$(device_of "$ROOT")
  dest_dev=$(device_of "$DEST")
  if [[ "$src_dev" == "$dest_dev" && "${SIC_OFFHOST_ALLOW_SAME_FS:-}" != "1" ]]; then
    fail 3 "SAME_DISK $DEST is on the production filesystem. Refusing to call that off-host."
  fi
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
mkdir -p "$BUNDLE/env" "$BUNDLE/registry" "$BUNDLE/zip"
if [[ -z "$REMOTE" ]]; then
  mkdir -p "$DEST/$STAMP/env" "$DEST/$STAMP/registry"
fi

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

publish_path=""
if [[ -n "$REMOTE" ]]; then
  publish_path=$(remote_dest_for "$REMOTE" "$STAMP")
  if ! rclone copy "$BUNDLE" "$publish_path" --retries 3 --low-level-retries 10; then
    rclone purge "$publish_path" >/dev/null 2>&1 || true
    fail 8 "UPLOAD_FAILED $publish_path"
  fi
  if ! rclone check "$BUNDLE" "$publish_path" --one-way; then
    rclone purge "$publish_path" >/dev/null 2>&1 || true
    fail 8 "VERIFY_FAILED $publish_path"
  fi
  cutoff=$(date -u -d "-${RETENTION_DAYS} days" +%Y%m%d)
  while IFS= read -r name; do
    name=${name%/}
    [[ "$name" == "$STAMP" ]] && continue
    [[ "$name" =~ ^[0-9]{8}_[0-9]{6}$ ]] || continue
    day=${name%%_*}
    if [[ "$day" < "$cutoff" ]]; then
      old_path=$(remote_dest_for "$REMOTE" "$name")
      rclone purge "$old_path" || echo "RETENTION_WARN $old_path" >&2
    fi
  done < <(rclone lsf "$REMOTE" --dirs-only --max-depth 1)
else
  cp -a "$BUNDLE/env/." "$DEST/$STAMP/env/"
  cp -a "$BUNDLE/registry/." "$DEST/$STAMP/registry/"
  find "$DEST" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
  publish_path="$DEST/$STAMP"
fi

for id in "${PROD_IDS[@]}"; do
  if [[ -n "$REMOTE" ]]; then
    payload=$(python3 -c 'import json,sys; print(json.dumps({"remotePath": sys.argv[1]}))' "$publish_path")
  else
    payload=$(python3 -c 'import json,sys; print(json.dumps({"destinationDir": sys.argv[1]}))' "$publish_path")
  fi
  code=$(curl -sS -o "$BUNDLE/copy-$id.json" -w '%{http_code}' -X POST "$CP_URL/api/environments/$id/backup/copy" \
    -H 'content-type: application/json' \
    -d "$payload")
  if [[ "$code" != "200" ]]; then
    fail 9 "OFFHOST_RECORD_FAILED $id http $code"
  fi
done

printf '%s OK %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$publish_path" >"$STATUS_FILE"
echo "Off-host bundle $publish_path"
