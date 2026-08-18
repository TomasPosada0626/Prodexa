# Revision OWASP Top 10 (2021) — Prodexa

Fecha de revision: 2026-07-23 (segunda revision — la primera fue 2026-07-22, antes de
que RBAC y organizaciones multiusuario existieran; ver el historial de cambios de este
documento en el registro de commits).
Alcance: `apps/backend` (NestJS + Prisma + PostgreSQL) y `apps/frontend` (Next.js).

Esta es una revision honesta del estado actual, no una checklist marcada de mas.
Donde algo no esta cubierto, se dice explicitamente y se deja como pendiente.

## A01:2021 — Broken Access Control

**Estado: cubierto para el modelo actual (multi-tenant por organizacion, con RBAC).**

- Todas las rutas de negocio estan detras de `JwtAuthGuard`
  (`apps/backend/src/auth/jwt-auth.guard.ts`); los endpoints de mutacion que lo
  requieren agregan ademas `RolesGuard` + `@Roles('ADMIN', 'COORDINADOR')` — ver la
  matriz completa en [`docs/api/endpoints.md`](../api/endpoints.md).
- Los datos se filtran siempre por `organizationId` a nivel de query (no solo por
  `userId`, y no solo en la UI): un usuario no puede acceder ni por id directo a datos
  de otra organizacion. Dentro de la misma organizacion, `ADMIN`/`COORDINADOR` pueden
  mutar; `MIEMBRO` solo puede leer y operar el flujo de produccion.
- RBAC se evaluo y se descarto explicitamente el 2026-07-22 (cada cuenta era
  independiente en ese momento); se construyo despues cuando el modelo de negocio paso
  a requerir equipos multiusuario por empresa. Decision completa, con consecuencias, en
  [ADR-005](../adr/ADR-005-rbac-organizaciones-multiusuario.md).
- Las acciones destructivas de autoservicio (`DELETE /auth/me`, `DELETE
  /organizations`) exigen la contrasena actual del usuario como confirmacion —no
  basta con la sesion activa—. `DELETE /organizations` ademas esta restringido a
  `ADMIN` y exige re-escribir el nombre exacto de la empresa; `DELETE /auth/me` se
  bloquea si el usuario es el unico miembro activo de su organizacion, o si es
  ADMIN sin otro ADMIN activo (evita dejar un equipo sin nadie que lo administre).

## A02:2021 — Cryptographic Failures

**Estado: cubierto.**

- Contrasenas con Argon2 (`argon2.hash` / `argon2.verify` en `auth.service.ts`), no
  MD5/SHA ni texto plano.
- Refresh tokens opacos, hasheados con SHA-256 antes de guardarse en DB
  (`hashToken()` en `auth.service.ts`) — un dump de la base de datos no expone tokens
  usables directamente.
- Cookies de sesion `httpOnly` (no accesibles desde JS del navegador), `secure` en
  produccion.
- TLS/HTTPS no lo gestiona la app misma — lo termina el proveedor de hosting
  (Vercel y Render, ambos por defecto), confirmado en el despliegue real
  (ver [`docs/deployment/roadmap-despliegue.md`](../deployment/roadmap-despliegue.md)).

## A03:2021 — Injection

**Estado: cubierto.**

- Todo el acceso a datos pasa por Prisma (queries parametrizadas por diseno, sin SQL
  concatenado en ningun punto del codigo).
- `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`
  (`main.ts`) — cualquier campo no declarado en el DTO se rechaza, no se cuela a la capa
  de datos.
- El contenido enriquecido de "Preparacion" se guarda como HTML (Tiptap) y se
  renderiza con `dangerouslySetInnerHTML` en `formulacion-card.tsx`. **XSS
  almacenado — RESUELTO.** Con RBAC y organizaciones multiusuario implementados
  (ver A01, ADR-005), las formulaciones se comparten dentro de una organizacion: un
  `ADMIN`/`COORDINADOR` que guardara un payload malicioso en este campo lo habria
  ejecutado en el navegador de cualquier otro miembro que abriera esa formulacion.
  Se sanitiza con `isomorphic-dompurify` (`lib/sanitize-html.ts`, allowlist explicita
  de tags/atributos, bloquea `javascript:`) en **dos** puntos — no solo el visible:
  `formulacion-card.tsx` (`dangerouslySetInnerHTML`) y `lib/pdf.ts` (`htmlToPlainText`,
  un vector menos obvio: un `<img onerror>` se dispara al asignar `innerHTML` aunque
  el elemento nunca se adjunte al DOM visible, así que la exportación a PDF también
  era explotable). Verificado con test unitario (`sanitize-html.test.ts`: bloquea
  `<script>`, `onerror`, `onclick`, `javascript:`; conserva negrita/listas/imágenes
  propias) y con el flujo real end-to-end (`verificaciones-permanentes.spec.ts`).
