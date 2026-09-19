#!/usr/bin/env bash
set -euo pipefail

# Renew all Let's Encrypt certs and copy live PEMs into deploy/edge/certs/.
# Intended for daily cron. After copy, reload nginx if the edge container is up.

ROOT=${EDGE_ROOT:-$(cd "$(dirname "$0")" && pwd)}
WEBROOT="$ROOT/acme"
LE="$ROOT/letsencrypt"
CERTS="$ROOT/certs"

mkdir -p "$WEBROOT" "$LE" "$CERTS"

docker run --rm \
  -v "$WEBROOT:/var/www/acme" \
  -v "$LE:/etc/letsencrypt" \
  certbot/certbot renew --webroot -w /var/www/acme --quiet || true

if [[ -d "$LE/live" ]]; then
  for live in "$LE/live"/*; do
    [[ -d "$live" ]] || continue
    name=$(basename "$live")
    [[ "$name" == README ]] && continue
    mkdir -p "$CERTS/$name"
    if [[ -f "$live/fullchain.pem" && -f "$live/privkey.pem" ]]; then
      cp -L "$live/fullchain.pem" "$CERTS/$name/fullchain.pem"
      cp -L "$live/privkey.pem" "$CERTS/$name/privkey.pem"
      chmod 0644 "$CERTS/$name/fullchain.pem"
      chmod 0600 "$CERTS/$name/privkey.pem"
    fi
  done
fi

if docker inspect -f '{{.State.Running}}' sic-production-edge 2>/dev/null | grep -q true; then
  docker exec sic-production-edge nginx -t
  docker exec sic-production-edge nginx -s reload
fi
