# Módulos de Prodexa

> El mapa de módulos evolucionó respecto al diseño inicial (`users`, `ingredients`,
> `costing`, `pricing`, `dashboard`), ajustado a los límites de contexto reales que
> emergieron durante la construcción. Este documento describe los módulos vigentes en
> `apps/backend/src/`.

## Módulos del backend (NestJS, planos — sin capas domain/application/infrastructure)

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `auth` | Registro, login, refresh rotatorio, logout, perfil, cambio de contraseña, sesiones activas | `prisma`, `audit` |
| `organizations` | Miembros, roles, invitaciones, tarifas/gastos generales de la empresa | `prisma`, `audit` |
| `formulations` | CRUD de formulaciones, ingredientes, historial de precios, historial de versiones, archivar/reactivar | `prisma`, `audit` |
| `production` | Órdenes de producción (lotes), máquina de estados de calidad, pagos/abonos | `prisma`, `formulations` (relación) |
| `suppliers` | CRUD de proveedores | `prisma` |
| `audit` | `AuditService` (global) y el endpoint de solo lectura `/audit-log` (ADMIN) | `prisma` |
| `simulation` | Motor de costeo puro (`SimulationService.calculate`) | ninguno (sin estado) |
| `uploads` | Subida de imágenes para el editor de preparación | filesystem local |
| `health` | `/health` (liveness) y `/ready` (readiness contra Postgres) | `prisma` |
| `prisma` | `PrismaService` compartido, inyectable en cualquier módulo | — |
| `common` | Filtro de excepciones, logger pino, utilidades transversales | — |

**Dónde quedaron los conceptos del plan original:** "ingredients" vive dentro de
`formulations` (un `Ingredient` siempre pertenece a una `Formulation`, nunca existe
suelto); "costing"/"pricing" es el módulo `simulation` en el backend y su espejo
`lib/costing.ts` en el frontend (misma fórmula, nunca dos implementaciones); "dashboard"
nunca fue un módulo de backend — es una página del frontend que combina datos de varios
endpoints existentes, no tiene lógica de negocio propia que justifique un módulo.

## Contexto `formulations` (núcleo del dominio)

Responsable de:
- Crear/editar una formulación: nombre, categoría, registro sanitario y su vencimiento,
  preparación (HTML enriquecido), cantidad base, margen e impuesto por defecto.
- Ingredientes con porcentaje, gramos/kg derivados y precio.
- Historial de versiones (`FormulationVersion`, snapshot JSON completo en cada edición).
- Historial de precios por ingrediente (`SupplierPrice`), independiente del historial
  de versiones — responde "cuánto costaba este insumo en el tiempo", no "cómo era la
  formulación completa en el tiempo".
- Archivar (`activa = false`) en vez de permitir borrar una formulación con lotes de
  producción ya registrados.

## Contexto `production`

Responsable de:
- Escalar una formulación a una cantidad objetivo y calcular el costo real del lote.
- Persistir cada lote como `ProductionOrder`, con su propio snapshot de costo/precio/
  utilidad al momento de crearse (no se recalcula retroactivamente si la formulación
  cambia después).
- La máquina de estados de `estadoProduccion` (ver
  [`docs/diagrams/estado-produccion-uml.md`](../diagrams/estado-produccion-uml.md)):
  control de calidad obligatorio antes de `TERMINADO`, un paso de retroceso permitido.
- Pagos/abonos parciales contra un lote (`Pago`), que determinan `estadoPago`.

## Contexto `organizations`

Responsable de:
- La empresa (`Organization`) dueña de todas las formulaciones/órdenes/proveedores.
- Roles por usuario (`ADMIN`/`COORDINADOR`/`MIEMBRO`) vía `RolesGuard` + `@Roles()`.
- Invitaciones de un solo uso, con rol asignado y expiración a 7 días — sin envío de
  correo automático, es un link para compartir manualmente (no hay proveedor de email
  configurado en el proyecto).
- Tarifas de mano de obra/energía y gastos generales mensuales, usadas por
  `production` para calcular costos operativos automáticamente.

## Contratos entre contextos

- `formulations` expone los datos base que `production` escala a un lote real.
- `production` y `simulation` comparten la misma fórmula de costeo (`SimulationService`
  en el backend, `lib/costing.ts` en el frontend) — ningún lugar la reimplementa.
- `audit` registra eventos de todos los demás módulos (login, cambios de rol, cambios
  de precio, ediciones de formulación, etc.) sin que un fallo suyo pueda tumbar el
  flujo que lo llamó.
- `organizations` es transversal: `organizationId` aparece en `User`, `Formulation`,
  `ProductionOrder`, `Supplier` e `Invitation` — es el mecanismo real de multi-tenancy.
