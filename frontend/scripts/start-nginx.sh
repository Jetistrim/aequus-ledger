#!/bin/sh
set -eu

CERT_DIR="/tmp/certs"
CERT_FILE="$CERT_DIR/tls.crt"
KEY_FILE="$CERT_DIR/tls.key"
EXTERNAL_CERT_FILE="/certs/tls.crt"
EXTERNAL_KEY_FILE="/certs/tls.key"

mkdir -p "$CERT_DIR" /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

if [ -f "$EXTERNAL_CERT_FILE" ] && [ -f "$EXTERNAL_KEY_FILE" ]; then
  cp "$EXTERNAL_CERT_FILE" "$CERT_FILE"
  cp "$EXTERNAL_KEY_FILE" "$KEY_FILE"
else
  echo "Nenhum certificado externo encontrado em /certs. Gerando certificado self-signed para localhost..."
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 365 \
    -subj "/CN=localhost"
fi

exec nginx -g 'daemon off;'
