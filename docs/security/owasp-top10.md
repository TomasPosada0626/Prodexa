# Revision OWASP Top 10 (2021) — Prodexa

Fecha de revision: 2026-07-22
Alcance: `apps/backend` (NestJS + Prisma + PostgreSQL) y `apps/frontend` (Next.js).

Esta es una revision honesta del estado actual, no una checklist marcada de mas.
Donde algo no esta cubierto, se dice explicitamente y se deja como pendiente.

## A01:2021 — Broken Access Control

**Estado: cubierto para el modelo actual (single-tenant por cuenta).**

- Todas las rutas de `formulations` y `simulations` estan detras de `JwtAuthGuard`
  (`apps/backend/src/auth/jwt-auth.guard.ts`).
- Los datos se filtran siempre por `userId` a nivel de query
  (`formulations.service.ts`: `findFirst({ where: { id, userId } })`), no solo en la UI —
  un usuario no puede acceder ni por id directo a datos de otro usuario.
- **Pendiente, por decision de producto:** no hay RBAC por roles (admin/usuario). Se
  evaluo y se decidio explicitamente no implementarlo por ahora — cada cuenta es
  independiente y ve solo sus propios datos, sin necesidad de roles todavia.

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
  renderiza con `dangerouslySetInnerHTML` en el frontend. **Riesgo real de XSS
  almacenado**: hoy no hay sanitizacion del HTML antes de guardarlo ni antes de
  renderizarlo. Como el HTML solo lo escribe el propio dueno de la formulacion sobre
  sus propios datos (no hay contenido de terceros ni multi-usuario compartiendo
  formulaciones), el impacto practico hoy es bajo (un usuario solo podria "atacarse a
  si mismo"), pero **si en el futuro las formulaciones se comparten entre usuarios,
  esto pasa a ser critico y hay que sanitizar (ej. DOMPurify) antes de ese cambio.**

## A04:2021 — Insecure Design

**Estado: cubierto en lo esencial.**

- Registro no inicia sesion automaticamente (requiere login explicito) — decision
  deliberada para evitar confusion de sesion.
- Contrasenas exigen mayuscula, minuscula, numero y caracter especial
  (`register.dto.ts`).
- Rate limiting especifico y mas estricto en `login`/`register` (5/min) ademas del
  limite global (60/min) — mitiga fuerza bruta y credential stuffing basico.

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
  firma de imagenes Docker) — aplica mas quando exista pipeline de despliegue continuo
  (Fase 8 del checklist, todavia no iniciada).

## A09:2021 — Security Logging and Monitoring Failures

**Estado: cubierto para eventos de cuenta, a partir de esta revision.**

- Nueva tabla `AuditLog` (`schema.prisma`) registrando `LOGIN_SUCCESS`, `LOGIN_FAILED`,
  `LOGOUT` y `REGISTER`, con `userId` (cuando aplica), IP y User-Agent
  (`AuditService`, enganchado en `AuthController`).
- El logging de auditoria nunca interrumpe el flujo principal si falla (se atrapa y
  se registra en el logger de la app, no se relanza) — evita que un fallo de auditoria
  tumbe un login legitimo.
- **Pendiente:** no audita cambios de contrasena (la funcionalidad de "cambiar
  contrasena" en si misma todavia no existe — hoy esta marcada "Proximamente" en el
  menu de perfil). Cuando se construya, debe engancharse al mismo `AuditService`.
- **Pendiente:** no hay alertas activas ni dashboard sobre estos eventos (ej. aviso
  ante N logins fallidos seguidos) — los datos ya se capturan, pero no hay consumidor
  automatizado todavia.

## A10:2021 — Server-Side Request Forgery (SSRF)

**Estado: no aplica todavia.**

El backend no hace llamadas salientes a URLs provistas por el usuario (no hay
funcionalidad de "importar desde una URL", webhooks salientes, ni proxies). Se revisa
de nuevo si se agrega una funcionalidad de ese tipo.

---

## Resumen

| Categoria | Estado |
|---|---|
| A01 Broken Access Control | Cubierto (para el alcance actual) |
| A02 Cryptographic Failures | Cubierto |
| A03 Injection | Cubierto, con riesgo XSS documentado a vigilar si se comparten formulaciones |
| A04 Insecure Design | Cubierto |
| A05 Security Misconfiguration | Cubierto, con nota sobre Swagger en produccion |
| A06 Vulnerable and Outdated Components | Cubierto (Dependabot + npm audit en CI) |
| A07 Identification and Authentication Failures | Cubierto |
| A08 Software and Data Integrity Failures | Parcial (aplica mas en Fase 8, CD) |
| A09 Security Logging and Monitoring Failures | Cubierto para eventos de cuenta; sin alertas aun |
| A10 SSRF | No aplica hoy |

**Proxima revision recomendada:** cuando se implemente cambio de contrasena, cuando
se decida si las formulaciones se comparten entre usuarios (por el riesgo XSS de A03),
y antes de habilitar CD real a produccion (Fase 8).
