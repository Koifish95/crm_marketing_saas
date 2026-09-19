#!/usr/bin/env bash
set -euo pipefail

# Local / lab TLS only. Not for Internet issuance.
# Usage: generate-self-signed.sh <hostname>

HOSTNAME=${1:?hostname required}
ROOT=${EDGE_ROOT:-$(cd "$(dirname "$0")" && pwd)}
CERTS="$ROOT/certs/$HOSTNAME"
mkdir -p "$CERTS"

openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
  -keyout "$CERTS/privkey.pem" \
  -out "$CERTS/fullchain.pem" \
  -subj "/CN=$HOSTNAME" \
  -addext "subjectAltName=DNS:$HOSTNAME"

chmod 0644 "$CERTS/fullchain.pem"
chmod 0600 "$CERTS/privkey.pem"
echo "Wrote self-signed certs under $CERTS"
