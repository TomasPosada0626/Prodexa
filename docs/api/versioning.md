# Versionado y compatibilidad de la API

Item 1.4 de [`docs/gestion/roadmap-calidad-90.md`](../gestion/roadmap-calidad-90.md).
Hoy no existen integradores externos de la API de Prodexa — el único consumidor real es
el propio frontend, desplegado siempre en lockstep con el backend. Esta política es,
por lo tanto, deliberadamente forward-looking: fija la regla ahora, antes de que haga
falta, en vez de improvisarla el día que aparezca el primer consumidor externo (una
integración, un partner, una automatización de un cliente).

## Esquema de versión actual

La API vive completa bajo `/api/v1` (`app.setGlobalPrefix('api/v1', ...)` en
`main.ts`), con `/health` y `/ready` excluidos a propósito porque un orquestador los
golpea sin conocer la versión (ver [`docs/observability/overview.md`](../observability/overview.md)).
No hay ninguna ruta fuera de `/api/v1` que exponga lógica de negocio.

## Qué cuenta como cambio compatible (no rompe `v1`)

- Agregar un endpoint nuevo.
- Agregar un campo **opcional** a un DTO de request.
- Agregar un campo nuevo a una respuesta.
- Relajar una validación (ej. subir un límite máximo).
- Agregar un valor nuevo a un campo de tipo `string` con conjunto fijo de valores
  (`rol`, `estadoProduccion`, etc. — ver [`docs/database/overview.md`](../database/overview.md)
  sobre por qué esos campos son `String` y no `enum` de Postgres: el mismo motivo que
  los hace flexibles de migrar los hace compatibles hacia atrás casi siempre).

## Qué cuenta como cambio incompatible (requeriría `v2`, o una migración coordinada)

- Eliminar o renombrar un endpoint, un campo de request, o un campo de response que
  algún consumidor real dependa de leer.
- Volver **obligatorio** un campo de request que antes era opcional.
- Cambiar el tipo de un campo (ej. `string` → `number`) o el significado de un valor
  existente.
- Endurecer una validación de forma que una request antes válida ahora sea rechazada.
- Cambiar el código de estado HTTP de una respuesta existente.

## Cómo se detecta un cambio incompatible antes de que llegue a producción

`apps/backend/test/api-schema.e2e-spec.ts` genera el documento OpenAPI real (el mismo
que sirve `/api/docs` en desarrollo) contra el código actual y lo compara con un
snapshot committeado (`__snapshots__/api-schema.e2e-spec.ts.snap`). Si el contrato de
la API cambió — un endpoint nuevo, un campo distinto en un DTO, un schema distinto —
el test falla en CI con un diff legible del cambio exacto, forzando una decisión
consciente: ¿este cambio es compatible (se actualiza el snapshot y sigue) o rompe algo
(necesita una estrategia de versión)?

Esto complementa, no duplica, a `docs/api/endpoints.md` (generado por
`scripts/generate-endpoints-doc.mjs`, que documenta la matriz de rutas/roles pero no
la forma de los DTOs): el snapshot ve la forma real del request/response, generada en
runtime desde los decoradores de `class-validator`/`@ApiProperty`, no una lectura de
texto del código fuente.

## Qué haríamos el día que exista un `v2`

No construido todavía porque no hay necesidad real — documentado para no improvisarlo
bajo presión cuando sí la haya:

1. `v1` y `v2` corren en paralelo bajo `/api/v1` y `/api/v2` (Nest soporta módulos
   versionados sin reescribir todo — se evaluaría entonces si conviene duplicar
   controllers o versionar a nivel de DTO/respuesta dentro del mismo controller,
   según qué tan grande sea el cambio real).
2. Se anuncia una fecha de fin de soporte para `v1` a cualquier consumidor conocido
   (hoy, eso es solo el propio frontend — trivial; el día que haya un cliente externo,
   esto se vuelve un compromiso contractual real).
3. `v1` no se apaga hasta que se confirme que no queda tráfico real contra ella (o se
   cumplió la fecha anunciada, lo que sea más estricto).

## Por qué no se persigue una certificación de compatibilidad más allá de esto

Ver la sección "Lo que NO vamos a perseguir todavía" en
[`docs/gestion/roadmap-calidad-90.md`](../gestion/roadmap-calidad-90.md): sin
consumidores externos reales, no hay un contrato de terceros que probar más allá del
propio frontend — esta política y el test de snapshot son lo máximo verificable hoy.
