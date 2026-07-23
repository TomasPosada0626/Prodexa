# Huecos conocidos de observabilidad

Documentados a propósito — el objetivo es que quien opere esto en guardia sepa
exactamente qué puede y qué no puede inferir de un log o una respuesta, en vez de
descubrirlo en producción.

## Un 500 no decía cuál fue la causa real (RESUELTO)

`HttpExceptionFilter` responde siempre el mismo mensaje genérico para cualquier error
que no sea una `HttpException` de Nest. Hasta esta revisión, tampoco logueaba el
detalle de la excepción real en ese caso — se descubrió exactamente así: durante una
fase anterior de trabajo, Docker Desktop se cayó y Postgres quedó inalcanzable; el
único síntoma visible era un 500 idéntico al de un bug real de la app. Diagnosticarlo
en su momento requirió agregar temporalmente un `console.error` de depuración en el
filtro, reproducir el error, encontrar la causa real (`ECONNREFUSED`), y revertirlo.

**Arreglo aplicado:** `HttpExceptionFilter` ahora loguea `{ err: exception }` vía
`request.log` (el logger de pino-http de esa request especifica, con su mismo
`requestId`) cuando la excepción no es HTTP — con un serializer de error propio
(`stdSerializers.err` de `pino-http` en `pino.config.ts`, ya que `message`/`stack` de
un `Error` no son propiedades enumerables y se perderían en un `JSON.stringify` sin
serializer explícito). El cliente sigue recibiendo exactamente el mismo mensaje
genérico — el detalle solo queda en el log del servidor. Verificado con test
(`http-exception.filter.spec.ts`: loguea para errores no-HTTP, no loguea para
`HttpException`, no revienta si la request no tiene logger adjunto).

## Sin métricas técnicas ni alertas automáticas

Ver la nota en [`overview.md`](overview.md) — decisión explícita, no un olvido, hasta
que exista un ambiente desplegado real.
