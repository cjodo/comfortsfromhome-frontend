#!/bin/sh
# Run the photo admin (restarting it if it ever exits) alongside Caddy.
(while true; do node /admin/server.mjs; sleep 2; done) &
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