- **Subida de imagenes (`/uploads/images`) valida la firma real del archivo, no solo
  el `Content-Type` declarado.** El header lo controla quien sube el archivo — es
  trivial mandar un `.html` o `.svg` con script disfrazado de `image/png`.
  `detectarMimetypeReal()` (`uploads.controller.ts`, sin dependencias externas —
  la libreria `file-type` es ESM-only e incompatible con el dynamic `import()` que
  necesita el propio suite e2e del backend bajo Jest) revisa los magic bytes del
  buffer ya recibido (PNG/JPEG/GIF/WEBP) y usa ESE resultado — no el declarado —
  para decidir si se acepta y con que extension se guarda. Verificado en vivo contra
  el backend real: un PNG de verdad se acepta, un archivo con `<script>` y
  `Content-Type: image/png` se rechaza con 400 (`uploads.controller.spec.ts` cubre
  lo mismo con buffers reales, no mocks del contenido).

## A04:2021 — Insecure Design

**Estado: cubierto en lo esencial.**

- Registro no inicia sesion automaticamente (requiere login explicito) — decision
  deliberada para evitar confusion de sesion.
- Contrasenas exigen mayuscula, minuscula, numero y caracter especial
  (`register.dto.ts`).
- Rate limiting especifico y mas estricto en `login`/`register`/`change-password`/
  `forgot-password`/`reset-password` (5/min) ademas del limite global (60/min) —
  mitiga fuerza bruta, credential stuffing y fuerza bruta contra el codigo de
  recuperacion de contrasena. El limite es configurable via `AUTH_THROTTLE_LIMIT`
  (sin esa variable, sigue siendo 5 — es el default de produccion); solo se sube en
  el job `frontend-e2e` de CI para que la suite de Playwright pueda correr completa,
  ver `docs/testing/e2e.md`.

## A05:2021 — Security Misconfiguration

**Estado: cubierto.**

- `helmet()` activo (`main.ts`) para cabeceras HTTP seguras por defecto.
- CORS restringido a un origin exacto configurado por variable de entorno, con
  `credentials: true` (no `origin: '*'`).
- Swagger (`/api/docs`) esta disponible sin autenticacion, pero solo fuera de
  produccion (`main.ts`: gateado por `NODE_ENV !== 'production'`, con opt-in
  explicito via `SWAGGER_ENABLED=true` para el caso raro de necesitarlo expuesto).
  En el Render actual (`NODE_ENV=production` seteado en el `Dockerfile`), `/api/docs`
  responde 404 por defecto.

## A06:2021 — Vulnerable and Outdated Components

**Estado: cubierto a partir de esta revision.**

- `.github/dependabot.yml` — actualizaciones semanales de dependencias npm para
  `apps/backend`, `apps/frontend`, y de las propias GitHub Actions.
- `.github/workflows/security.yml` — job `npm audit --audit-level=high --omit=dev` en
  cada push/PR a `main` y semanalmente, para ambos apps. Se excluyen devDependencies
  a proposito: herramientas como eslint/jest/`@nestjs/cli` nunca llegan al build de
  produccion ni procesan input de un atacante (solo rutas de archivos del propio
  repo), asi que una vulnerabilidad sin fix disponible ahi no debe bloquear el
  pipeline. Las dependencias que sí se despliegan (`dependencies`) se siguen
  auditando sin excepcion.

## A07:2021 — Identification and Authentication Failures

**Estado: cubierto.**

- JWT de acceso de vida corta (15 min) + refresh token rotatorio (se invalida el
  anterior en cada uso) — limita la ventana de un token robado.
- Revocacion de sesion real en logout (el refresh token queda marcado `revokedAt`, no
  solo se borra la cookie del cliente).
- Password minimo 8 caracteres con requisitos de complejidad.

## A08:2021 — Software and Data Integrity Failures

**Estado: parcial.**

- Las migraciones de Prisma estan versionadas en el repo (`prisma/migrations/`), no se
  aplican cambios de esquema fuera de ese flujo.
