# API — visión general

## Base y versionado

Todo el API vive detrás de `/api/v1` — **excepto** `GET /health` y `GET /ready`, que
quedan fuera del prefijo a propósito: un orquestador (Docker healthcheck, balanceador,
Kubernetes) los golpea sin conocer ni le debería importar la versión del API.

## Documentación interactiva (Swagger)

`http://localhost:3000/api/docs` — generada con `@nestjs/swagger`, sirve para explorar
request/response reales y probar endpoints con la sesión activa. Este folder
(`docs/api/`) es el complemento estático: la matriz de qué rol puede llamar qué
endpoint, y las decisiones que Swagger no muestra por sí solo (Swagger está disponible
sin autenticación — ver la nota en
[`docs/security/owasp-top10.md`](../security/owasp-top10.md#a052021--security-misconfiguration)).

## Autenticación

No es Bearer token en un header: la sesión vive en dos cookies `httpOnly`
(`access_token`, `refresh_token`), enviadas automáticamente por el navegador en cada
request con `fetch(..., { credentials: 'include' })`. Mecánica completa en
[`docs/api/auth.md`](auth.md).

## Autorización

`JwtAuthGuard` protege todo endpoint autenticado. `RolesGuard` + `@Roles('ADMIN',
'COORDINADOR')` restringe además los endpoints de mutación que lo requieren — el
detalle rol por rol está en la tabla de [`docs/api/endpoints.md`](endpoints.md).

## Errores

Sobre de error único, con `X-Request-Id` de correlación. Detalle en
[`docs/api/errors.md`](errors.md).

## Sin proveedor de email

`Invitation` (invitar gente a una organización) es un link de un solo uso que un
ADMIN/COORDINADOR genera y comparte manualmente — no hay ningún proveedor de correo
(SendGrid, Resend, nodemailer, etc.) integrado en el proyecto. Nadie recibe un email
automático al ser invitado.
