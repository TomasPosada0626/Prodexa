# Bitácora de auditoría

`AuditLog` (tabla) + `AuditService` (global, inyectable en cualquier módulo) — no es
solo seguridad de cuenta, cubre eventos de negocio también. Endpoint de solo lectura:
`GET /audit-log`, ADMIN únicamente.

## Los 12 eventos (`AuditEvent`, `apps/backend/src/audit/audit.types.ts`)

| Evento | Cuándo se registra |
|---|---|
| `LOGIN_SUCCESS` | Login correcto |
| `LOGIN_FAILED` | Login fallido — con `userId` si el correo corresponde a una cuenta real, para que sea visible en el widget de seguridad del Dashboard |
| `LOGOUT` | Cierre de sesión explícito |
| `REGISTER` | Cuenta nueva creada |
| `CHANGE_PASSWORD` | Contraseña cambiada |
| `PRODUCTION_ORDER_DELETED` | Un lote de producción fue anulado |
| `PAGO_DELETED` | Un abono fue eliminado |
| `MEMBER_ROLE_CHANGED` | El rol de un miembro cambió |
| `MEMBER_REMOVED` | Un miembro fue removido del equipo |
| `INGREDIENT_PRICE_UPDATED` | El precio de un ingrediente se actualizó |
| `FORMULATION_UPDATED` | Una formulación fue editada |
| `ORGANIZATION_SETTINGS_UPDATED` | Tarifas o gastos generales de la organización cambiaron |

Cada fila guarda `userId` (nullable), `ip`, `userAgent`, un `metadata` JSON libre
(forma distinta según el evento — precio anterior/nuevo, rol anterior/nuevo, etc.) y
`createdAt`. La UI de Auditoría muestra una columna "Detalle" que interpreta ese
`metadata` según el tipo de evento.

## Garantía: nunca bloquea el flujo principal

`AuditService.log()` atrapa sus propios errores y los loguea, pero **nunca los
relanza** — si escribir un evento de auditoría falla (ej. la base de datos está
momentáneamente sobrecargada), el login/logout/edición que lo disparó no se ve
afectado. Verificado con test dedicado.

## `LOGIN_FAILED` y a quién se atribuye

Un intento de login fallido contra un correo que **no existe** no tiene ningún usuario
al cual atribuirse — el evento se guarda con `userId: null` y queda fuera de
`listForOrganization` (no hay organización a la cual asociarlo). Un intento fallido
contra un correo que **sí existe** (contraseña incorrecta) se resuelve al `userId` de
esa cuenta antes de loguear, específicamente para que sea visible en la bitácora de su
organización y en el widget de alertas de seguridad del Dashboard (solo ADMIN).
