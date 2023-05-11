set -ex

if [ -z "$HOST" ]
then
  HOST=":80"
fi

sed "s/<HOST>/$HOST/g" /etc/caddy/Caddyfile > /etc/caddy/Caddyfile.tmp
mv /etc/caddy/Caddyfile.tmp /etc/caddy/Caddyfile

sed "s/<KEY>/$KEY/g" /etc/caddy/Caddyfile > /etc/caddy/Caddyfile.tmp
mv /etc/caddy/Caddyfile.tmp /etc/caddy/Caddyfile


caddy run --config /etc/caddy/Caddyfile --adapter caddyfile