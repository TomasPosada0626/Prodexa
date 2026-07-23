# E2E (Playwright)

## Los 5 specs permanentes

Viven en `apps/frontend/e2e/` y corren en cada `npm run test:frontend:e2e`:

| Spec | Cubre |
|---|---|
| `auth-flow.spec.ts` | Landing pública, redirección sin sesión, registro, crear formulación, persistencia de sesión, logout |
| `formulaciones-crud.spec.ts` | Crear, editar y eliminar una formulación; el estado de onboarding vuelve cuando la lista queda vacía |
| `simulacion.spec.ts` | Analizar costo de un lote, aplicar descuento mayorista, actualizar el margen desde Costos |
| `dashboard-filtros.spec.ts` | Filtro por formulación específica y por categoría en el Dashboard |
| `verificaciones-permanentes.spec.ts` | Anular una orden de producción, borrar un registro sanitario en Calidad, formato + subida de imagen real en el editor de preparación |

## La convención de specs de un solo uso

Para verificar una feature nueva antes de darla por terminada, la práctica de este
proyecto es escribir un spec temporal (`apps/frontend/e2e/_tmp-verify-<feature>.spec.ts`),
correrlo una sola vez contra la app real (backend + Postgres reales, no mocks), y
**borrarlo** — nunca se commitea. Es, en efecto, un QA manual acelerado: prueba el
flujo completo de principio a fin exactamente una vez, sin inflar la suite permanente
con specs de un caso puntual que ya no aportan nada una vez verificado.

Los 5 specs permanentes existen porque cubren flujos que sí vale la pena volver a
correr en cada cambio (regresión); los `_tmp-verify-*` existen para el momento
puntual de "¿esto que acabo de construir funciona de verdad, con datos reales, de
punta a punta?".

## Grabación del demo

El script que graba el GIF del README (`apps/frontend/scripts/record-demo.mjs`, `npm
run demo:record`) usa Playwright directamente, fuera de `testDir` — no es parte de la
suite de tests, no tiene assertions, es una herramienta de grabación reutilizable.
