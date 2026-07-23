# Contribuir a Prodexa

Gracias por el interés en contribuir. Esta guía cubre cómo levantar el proyecto,
las convenciones que sigue, y qué se espera de un Pull Request.

## Setup local

Ver [`docs/deployment/setup_local_fase2.md`](docs/deployment/setup_local_fase2.md) para
el paso a paso completo. Resumen:

```bash
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Estrategia de ramas

- `main` — rama estable, protegida.
- `feat/*` — funcionalidad nueva.
- `fix/*` — corrección de errores.
- `chore/*` — mantenimiento técnico (dependencias, config).
- `docs/*` — cambios de documentación.

Ningún cambio va directo a `main` — todo entra por Pull Request.

## Commits

Mensajes cortos, en español, en imperativo:

```
feat: agrega boton de registrar como orden de produccion
fix: corrige calculo de margen con descuento mayorista
docs: actualiza referencia de endpoints
```

## Antes de abrir un Pull Request

- `npm run lint` y `npm run test` pasan en ambas apps.
- Si el cambio toca comportamiento de backend, agregar o actualizar sus tests (unit y,
  si aplica, integración contra Postgres real — ver
  [`docs/testing/overview.md`](docs/testing/overview.md)).
- Si el cambio es una feature de UI nueva, verificarla manualmente contra la app real
  antes de abrir el PR (levantar `npm run dev`, probarla en el navegador).
- Si el cambio afecta documentación existente, actualizarla en el mismo PR — no se
  acepta que el código y los docs diverjan a propósito.
- Usar la plantilla de PR (`.github/PULL_REQUEST_TEMPLATE.md`, se carga sola al abrir
  el PR).

## Reportar un bug o proponer una feature

Usar las plantillas de issue (`.github/ISSUE_TEMPLATE/`). Para una vulnerabilidad de
seguridad, **no** abrir un issue público — seguir el proceso de
[`SECURITY.md`](SECURITY.md).

## Labels

`.github/labels.yml` define el set base de labels del repositorio (tipo, prioridad,
estado). No hay acceso automatizado a la API de GitHub configurado en este entorno de
desarrollo, así que aplicar ese archivo requiere un paso manual: correrlo una vez con
una acción de sincronización de labels (ej. `EndBug/label-sync`) o crearlos a mano en
Settings → Labels siguiendo la lista del archivo.

## Código de conducta

Este proyecto sigue el [Código de Conducta](CODE_OF_CONDUCT.md) del Contributor
Covenant.
