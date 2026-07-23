# Referencia de endpoints

Todas las rutas viven bajo `/api/v1` salvo `health`. "Rol" es el mínimo requerido —
vacío significa que cualquier usuario autenticado de la organización puede llamarlo
(incluido `MIEMBRO`). Request/response completos: Swagger en `/api/docs`.

## `health` (sin prefijo `/api/v1`, sin autenticación)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Liveness — no depende de nada externo |
| GET | `/ready` | Readiness — valida `SELECT 1` contra Postgres real, 503 si falla |

## `auth`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/auth/register` | público | Crea la cuenta (empresa nueva o vía invitación). No inicia sesión. |
| POST | `/auth/login` | público | Login. Emite cookies `access_token`/`refresh_token`. Throttle 5/min. |
| POST | `/auth/refresh` | cookie de refresh | Rota el refresh token, emite un access token nuevo. |
| POST | `/auth/logout` | autenticado | Revoca el refresh token activo, limpia cookies. |
| GET | `/auth/me` | autenticado | Perfil del usuario actual. |
| PATCH | `/auth/me` | autenticado | Actualiza nombre/margen por defecto. |
| POST | `/auth/change-password` | autenticado | Cambia contraseña. Throttle 5/min. Audita `CHANGE_PASSWORD`. |
| GET | `/auth/sessions` | autenticado | Lista sesiones activas (refresh tokens vigentes), marca cuál es la actual. |
| DELETE | `/auth/sessions/:id` | autenticado | Revoca una sesión específica. |

## `organizations`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/organizations/members` | — | Lista el equipo de la organización. |
| PATCH | `/organizations/settings` | ADMIN, COORDINADOR | Tarifas de mano de obra/energía, gasto general mensual. |
| PATCH | `/organizations/members/:id/role` | ADMIN, COORDINADOR | Cambia el rol de un miembro. Audita `MEMBER_ROLE_CHANGED`. |
| DELETE | `/organizations/members/:id` | ADMIN, COORDINADOR | Remueve un miembro (soft: `activo = false`). Audita `MEMBER_REMOVED`. |
| POST | `/organizations/invitations` | ADMIN, COORDINADOR | Genera un link de invitación (7 días, un solo uso). |
| GET | `/organizations/invitations` | ADMIN, COORDINADOR | Lista invitaciones pendientes. |
| DELETE | `/organizations/invitations/:id` | ADMIN, COORDINADOR | Revoca una invitación. |

## `formulations`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/formulations` | ADMIN, COORDINADOR | Crea formulación. Audita `FORMULATION_UPDATED` en ediciones posteriores. |
| GET | `/formulations` | — | Lista (filtra `activa=true` salvo `?incluirArchivadas=true`). |
| GET | `/formulations/:id` | — | Detalle. |
| PATCH | `/formulations/:id` | ADMIN, COORDINADOR | Edita (o archiva/reactiva con `activa`). |
| DELETE | `/formulations/:id` | ADMIN, COORDINADOR | Bloquea si hay órdenes de producción asociadas. |
| PATCH | `/formulations/:id/ingredients/:ingredientId/price` | ADMIN, COORDINADOR | Actualiza precio, registra `SupplierPrice`. Audita `INGREDIENT_PRICE_UPDATED`. |
| GET | `/formulations/:id/ingredients/:ingredientId/price-history` | — | Historial de precios del ingrediente. |
| GET | `/formulations/:id/versions` | — | Snapshots de `FormulationVersion`. |

## `production-orders`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/production-orders` | — | Registra un lote (valida la máquina de estados si se manda `estadoProduccion`). |
| GET | `/production-orders` | — | Lista (filtra por `formulationId` opcional). |
| PATCH | `/production-orders/:id` | — | Edita costos/estado. Valida `TRANSICIONES_ESTADO_PRODUCCION`. |
| DELETE | `/production-orders/:id` | ADMIN, COORDINADOR | Anula el lote. Audita `PRODUCTION_ORDER_DELETED`. |
| POST | `/production-orders/:id/pagos` | — | Registra un abono. |
| GET | `/production-orders/:id/pagos` | — | Lista abonos del lote. |
| DELETE | `/production-orders/:id/pagos/:pagoId` | ADMIN, COORDINADOR | Elimina un abono. Audita `PAGO_DELETED`. |

## `simulations`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/simulations` | — | Calcula costo/precio/utilidad sin persistir nada (motor de costeo puro). |

## `suppliers`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/suppliers` | — | Lista proveedores con su historial de precios aplanado. |
| POST | `/suppliers` | ADMIN, COORDINADOR | Crea proveedor. |
| PATCH | `/suppliers/:id` | ADMIN, COORDINADOR | Renombra. |
| DELETE | `/suppliers/:id` | ADMIN, COORDINADOR | Elimina (el historial de precios se conserva vía `SetNull`). |

## `audit-log`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/audit-log` | ADMIN | Bitácora de seguridad y negocio de la organización, más reciente primero. |

## `uploads`

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/uploads/images` | autenticado | Sube una imagen para el editor de preparación de formulaciones. |
