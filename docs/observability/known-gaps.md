# Huecos conocidos de observabilidad

Documentados a propósito — el objetivo es que quien opere esto en guardia sepa
exactamente qué puede y qué no puede inferir de un log o una respuesta, en vez de
descubrirlo en producción.

## Un 500 no dice cuál fue la causa real

`HttpExceptionFilter` (ver [`docs/architecture/politica_errores.md`](../architecture/politica_errores.md))
responde siempre el mismo mensaje genérico para cualquier error que no sea una
`HttpException` de Nest, y **no loguea el detalle de la excepción real** en ese caso.

**Qué significa esto en la práctica, si estás de guardia:** un 500 genérico en los
logs puede ser cualquier cosa — Postgres caído, un `undefined` inesperado, un timeout
de red — y el log no te va a decir cuál. Se descubrió exactamente así: durante esta
misma fase de trabajo, Docker Desktop se cayó y Postgres quedó inalcanzable; el único
síntoma visible era un 500 idéntico al de un bug real de la app. Diagnosticarlo
requirió agregar temporalmente un `console.error` de depuración en el filtro,
reproducir el error, encontrar la causa real (`ECONNREFUSED`), y revertir el cambio.

**Qué hacer mientras tanto:** si ves un 500 sin contexto claro, revisa primero el
estado de la infraestructura (¿Postgres responde? ¿Docker está arriba?) antes de
asumir que es un bug de la aplicación.

**Arreglo recomendado, no hecho todavía:** loguear `exception` completo (mensaje +
stack) del lado del servidor cuando no es una `HttpException`, sin cambiar nada de lo
que se expone al cliente — el cliente sigue recibiendo el mismo mensaje genérico, pero
el log deja de estar vacío de información.

## Sin métricas técnicas ni alertas automáticas

Ver la nota en [`overview.md`](overview.md) — decisión explícita, no un olvido, hasta
que exista un ambiente desplegado real.
