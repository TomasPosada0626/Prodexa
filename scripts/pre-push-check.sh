#!/usr/bin/env bash
# Corre localmente (antes de dejar hacer push) lo mismo que corre CI, para que un
# push roto se descubra en 2-4 minutos en tu maquina en vez de en el log de Actions.
#
# Nacio de un caso real: un spec de Playwright con un locator ambiguo paso todas
# las verificaciones locales que SI se corrieron a mano, y solo goto rojo cuando
# corrio en un navegador real dentro de CI. Este hook agrega ese paso que faltaba.
#
# Salida de emergencia si de verdad necesitas pushear sin la parte de Playwright
# (ej. Postgres no esta arriba en este momento y el cambio no toca frontend/e2e):
#   SKIP_E2E_PLAYWRIGHT=1 git push
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/apps/backend"
FRONTEND_DIR="$REPO_ROOT/apps/frontend"
TEST_DB_URL="postgresql://prodexa:prodexa@localhost:55432/prodexa_test?schema=public"
HOOK_BACKEND_PORT=3900
HOOK_FRONTEND_PORT=3901
BACKEND_PID=""
FRONTEND_PID=""

fail() {
  echo ""
  echo "pre-push: $1"
  echo "(push cancelado — nada se subio)"
  exit 1
}

matar_por_puerto() {
  # kill del PID de `npx next start` no siempre alcanza: npx puede dejar un hijo
  # real de Next corriendo bajo otro PID. Matar por puerto es lo que de verdad
  # garantiza que no quede nada escuchando para la proxima corrida.
  local puerto="$1"
  if command -v powershell.exe > /dev/null 2>&1; then
    powershell.exe -NoProfile -Command \
      "Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" \
      > /dev/null 2>&1
  fi
}

cleanup() {
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  matar_por_puerto "$HOOK_BACKEND_PORT"
  matar_por_puerto "$HOOK_FRONTEND_PORT"
}
trap cleanup EXIT

esperar_http() {
  local url="$1"
  local intentos="${2:-30}"
  for _ in $(seq 1 "$intentos"); do
    curl -sf "$url" > /dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

echo "── pre-push 1/6: backend — typecheck + lint ──"
cd "$BACKEND_DIR" || fail "no se encontro apps/backend"
npx tsc --noEmit || fail "backend: tsc encontro errores de tipos"
npx eslint src || fail "backend: eslint encontro errores"

echo "── pre-push 2/6: backend — tests unitarios (con cobertura) ──"
npm run test:cov || fail "backend: tests unitarios fallaron o la cobertura bajo del umbral"

echo "── pre-push 3/6: backend — tests de integracion (Postgres real) ──"
if ! node -e "require('net').createConnection(55432,'localhost').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; then
  fail "Postgres no responde en localhost:55432 — arrancalo (docker start <contenedor>) y reintenta el push"
fi
DATABASE_URL="$TEST_DB_URL" npx prisma migrate deploy > /dev/null 2>&1
DATABASE_URL="$TEST_DB_URL" npm run test:e2e || fail "backend: tests de integracion fallaron"

echo "── pre-push 4/6: frontend — typecheck + lint ──"
cd "$FRONTEND_DIR" || fail "no se encontro apps/frontend"
npx tsc --noEmit || fail "frontend: tsc encontro errores de tipos"
npx eslint src || fail "frontend: eslint encontro errores"

echo "── pre-push 5/6: frontend — tests unitarios (con cobertura) ──"
npm run test:cov || fail "frontend: tests unitarios fallaron"

if [ "${SKIP_E2E_PLAYWRIGHT:-}" = "1" ]; then
  echo "── pre-push 6/6: frontend E2E (Playwright) — SALTEADO (SKIP_E2E_PLAYWRIGHT=1) ──"
  echo ""
  echo "pre-push: resto verde, Playwright salteado a proposito. Subiendo."
  exit 0
fi

echo "── pre-push 6/6: E2E real (Playwright, backend + frontend levantados) ──"
cd "$BACKEND_DIR"
npm run build > /dev/null 2>&1 || fail "backend: build fallo"
# recuperar-contrasena.spec.ts lee el codigo de recuperacion desde este archivo
# exacto (apps/backend/backend.log) — mismo mecanismo que usa el job frontend-e2e
# de CI. Si el log queda en otro lado, ese spec se salta en silencio (paso, no
# fallo) en vez de correr de verdad — ya paso una vez armando este hook.
rm -f backend.log
DATABASE_URL="$TEST_DB_URL" NODE_ENV=development BACKEND_PORT=$HOOK_BACKEND_PORT \
  AUTH_THROTTLE_LIMIT=1000 CORS_ORIGIN="http://localhost:$HOOK_FRONTEND_PORT" \
  node dist/src/main.js > backend.log 2>&1 &
BACKEND_PID=$!

esperar_http "http://localhost:$HOOK_BACKEND_PORT/health" || fail "backend: no arranco a tiempo (ver apps/backend/backend.log)"

cd "$FRONTEND_DIR"
NEXT_PUBLIC_API_URL="http://localhost:$HOOK_BACKEND_PORT/api/v1" npm run build > /dev/null 2>&1 || fail "frontend: build fallo"
npx next start -p $HOOK_FRONTEND_PORT > /tmp/prepush-frontend.log 2>&1 &
FRONTEND_PID=$!

esperar_http "http://localhost:$HOOK_FRONTEND_PORT/" || fail "frontend: no arranco a tiempo (ver /tmp/prepush-frontend.log)"

E2E_BASE_URL="http://localhost:$HOOK_FRONTEND_PORT" npx playwright test || fail "frontend: Playwright encontro fallas reales"

echo ""
echo "pre-push: todo verde (typecheck, lint, unit, integracion, e2e real). Subiendo."
