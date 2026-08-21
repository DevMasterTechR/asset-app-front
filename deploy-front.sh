#!/usr/bin/env bash
# ============================================================
# Despliegue del front en el VPS.
#
# Compila dentro de un contenedor Node (no hace falta instalar Node ni pnpm
# en el VPS) y publica el resultado en /srv/asset-app-front/dist, que es la
# carpeta que sirve Nginx.
#
# Uso:  ./deploy-front.sh            (git pull + build + publicar)
#       ./deploy-front.sh --no-pull  (build con el código local)
# ============================================================
set -euo pipefail

cd "$(dirname "$0")"

API_URL="${VITE_API_URL:-https://gestor.techresources360.tech/api}"
PUBLICAR_EN=/srv/asset-app-front/dist

if [ "${1:-}" != "--no-pull" ]; then
  echo "▸ Trayendo cambios de git..."
  git pull --ff-only
fi

echo "▸ Compilando (VITE_API_URL=$API_URL)..."
# El .env del repo apunta al backend viejo de Render y Vite le da prioridad
# sobre las variables del shell. .env.production.local gana a todos los demás
# (y está cubierto por "*.local" en .gitignore, así que nunca se commitea).
cat > .env.production.local <<ENV
VITE_API_URL=$API_URL
VITE_SEND_BEARER_TOKEN=false
ENV

# pnpm fijado a la misma versión que usa el Dockerfile del back: la última
# (11.x) aborta con ERR_PNPM_IGNORED_BUILDS por los scripts de esbuild/@swc.
# Qué paquetes pueden ejecutar scripts se declara en package.json
# ("pnpm.onlyBuiltDependencies") — esbuild y @swc/core necesitan el suyo.
#
# El store va en un volumen: si no, pnpm lo crea dentro del repo (/app/.pnpm-store)
# y además se pierde la caché entre despliegues.
docker run --rm \
  -v "$PWD":/app -w /app \
  -v pnpm-store:/pnpm-store \
  -e CI=true \
  node:22-bookworm-slim \
  sh -c 'corepack enable \
    && corepack prepare pnpm@10.29.3 --activate \
    && pnpm config set store-dir /pnpm-store --global \
    && pnpm install --frozen-lockfile \
    && pnpm run build'

[ -f dist/index.html ] || { echo "✗ El build no generó dist/index.html" >&2; exit 1; }

# Comprobación real: la URL nueva tiene que estar dentro del bundle.
if ! grep -rqF "$API_URL" dist/assets/*.js; then
  echo "✗ El bundle no contiene $API_URL. Revisa .env.production.local" >&2
  exit 1
fi
echo "▸ Publicando en $PUBLICAR_EN..."
mkdir -p "$PUBLICAR_EN"
# --delete quita los bundles viejos; el index.html nuevo ya no los referencia.
rsync -a --delete dist/ "$PUBLICAR_EN/"

# Nginx corre como www-data y necesita poder leer y atravesar los directorios.
chown -R www-data:www-data /srv/asset-app-front
find /srv/asset-app-front -type d -exec chmod 755 {} +
find /srv/asset-app-front -type f -exec chmod 644 {} +

echo "✓ Front publicado ($(du -sh "$PUBLICAR_EN" | cut -f1))"
echo
echo "Comprobar:  curl -sI https://gestor.techresources360.tech/ | head -3"
