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

## Un 500 en producción sin causa obvia en el código (RESUELTO)

`/audit-log` empezó a devolver 500 en el ambiente real (Render) sin que hubiera
ningún cambio de código asociado. Causa real: dos migraciones de Prisma
(`agrega_codigos_recuperacion_password` y `agrega_revision_alertas_login_fallido`,
de la feature de recuperación de contraseña y la de revisión de alertas) habían
quedado commiteadas y aplicadas en local, pero nunca se ejecutó
`prisma migrate deploy` contra la base de datos de producción — el plan gratuito de
Render no tiene una consola de Shell (eso es de pago), así que no había un paso
"obvio" para correr migraciones ahí, y no hay un paso automático en el deploy que lo
haga (ver [`roadmap-despliegue.md`](../deployment/roadmap-despliegue.md)). El código
en producción esperaba columnas/tablas que la base de datos real no tenía.

**Cómo se diagnosticó:** con la "External Database URL" que Render expone en el panel
del servicio de Postgres (distinta de la "Internal Database URL", que solo es
alcanzable entre servicios de Render) se pudo correr `prisma migrate status` desde la
máquina local contra la base real y confirmar las migraciones pendientes, sin
necesitar Shell.

**Arreglo aplicado:** `DATABASE_URL="<external-url>" npx prisma migrate deploy`
corrido una vez desde local. Esto no es un fix de código — sigue siendo un paso
manual pendiente de cada deploy que agregue una migración, ya documentado como techo
conocido del plan gratuito de Render. Si esto vuelve a pasar, el síntoma es el mismo:
un 500 genérico en un endpoint que tocó una tabla/columna nueva, sin ningún error de
aplicación en el log (porque la app arrancó bien; solo esa query específica falla).

## Sin métricas técnicas ni alertas automáticas

Ver la nota en [`overview.md`](overview.md) — decisión explícita, no un olvido, dado
el tamaño y tráfico actuales del ambiente desplegado real.
