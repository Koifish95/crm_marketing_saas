#!/bin/sh
set -eu

mkdir -p /app/data/sqlite /app/data/uploads

if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data/sqlite /app/data/uploads
  exec gosu node "$0" "$@"
fi

node docker/runtime-init.cjs
exec node .output/server/index.mjs
