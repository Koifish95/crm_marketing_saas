#!/usr/bin/env bash
set -euo pipefail

# Deploy one pushed commit of crm_marketing_saas to this hosting node and restart the Control Plane.
# GitHub is the only source: the commit must be on origin/$BRANCH. The checkout is never edited by hand.
#
# Usage (as root, normally through `pnpm vps deploy` from the operator workstation):
#   deploy-control-plane.sh <commit-sha>
#
# Never touches customer containers, volumes, or the edge container. Product images are built
# later, by provisioning or upgrade, from the commit this script checks out.

SHA=${1:?Usage: deploy-control-plane.sh <commit-sha>}
SIC_ROOT=${SIC_ROOT:-/opt/sic/crm_marketing_saas}
BRANCH=${BRANCH:-working}
SERVICE=sic-control-plane
PORT=52100
# Generated on this host by the Control Plane. Carried across a deploy when the commit does not change it.
GENERATED=(deploy/edge/nginx.conf)

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi
if [[ ! ${SHA} =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "Expected a commit sha, got: ${SHA}" >&2
  exit 1
fi

cd "$SIC_ROOT"
step() { printf '\n== %s\n' "$*"; }

step "Fetch origin/${BRANCH}"
git fetch --quiet origin "$BRANCH"
TARGET=$(git rev-parse --verify "${SHA}^{commit}")
if ! git merge-base --is-ancestor "$TARGET" "origin/${BRANCH}"; then
  echo "${TARGET} is not on origin/${BRANCH}. Push it first." >&2
  exit 1
fi
PREVIOUS=$(git rev-parse HEAD)
echo "current ${PREVIOUS}"
echo "target  ${TARGET}"

step "Check the checkout"
dirty=$(git status --porcelain --untracked-files=no)
for path in "${GENERATED[@]}"; do
  dirty=$(printf '%s\n' "$dirty" | grep -v -F " ${path}" || true)
done
if [[ -n ${dirty//[[:space:]]/} ]]; then
  echo "Tracked files were edited on this host. Commit them from the workstation or discard them, then retry:" >&2
  printf '%s\n' "$dirty" >&2
  exit 1
fi
for path in "${GENERATED[@]}"; do
  if ! git diff --quiet "$PREVIOUS" "$TARGET" -- "$path"; then
    echo "${TARGET} changes ${path}, which this host generates. Handle that file by hand first." >&2
    exit 1
  fi
done

step "Back up the Control Plane registry"
/usr/local/sbin/sic-backup-control-plane

step "Check out ${TARGET}"
git checkout --quiet -B "$BRANCH" "$TARGET"
git log -1 --oneline

restore_hint() {
  echo >&2
  echo "Deploy failed after checkout. To return to the previous commit: pnpm vps deploy ${PREVIOUS}" >&2
}
trap restore_hint ERR

step "Install, build, migrate"
cd "$SIC_ROOT/control_plane"
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate

step "Refresh host scripts"
install -m 0755 "$SIC_ROOT/deploy/hosting-node/backup-control-plane.sh" /usr/local/sbin/sic-backup-control-plane
install -m 0755 "$SIC_ROOT/deploy/hosting-node/offhost-backup.sh" /usr/local/sbin/sic-offhost-backup
install -m 0755 "$SIC_ROOT/deploy/edge/renew-certs.sh" /usr/local/sbin/sic-renew-certs
if ! cmp -s "$SIC_ROOT/deploy/hosting-node/sic-control-plane.service" /etc/systemd/system/sic-control-plane.service; then
  install -m 0644 "$SIC_ROOT/deploy/hosting-node/sic-control-plane.service" /etc/systemd/system/sic-control-plane.service
  systemctl daemon-reload
  echo "Updated the systemd unit."
fi

step "Restart ${SERVICE}"
systemctl restart "$SERVICE"
for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null --max-time 3 -w '%{http_code}' "http://127.0.0.1:${PORT}/" || true)
  if [[ $code == 200 ]]; then
    trap - ERR
    echo "Control Plane is UP on ${TARGET:0:12}."
    echo "Deployed ${PREVIOUS:0:12} -> ${TARGET:0:12}"
    exit 0
  fi
  sleep 2
done
echo "Control Plane did not answer 200 within 60s. Check: journalctl -u ${SERVICE} -n 80" >&2
restore_hint
exit 1
