# Estructura monorepo de Prodexa

> La estructura de módulos se simplificó respecto al diseño en capas del plan
> inicial — ver el razonamiento en [`docs/architecture/overview.md`](overview.md) y
> la nota al final de este documento.

## Estructura real

```
apps/
  backend/   → NestJS 11, módulos planos por feature (ver modulos_y_contextos.md)
  frontend/  → Next.js 16 (App Router), React 19
docs/
  architecture/, adr/, api/, database/, diagrams/, deployment/, testing/,
  security/, observability/, assets/, gestion/, demo/
packages/
  shared/    → vacío (.gitkeep). Provisionado para código compartido entre
               apps/backend y apps/frontend si algún día hace falta; hoy no
               se usa (mismo criterio que Redis en docker-compose.yml: se
               documenta como no-usado en vez de aparentar que lo está).
infra/
  → vacío (.gitkeep). Reservado para IaC si algún día hay despliegue real
    (Fase 8, hoy no iniciada).
templates/
  module-template/ → plantilla original de Fase 1 (domain/application/
                      infrastructure/presentation). Ningún módulo real la
                      siguió — ver la nota de abajo.
legacy/
  desktop-v1/ → la calculadora de escritorio en Python que precedió a Prodexa
                (app.py + recetas.json, sin persistencia real). Se conserva
                como referencia histórica, no se mantiene.
```

## Convención de nombres (vigente)

- Archivos: kebab-case.
- Clases: PascalCase.
- Funciones y variables: camelCase.
- DTOs: sufijo `.dto.ts`.
- Specs de test: sufijo `.spec.ts` (unit/integration) o `.e2e-spec.ts` (backend
  integration contra Postgres real) / `.spec.ts` bajo `apps/frontend/e2e/` (Playwright).

## Nota sobre `templates/module-template/` y la convención por capas

El diseño inicial definía que cada módulo de backend tendría subcarpetas `domain/`,
`application/`, `infrastructure/` y `presentation/` (Repository Pattern, casos de uso
explícitos, puertos/adaptadores). En la construcción real se optó por módulos planos,
al estilo idiomático de NestJS (`*.controller.ts`, `*.service.ts`, `*.module.ts`,
`dto/` por módulo), con Prisma inyectado directo en los servicios — una decisión
consciente de simplicidad, con su razonamiento completo en
[`docs/architecture/overview.md`](overview.md). `templates/module-template/` queda
como referencia del diseño original, no como la plantilla que se sigue hoy para un
módulo nuevo (eso es `modulos_y_contextos.md`).
