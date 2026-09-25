#!/usr/bin/env bash
set -euo pipefail

# Turn a blank Ubuntu 24.04 VPS into an SIC hosting node.
# Does not create DNS records, issue public certificates, or expose the Control Plane.
#
# Usage (as root or with sudo):
#   export REPO_URL=https://github.com/Koifish95/crm_marketing_saas.git
#   export HOSTING_NODE_NAME=vps-1
#   ./deploy/hosting-node/bootstrap.sh

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root (sudo)."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
SIC_ROOT=${SIC_ROOT:-/opt/sic/crm_marketing_saas}
REPO_URL=${REPO_URL:-https://github.com/Koifish95/crm_marketing_saas.git}
BRANCH=${BRANCH:-working}
NODE_NAME=${HOSTING_NODE_NAME:-vps-1}
OPERATOR=${SUDO_USER:-${OPERATOR_USER:-}}

apt-get update
apt-get install -y --no-install-recommends ca-certificates curl git ufw openssl

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

corepack enable
corepack prepare pnpm@10.34.4 --activate

mkdir -p /opt/sic /var/lib/sic/backups
if [[ ! -d "$SIC_ROOT/.git" ]]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$SIC_ROOT"
else
  git -C "$SIC_ROOT" fetch origin
  git -C "$SIC_ROOT" checkout "$BRANCH"
  git -C "$SIC_ROOT" pull --ff-only origin "$BRANCH"
fi

if [[ -n "$OPERATOR" ]]; then
  usermod -aG docker "$OPERATOR" || true
  chown -R "$OPERATOR:$OPERATOR" /opt/sic /var/lib/sic
fi

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw deny 52100/tcp || true

install -d -m 0755 /etc/sic
cat >/etc/sic/control-plane.env <<EOF
NITRO_HOST=127.0.0.1
NITRO_PORT=52100
HOSTING_NODE_NAME=$NODE_NAME
HOSTING_NODE_KIND=vps
EDGE_PROXY_MODE=host-network
REPO_ROOT=$SIC_ROOT
EDGE_ROOT=$SIC_ROOT/deploy/edge
SKIP_LAB_SEED=true
DATABASE_URL=file:$SIC_ROOT/control_plane/data/control-plane.sqlite
NODE_ENV=production
EOF
chmod 0600 /etc/sic/control-plane.env

install -m 0644 "$SIC_ROOT/deploy/hosting-node/sic-control-plane.service" /etc/systemd/system/sic-control-plane.service

cd "$SIC_ROOT/control_plane"
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate
SKIP_LAB_SEED=true HOSTING_NODE_NAME="$NODE_NAME" HOSTING_NODE_KIND=vps pnpm db:seed

install -m 0755 "$SIC_ROOT/deploy/hosting-node/backup-control-plane.sh" /usr/local/sbin/sic-backup-control-plane
install -m 0755 "$SIC_ROOT/deploy/hosting-node/offhost-backup.sh" /usr/local/sbin/sic-offhost-backup
install -m 0755 "$SIC_ROOT/deploy/edge/renew-certs.sh" /usr/local/sbin/sic-renew-certs
cat >/etc/cron.d/sic-hosting-node <<EOF
15 2 * * * root /usr/local/sbin/sic-backup-control-plane
30 2 * * * root /usr/local/sbin/sic-offhost-backup
20 3 * * * root EDGE_ROOT=$SIC_ROOT/deploy/edge /usr/local/sbin/sic-renew-certs
EOF

systemctl daemon-reload
systemctl enable --now sic-control-plane.service

cd "$SIC_ROOT/deploy/edge"
docker compose up -d

echo
echo "Hosting node bootstrap finished."
echo "Control Plane is loopback-only on 127.0.0.1:52100."
echo "From your laptop: ssh -N -L 52100:127.0.0.1:52100 USER@THIS_HOST"
echo "Then open http://127.0.0.1:52100"
echo "Do not publish port 52100. Do not docker compose down -v."
