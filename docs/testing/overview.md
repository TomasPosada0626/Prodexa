# Estrategia de testing

## Pirámide, cada nivel contra algo real

```
        ▲  5 specs E2E (Playwright + axe-core)         — flujos de usuario reales
       ╱ ╲ 27 tests integración (Postgres real)          — apps/backend/test/*.e2e-spec.ts
      ╱   ╲ 196 unit backend (Jest) + 27 unit frontend (Vitest)
     ╱─────╲
```

Ningún nivel se prueba solo contra mocks completos: la capa de integración levanta la
app de Nest real (mismo `main.ts`: prefijo, cookies, `ValidationPipe`, filtro de
errores) contra `prodexa_test`, una base Postgres dedicada — nunca contra la de
desarrollo.

## Números actuales

| Suite | Comando | Qué cubre |
|---|---|---|
| Backend unit | `npm run test:backend` | 196 tests, Jest, Prisma mockeado — servicios, guards, DTOs, el motor de costeo |
| Backend integración/e2e | `npm run test:backend:e2e` | 27 tests contra Postgres real: registro/login/refresh/logout, aislamiento entre organizaciones (404, no 403), reglas de negocio (bloqueo de borrado, máquina de estados) |
| Frontend unit | `npm run test:frontend` | 27 tests, Vitest — `lib/costing.ts` (espejo del motor de costeo), `lib/format.ts`, `lib/export.ts`, retry-on-401 de `lib/api.ts` |
| Frontend E2E | `npm run test:frontend:e2e` | 5 specs Playwright — ver [`e2e.md`](e2e.md) |

## Quality gate real

`coverageThreshold` en `apps/backend/package.json` exige **≥95%** de
statements/lines/functions y **≥80%** de branches — `npm run test:cov` falla (exit
code distinto de cero) si la cobertura baja de ahí, y `.github/workflows/test.yml`
corre ese comando en cada push/PR a `main`. No es un número aspiracional en el
README: es lo que bloquea el job de CI si no se cumple.

Exclusiones de cobertura deliberadas: `*.module.ts`, `*.dto.ts`, `main.ts` — wiring y
decoradores sin lógica ejecutable propia, no código sin probar escondido.

## Accesibilidad

Las pantallas clave se corrieron contra `@axe-core/playwright` (WCAG 2.1 AA) en modo
claro y oscuro durante la Fase 5 — las violaciones de contraste que encontró (no
serían evidentes en una revisión visual) están corregidas.
