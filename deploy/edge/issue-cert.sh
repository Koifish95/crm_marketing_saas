#!/usr/bin/env bash
set -euo pipefail

# Let's Encrypt HTTP-01 for one public hostname.
# Requires: DNS A/AAAA already pointing at this node, edge nginx serving
# /.well-known/acme-challenge/ from deploy/edge/acme, ports 80/443 open.
#
# Usage: issue-cert.sh <hostname> [email]

HOSTNAME=${1:?hostname required, e.g. ma-test.example.com}
EMAIL=${2:-}
ROOT=${EDGE_ROOT:-$(cd "$(dirname "$0")" && pwd)}
WEBROOT="$ROOT/acme"
LE="$ROOT/letsencrypt"
CERTS="$ROOT/certs/$HOSTNAME"

mkdir -p "$WEBROOT" "$LE" "$CERTS"

EMAIL_ARGS=(--register-unsafely-without-email)
if [[ -n "$EMAIL" ]]; then
  EMAIL_ARGS=(-m "$EMAIL" --no-eff-email)
fi

docker run --rm \
  -v "$WEBROOT:/var/www/acme" \
  -v "$LE:/etc/letsencrypt" \
  certbot/certbot certonly --webroot -w /var/www/acme \
  -d "$HOSTNAME" --agree-tos --non-interactive \
  "${EMAIL_ARGS[@]}"

cp -L "$LE/live/$HOSTNAME/fullchain.pem" "$CERTS/fullchain.pem"
cp -L "$LE/live/$HOSTNAME/privkey.pem" "$CERTS/privkey.pem"
chmod 0644 "$CERTS/fullchain.pem"
chmod 0600 "$CERTS/privkey.pem"

echo "Installed $CERTS. Regenerate nginx from the Control Plane, then reload."
