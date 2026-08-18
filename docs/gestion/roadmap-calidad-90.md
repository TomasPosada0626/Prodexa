# Hoja de ruta — subir la auditoría de calidad (sin gastar dinero)

Punto de partida: la autoevaluación del [README](../../README.md#auditoría-de-calidad-de-software) —
82/100 (B+) el 18 de agosto de 2026, contra los 13 atributos de calidad de software. Este
documento traduce cada brecha identificada ahí en acciones concretas, ordenadas por qué tan
rápido se pueden ejecutar y **quién** las ejecuta — subir una nota no siempre es una tarea
de ingeniería.

**Actualización 2026-08-18:** Cumplimiento legal ya se resolvió — asesoría legal externa
revisó Términos y Política de Datos el 14 de agosto de 2026 y aprobó el texto sin cambios
(ver la nota de transparencia en el [README](../../README.md#cumplimiento-legal-y-privacidad-de-datos)
y el comentario de cabecera de cada página en `apps/frontend/src/app/legal/`). Cumplimiento
legal pasa de 80 a **93**. Es el único ítem de la Fase 3 que ya no está diferido.

**Actualización 2026-08-18 (2):** ítem 1.1 (Testability) también hecho — tests reales para
`forecast.ts` y `sugerencias.ts` (0% → 100%/93% statements) y `coverage.thresholds` real en
`apps/frontend/vitest.config.ts` (≥90% statements/lines, ≥80% functions, ≥75% branches).
Cobertura del frontend pasó de 40.7% a 93.8% de statements. Testability pasa de 85 a **92**.

**Actualización 2026-08-18 (3):** ítem 1.2 (Escalabilidad/Rendimiento) también hecho —
prueba de carga real contra la ruta de negocio real (`POST /simulations`: auth + Postgres +
cálculo), no un mock. 720 req/s sostenidas a concurrencia normal, cero errores incluso a
5x la concurrencia (100 conexiones) — el sistema degrada con latencia, nunca se cae.
Encontró un cuello de botella real y todavía sin arreglar: el pool de conexiones de
`pg`/Prisma no tiene un `max` configurado, así que a alta concurrencia las peticiones se
encolan en vez de escalar (justo lo que el ítem 1.5 va a atacar con estos datos). Detalle
completo en [`docs/testing/load-testing.md`](../testing/load-testing.md). Escalabilidad y
Rendimiento pasan de 72/73 a **85/85** — ni el 90 que hubiera dado un resultado perfecto, ni
el estancamiento de "sin medir": un número con evidencia real y un pendiente concreto.

Con los tres ítems ya hechos, la nota de hoy sube de 82 a **~85/100**.

## Decisión: mientras el proyecto sea portafolio/pre-ingresos, gasto real = US$0

Confirmado 2026-08-18: no se gasta dinero para subir esta nota. Eso saca del alcance
activo todo lo que dependía de pagar algo (plan de hosting sin cold start, abogado,
pentest profesional) — queda documentado como **Fase 3, diferida**, no como una tarea
pendiente de esta semana. Se retoma cuando exista el primer cliente real pagando (que es,
de hecho, el mismo umbral que ya fijan los propios Términos y Condiciones para necesitar
la revisión legal real).

**Techo real de la nota general sin gastar nada: ~89/100 (B+ alto).** No 90+ redondo, por
un solo pilar con un límite estructural que ningún truco gratuito cierra del todo:

- **Disponibilidad** (65 → 78 como máximo gratis): un monitor de uptime + un ping de
  "keep-warm" reducen cold starts en horario de uso, pero no eliminan que Render duerma
  el plan gratuito. Cerrar esto de verdad (78 → 92) requiere un plan pago o mudar la
  infraestructura a otro proveedor con always-on gratuito real (ej. VM "Always Free" de
  Oracle Cloud) — que no es una tarea de una tarde, es un proyecto de migración aparte
  con su propio costo operativo (parches de SO, TLS, monitoreo propios). No se persigue
  ahora.

## Cómo leer las fases

| Fase | Qué significa | Quién ejecuta |
|---|---|---|
| **1 — Motor propio** | Solo ingeniería, US$0, ejecutable ya | Desarrollo |
| **2 — Barato pero externo** | Cuenta/servicio de terceros en su capa gratuita | Desarrollo + una cuenta nueva |
| **3 — Diferida** | Dinero real y/o tiempo de un tercero — **fuera del alcance activo** mientras el proyecto no tenga ingresos | Vos, cuando aplique |

## Proyección (solo Fases 1 y 2 — lo único activo)

| | Hoy | Después de Fase 1 | Después de Fase 2 (techo sin gastar) |
|---|:---:|:---:|:---:|
| Nota general | **85 (B+)** — Legal, Testability y Escalabilidad/Rendimiento ya hechos | ~87 | **~89 (B+ alto)** |

Cifras estimadas por pilar, no una promesa exacta — algunas dependen del resultado real de
una prueba de carga que todavía no corrió. El objetivo de este documento no es "maquillar"
la nota: es que cada punto que suba tenga evidencia real detrás, igual que el resto de la
autoevaluación.

## Fase 1 — motor propio

| # | Pilar | Acción | Hoy → meta | Entregable |
|---|---|---|:---:|---|
| ~~1.1~~ | ~~Testability~~ | ~~Tests para `forecast.ts` y `sugerencias.ts` (0% de cobertura) + `coverageThreshold` real en `apps/frontend/vitest.config.ts`~~ | ~~85 → 92~~ | **Hecho — 16 tests nuevos, cobertura de `src/lib/` 40.7%→93.8% statements, gate real agregado** |
| ~~1.2~~ | ~~Escalabilidad / Rendimiento~~ | ~~Script de carga (autocannon) contra el backend real, corrido de verdad, con resultados publicados~~ | ~~72 / 73 → 85 / 85~~ | **Hecho — `docs/testing/load-testing.md`: 720 req/s, 0 errores a 5x concurrencia, cuello de botella real encontrado (pool de conexiones sin `max`)** |
| 1.3 | Monitoreabilidad | Alerta proactiva (correo al ADMIN) tras N logins fallidos seguidos — el pendiente que ya señalaba `docs/security/owasp-top10.md` (A09) | 78 → 85 | Feature real + test, no solo documentación |
| 1.4 | Compatibilidad | Política de versionado/deprecación de la API documentada + test de snapshot del schema OpenAPI (evita romper el contrato sin darse cuenta) | 80 → 88 | `docs/api/versioning.md` + test en CI |
| 1.5 | Eficiencia de recursos | Medir y documentar tamaño real de las imágenes Docker + ajustar el pool de conexiones de Prisma/pg con datos, no con el default sin revisar | 84 → 89 | `docs/deployment/` actualizado con números reales |
| 1.6 | Fiabilidad | Retry con backoff en las operaciones de Prisma que fallan por error transitorio de conexión — el mismo tipo de fallo que causó el incidente #1 de `docs/observability/known-gaps.md` | 87 → 90 | Código + test dedicado |
| 1.7 | Seguridad | Correr un scan automatizado (OWASP ZAP baseline) contra el ambiente real y documentar el resultado | 90 → 94 | Reporte nuevo en `docs/security/` |

## Fase 2 — barato pero externo

| # | Pilar | Acción | Hoy → meta | Entregable |
|---|---|---|:---:|---|
| 2.1 | Disponibilidad | Monitor de uptime gratuito (UptimeRobot / Better Stack) sobre `/health` + un ping de "keep-warm" cada ~10 min en horario laboral (GitHub Actions programado) | 65 → 78 | Reduce cold starts en horario de uso real; no elimina el problema de fondo (ver 3.1) |
| 2.2 | Usabilidad | Pase manual con lector de pantalla (NVDA o VoiceOver) en Login, Registro, Dashboard y Formulaciones — el automatizado (axe-core) no sustituye esto | 82 → 88 | Checklist + issues de lo que encuentre |

## Fase 3 — diferida, no activa (cuesta dinero real)

No se ejecuta mientras el proyecto sea portafolio/pre-ingresos, salvo que ya se haya hecho
por fuera del ritmo de esta hoja de ruta (ver 3.2).

| # | Pilar | Acción | Hoy → meta | Quién decide |
|---|---|---|:---:|---|
| 3.1 | Disponibilidad | Mover el backend a un plan de Render sin cold start (ej. Starter, ~US$7/mes) | 78 → 92 | Vos — gasto recurrente |
| ~~3.2~~ | ~~Cumplimiento legal~~ | ~~Revisión real de un abogado colombiano sobre Términos y Política de Datos~~ | ~~80 → 93~~ | **Hecho — 2026-08-14, asesoría legal externa aprobó el texto sin cambios** |
| 3.3 | Seguridad | Pentest externo profesional (o al menos una cotización) | 94 → 97 | Vos — presupuesto |

## Pilares que ya están en 90+ (sin acción pendiente)

| Pilar | Nota | Nota |
|---|:---:|---|
| Mantenibilidad | 93 | El más fuerte del proyecto — mantenerlo así con cada feature nueva es la única "acción". |
| Portabilidad | 92 | Ya probado en 2 nubes distintas — no hay una brecha real que cerrar. |

## Lo que NO vamos a perseguir todavía, y por qué

Mismo criterio que ya usa el proyecto en [`docs/observability/overview.md`](../observability/overview.md) — no construir infraestructura sin un caso de uso real:

- **Prometheus/Grafana / métricas técnicas.** Sin tráfico real que monitorear es infraestructura especulativa. Techo real de Monitoreabilidad hasta entonces: ~85 (ver 1.3). Se revisa cuando haya usuarios reales usando la plataforma a diario.
- **Múltiples instancias / balanceo de carga.** No tiene sentido decidirlo antes de saber si una sola instancia aguanta la carga real — por eso 1.2 va primero, no después.
- **Certificación de compatibilidad hacia consumidores externos de la API.** Hoy no existen integradores externos. Documentar una política de versionado (1.4) es lo máximo que se puede hacer sin ellos; el techo real de Compatibilidad (~88) sube solo cuando exista al menos un consumidor real poniendo el contrato a prueba.

## Seguimiento

Cada fila de este documento se convierte en un issue de GitHub cuando arranca (ver
[`gobernanza_tecnica.md`](gobernanza_tecnica.md) y
[`milestones_y_kanban.md`](milestones_y_kanban.md) para el flujo). Cuando una acción se
completa, se actualiza también la fila correspondiente en la tabla de
[Auditoría de calidad de software](../../README.md#auditoría-de-calidad-de-software) del
README — la nota que vive ahí debe reflejar siempre el estado real del código, nunca esta
hoja de ruta aspiracional.
