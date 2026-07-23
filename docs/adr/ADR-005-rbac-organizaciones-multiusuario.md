# ADR-005 RBAC y organizaciones multiusuario (reversión de ADR previa implícita)

## Estado
Aceptado — supersede la decisión registrada en la Fase 4.2 del checklist local
(`CHECKLIST_EJECUCION_PRODEXA_LOCAL.md`, 2026-07-22).

## Contexto

El 2026-07-22, durante la Fase 4 (seguridad empresarial), se evaluó agregar RBAC por
roles (admin/usuario) y se decidió explícitamente **no implementarlo**: en ese momento
cada cuenta era independiente y veía solo sus propios datos (`Formulation.userId`),
sin necesidad real de compartir formulaciones entre usuarios distintos. Agregar roles
sin un caso de uso real habría sido complejidad especulativa — la misma decisión que
ya se había tomado, por ejemplo, con Redis o con Prometheus/Grafana.

Ese supuesto dejó de ser cierto: el modelo de negocio evolucionó a que una **empresa**
(no un usuario individual) es la unidad real de la plataforma — varias personas del
mismo negocio necesitan ver y editar las mismas formulaciones, con distintos niveles de
permiso (quien administra la cuenta, quien coordina producción, quien solo consulta).

## Decisión

Se construyó:
- `Organization`: la empresa dueña de formulaciones, órdenes de producción,
  proveedores e invitaciones. `organizationId` reemplazó a `userId` como el filtro
  real de aislamiento en casi todas las queries.
- `rol` en `User`: `ADMIN` | `COORDINADOR` | `MIEMBRO`. ADMIN y COORDINADOR pueden
  crear/editar/eliminar (formulaciones, proveedores, tarifas de la organización,
  órdenes de producción); MIEMBRO solo puede ver y operar el flujo de producción
  (Preparar), sin gestionar configuración de la empresa.
- `RolesGuard` + `@Roles(...)` decorando los endpoints de mutación que lo requieren;
  las lecturas quedan abiertas a cualquier miembro autenticado de la organización.
- `Invitation`: link de un solo uso, con rol asignado y expiración a 7 días, para que
  un ADMIN/COORDINADOR sume gente a su organización sin necesidad de un proveedor de
  email (no hay ninguno configurado en el proyecto).

## Consecuencias

**Positivas:**
- El caso de uso real (equipos, no solo cuentas individuales) queda resuelto sin
  necesidad de rediseñar el modelo de datos más adelante.
- El aislamiento por organización es más simple de razonar que un modelo de
  permisos compartidos ad-hoc entre usuarios individuales.

**Negativas / a vigilar:**
- **El riesgo de XSS en `preparacionHtml` pasó de hipotético a real.** Antes de este
  cambio, `docs/security/owasp-top10.md` (A03) documentaba que el HTML enriquecido de
  la preparación de una formulación solo lo veía su propio dueño — "un usuario solo
  podría atacarse a sí mismo". Ahora que las formulaciones se comparten dentro de una
  organización, un ADMIN o COORDINADOR que guarde un payload malicioso en ese campo lo
  ejecutaría en el navegador de cualquier otro miembro que abra esa formulación. No hay
  ninguna librería de sanitización (DOMPurify o similar) en el código hoy. Esto queda
  re-calificado y con un siguiente paso concreto en
  [`docs/security/owasp-top10.md`](../security/owasp-top10.md#a032021--injection).
- La matriz de permisos (qué rol puede hacer qué, endpoint por endpoint) necesita
  mantenerse actualizada a mano cada vez que se agrega un endpoint de mutación nuevo —
  no hay un mecanismo automático que la derive del código. Ver
  [`docs/api/endpoints.md`](../api/endpoints.md) para la matriz actual.

## Lección

No se reescribió la decisión original de "no RBAC" para que pareciera que siempre se
supo que iba a hacer falta — se documenta el cambio de rumbo completo, con su fecha y
su motivo real, siguiendo el mismo criterio de honestidad que ya tenía
`docs/security/owasp-top10.md` ("una revisión honesta del estado actual, no una
checklist marcada de más").
