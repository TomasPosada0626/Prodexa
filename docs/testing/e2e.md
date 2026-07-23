# E2E (Playwright)

## Los 6 specs permanentes

Viven en `apps/frontend/e2e/` y corren en cada `npm run test:frontend:e2e`:

| Spec | Cubre |
|---|---|
| `auth-flow.spec.ts` | Landing pública, redirección sin sesión, registro, crear formulación, persistencia de sesión, logout |
| `formulaciones-crud.spec.ts` | Crear, editar y eliminar una formulación; el estado de onboarding vuelve cuando la lista queda vacía |
| `simulacion.spec.ts` | Analizar costo de un lote, aplicar descuento mayorista, actualizar el margen desde Costos |
| `dashboard-filtros.spec.ts` | Filtro por formulación específica y por categoría en el Dashboard |
| `verificaciones-permanentes.spec.ts` | Anular una orden de producción, borrar un registro sanitario en Calidad, formato + subida de imagen real en el editor de preparación |
| `modulos-avanzados.spec.ts` | Tasa de rechazo y ranking en Análisis, cartera por cobrar en Reportes, CRUD de Proveedores, tarifas/sesiones/equipo en Configuración, detalle de eventos en Auditoría — una sola cuenta compartida para las 5 verificaciones |

### Nota sobre el rate limit al correr la suite completa localmente

Cada spec registra una cuenta nueva — con 6 specs, correr `npx playwright test`
completo hace ~6 registros en menos de 60 segundos, que puede chocar con el límite
real de `/auth/register` (5/min, ver `docs/security/owasp-top10.md` A04). Si eso pasa,
el spec que corrió de último falla con un timeout esperando la redirección a
`/login` — **no es una regresión**: reiniciar el backend (limpia el
`ThrottlerStorage` en memoria) y volver a correr esa suite/spec puntual confirma que
pasa. Esto no afecta CI: los workflows de GitHub Actions no corren esta suite E2E
(solo unit tests de frontend, ver `docs/testing/ci.md`), y no afecta a un usuario real
(nadie se registra 6 veces en un minuto). No se relaja el rate limit para acomodar
esto — es una protección de seguridad real, la fricción es aceptable.

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
