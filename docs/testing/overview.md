# Estrategia de testing

## Pirámide, cada nivel contra algo real

```
        ▲  7 specs E2E (Playwright + axe-core)         — flujos de usuario reales
       ╱ ╲ 28 tests integración (Postgres real)          — apps/backend/test/*.e2e-spec.ts
      ╱   ╲ 278 unit backend (Jest) + 59 unit frontend (Vitest)
     ╱─────╲
```

Ningún nivel se prueba solo contra mocks completos: la capa de integración levanta la
app de Nest real (mismo `main.ts`: prefijo, cookies, `ValidationPipe`, filtro de
errores) contra `prodexa_test`, una base Postgres dedicada — nunca contra la de
desarrollo.

## Números actuales

| Suite | Comando | Qué cubre |
|---|---|---|
| Backend unit | `npm run test:backend` | 278 tests, Jest, Prisma mockeado — servicios, guards, DTOs, el motor de costeo |
| Backend integración/e2e | `npm run test:backend:e2e` | 28 tests contra Postgres real: registro/login/refresh/logout, aislamiento entre organizaciones (404, no 403), reglas de negocio (bloqueo de borrado, máquina de estados) |
| Frontend unit | `npm run test:frontend` | 59 tests, Vitest — `lib/costing.ts` (espejo del motor de costeo), `lib/format.ts`, `lib/export.ts`, retry-on-401 de `lib/api.ts`, `lib/calidad.ts`, `lib/sanitize-html.ts`, `lib/forecast.ts`, `lib/sugerencias.ts` |
| Frontend E2E | `npm run test:frontend:e2e` | 7 specs Playwright — ver [`e2e.md`](e2e.md) |

## Quality gate real

**Backend:** `coverageThreshold` en `apps/backend/package.json` exige **≥95%** de
statements/lines/functions y **≥80%** de branches — `npm run test:cov` falla (exit
code distinto de cero) si la cobertura baja de ahí, y `.github/workflows/test.yml`
corre ese comando en cada push/PR a `main`. No es un número aspiracional en el
README: es lo que bloquea el job de CI si no se cumple.

Exclusiones de cobertura deliberadas: `*.module.ts`, `*.dto.ts`, `main.ts` — wiring y
decoradores sin lógica ejecutable propia, no código sin probar escondido.

**Frontend:** `coverage.thresholds` en `apps/frontend/vitest.config.ts` exige
**≥90%** de statements/lines, **≥80%** de functions y **≥75%** de branches sobre
`src/lib/**` (el mismo alcance de siempre — lógica pura; componentes y páginas se
validan vía los 7 specs E2E, no aquí). Antes de `forecast.test.ts` y
`sugerencias.test.ts` (agosto de 2026) el frontend no tenía gate — dos módulos,
`forecast.ts` y `sugerencias.ts`, tenían 0% de cobertura y nada lo bloqueaba. `npm
run test:cov` del frontend ahora falla igual que el del backend si la cobertura
retrocede.

## Accesibilidad

Las pantallas clave se corrieron contra `@axe-core/playwright` (WCAG 2.1 AA) en modo
claro y oscuro durante la Fase 5 — las violaciones de contraste que encontró (no
serían evidentes en una revisión visual) están corregidas.
