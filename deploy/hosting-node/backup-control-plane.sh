#!/usr/bin/env bash
set -euo pipefail

# Snapshot the Control Plane registry sqlite. Does not delete customer volumes.
# Copy the resulting file off-host with rsync/rclone (credentials are external).

ROOT=${SIC_ROOT:-/opt/sic/crm_marketing_saas}
SRC="$ROOT/control_plane/data/control-plane.sqlite"
DEST_DIR=${CONTROL_PLANE_BACKUP_DIR:-/var/lib/sic/backups/control-plane}
STAMP=$(date -u +%Y%m%d_%H%M%S)
mkdir -p "$DEST_DIR"

if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC" >&2
  exit 1
fi

# VACUUM INTO needs a path the sqlite process can write. Fall back to cp.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$SRC" "VACUUM INTO '$DEST_DIR/control-plane_$STAMP.sqlite'"
else
  cp -a "$SRC" "$DEST_DIR/control-plane_$STAMP.sqlite"
fi

# Keep two weeks of registry snapshots.
find "$DEST_DIR" -name 'control-plane_*.sqlite' -mtime +14 -delete

echo "Wrote $DEST_DIR/control-plane_$STAMP.sqlite"
echo "Also copy $ROOT/control_plane/data/backups off-host. Do not treat the VPS as the only copy."