- **Pendiente:** no hay verificacion de integridad de artefactos de build/CI (ej.
  firma de imagenes Docker) — Render reconstruye la imagen desde el commit en cada
  push, sin un registry de imagenes con tags propios ni firma, ver
  [`docs/deployment/roadmap-despliegue.md`](../deployment/roadmap-despliegue.md).

## A09:2021 — Security Logging and Monitoring Failures

**Estado: cubierto, ampliado significativamente desde la revision anterior.**

- Tabla `AuditLog` registrando 16 tipos de evento (`AuditEvent`, ver
  [`docs/observability/audit-log.md`](../observability/audit-log.md)): login/logout/
  registro/cambio de contrasena, solicitud y confirmacion de recuperacion de
  contrasena, anulacion de lotes y pagos, cambios de rol, remocion de miembros,
  cambios de precio de ingrediente, ediciones de formulacion, cambios de tarifas de
  la organizacion, y eliminacion de cuenta/empresa (autoservicio) — con `userId`
  (cuando aplica), IP y User-Agent.
- El logging de auditoria nunca interrumpe el flujo principal si falla (se atrapa y
  se registra en el logger de la app, no se relanza) — verificado con test dedicado.
- **Ya no esta pendiente (corregido desde la revision anterior):** el cambio de
  contrasena existe y audita `CHANGE_PASSWORD`. El Dashboard tiene un widget, visible
  solo para `ADMIN`, con los ultimos intentos de login fallidos de la organizacion —
  la alerta que la revision anterior marcaba como no construida.
- Sentry (backend y frontend, ver [`docs/observability/overview.md`](../observability/overview.md))
  reporta excepciones no capturadas, pero eso es error tracking general, no un
  consumidor de eventos de seguridad especificos — un intento de login fallido no
  lanza una excepcion, asi que Sentry no lo ve.
- **Ya no esta pendiente (corregido 2026-08-18):** `AuditService.notificarSiLoginsFallidosRepetidos()`
  envia un correo a los ADMIN activos de la empresa cuando una cuenta acumula
  `FAILED_LOGIN_ALERT_THRESHOLD` (default 5) logins fallidos SEGUIDOS — ya no hace
  falta que el ADMIN entre por su cuenta a Dashboard/Auditoria para enterarse. Dispara
  exactamente una vez al cruzar el umbral (no en cada intento subsecuente, para no
  saturar de correos durante un ataque de fuerza bruta en curso), es fire-and-forget
  (nunca bloquea ni puede tumbar la respuesta de login) y usa el mismo `MailService`
  gateado por `RESEND_API_KEY` que el resto de correos transaccionales. Verificado con
  tests dedicados en `audit.service.spec.ts` (umbral exacto, corte por `LOGIN_SUCCESS`,
  sin duplicar el aviso, y que nunca lanza si algo falla).

## A10:2021 — Server-Side Request Forgery (SSRF)

**Estado: no aplica todavia.**

El backend no hace llamadas salientes a URLs provistas por el usuario (no hay
funcionalidad de "importar desde una URL", webhooks salientes, ni proxies). Se revisa
de nuevo si se agrega una funcionalidad de ese tipo.

---

## Resumen

| Categoria | Estado |
|---|---|
| A01 Broken Access Control | Cubierto (multi-tenant por organizacion, con RBAC) |
| A02 Cryptographic Failures | Cubierto |
| A03 Injection | Cubierto — XSS almacenado resuelto (DOMPurify en los 2 puntos de renderizado/parseo) |
| A04 Insecure Design | Cubierto |
| A05 Security Misconfiguration | Cubierto — Swagger deshabilitado en produccion por defecto |
| A06 Vulnerable and Outdated Components | Cubierto (Dependabot + npm audit en CI) |
| A07 Identification and Authentication Failures | Cubierto |
| A08 Software and Data Integrity Failures | Parcial (sin firma de imagenes ni registry versionado) |
| A09 Security Logging and Monitoring Failures | Cubierto, 16 tipos de evento, con notificacion proactiva por correo a ADMIN ante logins fallidos repetidos |
| A10 SSRF | No aplica hoy |

**Proxima revision recomendada:** si se agrega una funcionalidad que haga llamadas
salientes a URLs provistas por el usuario (A10 dejaria de ser "no aplica"), o si se
automatiza el deploy de forma que el resultado de CI pueda bloquearlo (A08).
