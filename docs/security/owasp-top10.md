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

## A02:2021 — Cryptographic Failures

**Estado: cubierto.**

- Contrasenas con Argon2 (`argon2.hash` / `argon2.verify` en `auth.service.ts`), no
  MD5/SHA ni texto plano.
- Refresh tokens opacos, hasheados con SHA-256 antes de guardarse en DB
  (`hashToken()` en `auth.service.ts`) — un dump de la base de datos no expone tokens
  usables directamente.
- Cookies de sesion `httpOnly` (no accesibles desde JS del navegador), `secure` en
  produccion.
- **Pendiente:** no hay TLS/HTTPS gestionado por la app misma (se asume terminado por
  el proveedor de hosting en produccion) — a confirmar en el momento del despliegue real.

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

**Estado: cubierto, con una nota.**

- `helmet()` activo (`main.ts`) para cabeceras HTTP seguras por defecto.
- CORS restringido a un origin exacto configurado por variable de entorno, con
  `credentials: true` (no `origin: '*'`).
- Swagger (`/api/docs`) esta disponible sin autenticacion. Es aceptable en desarrollo;
  **antes de exponer produccion publicamente, evaluar si Swagger debe protegerse o
  deshabilitarse fuera de desarrollo.**

## A06:2021 — Vulnerable and Outdated Components

**Estado: cubierto a partir de esta revision.**

- `.github/dependabot.yml` — actualizaciones semanales de dependencias npm para
  `apps/backend`, `apps/frontend`, y de las propias GitHub Actions.
- `.github/workflows/security.yml` — job `npm audit --audit-level=high` en cada push/PR
  a `main` y semanalmente, para ambos apps.

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

- Tabla `AuditLog` registrando 12 tipos de evento (`AuditEvent`, ver
  [`docs/observability/audit-log.md`](../observability/audit-log.md)): login/logout/
  registro/cambio de contrasena, anulacion de lotes y pagos, cambios de rol, remocion
  de miembros, cambios de precio de ingrediente, ediciones de formulacion y cambios de
  tarifas de la organizacion — con `userId` (cuando aplica), IP y User-Agent.
- El logging de auditoria nunca interrumpe el flujo principal si falla (se atrapa y
  se registra en el logger de la app, no se relanza) — verificado con test dedicado.
- **Ya no esta pendiente (corregido desde la revision anterior):** el cambio de
  contrasena existe y audita `CHANGE_PASSWORD`. El Dashboard tiene un widget, visible
  solo para `ADMIN`, con los ultimos intentos de login fallidos de la organizacion —
  la alerta que la revision anterior marcaba como no construida.
- **Pendiente real:** no hay un consumidor automatizado que dispare una notificacion
  proactiva (email, Slack) ante N logins fallidos seguidos — el ADMIN tiene que entrar
  al Dashboard o a Auditoria para verlo, no se le avisa solo.

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
| A05 Security Misconfiguration | Cubierto, con nota sobre Swagger en produccion |
| A06 Vulnerable and Outdated Components | Cubierto (Dependabot + npm audit en CI) |
| A07 Identification and Authentication Failures | Cubierto |
| A08 Software and Data Integrity Failures | Parcial (sin firma de imagenes ni registry versionado) |
| A09 Security Logging and Monitoring Failures | Cubierto, 12 tipos de evento; sin notificacion proactiva |
| A10 SSRF | No aplica hoy |

**Proxima revision recomendada:** cuando se active branch protection con status checks
obligatorios en GitHub (paso manual pendiente, ver [`CONTRIBUTING.md`](../../CONTRIBUTING.md)).
