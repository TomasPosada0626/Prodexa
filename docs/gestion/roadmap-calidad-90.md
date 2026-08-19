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

**Actualización 2026-08-18 (4):** ítem 1.3 (Monitoreabilidad) también hecho — alerta
proactiva real: `AuditService.notificarSiLoginsFallidosRepetidos()` avisa por correo a los
ADMIN activos de la empresa al cruzar N logins fallidos seguidos (default 5, configurable
via `FAILED_LOGIN_ALERT_THRESHOLD`), justo el pendiente que ya señalaba
`docs/security/owasp-top10.md` (A09). Dispara una sola vez por racha (no satura de correos
en medio de un ataque de fuerza bruta), fire-and-forget, y con 8 tests nuevos cubriendo el
umbral exacto, el corte por login exitoso, y que nunca tumba el login si algo falla.
Monitoreabilidad pasa de 78 a **85**.

**Actualización 2026-08-18 (5):** ítem 1.4 (Compatibilidad) también hecho —
[`docs/api/versioning.md`](../api/versioning.md) fija qué cuenta como cambio compatible
vs incompatible y qué se haría el día que exista un `v2`, y
`apps/backend/test/api-schema.e2e-spec.ts` respalda esa política con un test real: genera
el schema OpenAPI en runtime (el mismo que sirve `/api/docs`) y lo compara contra un
snapshot committeado — si alguien cambia un DTO o un endpoint sin darse cuenta, CI falla
con un diff legible del contrato roto. Compatibilidad pasa de 80 a **88**.

Con los cinco ítems ya hechos, la nota de hoy sube de 82 a **~86/100**.

## Pausa de sesión — 2026-08-18, retomar desde acá

La máquina quedó saturada (~10 contenedores de otro proyecto corriendo en paralelo, más
todo lo de hoy) y el build de Docker del ítem 1.5 falló por timeout de red
(`ECONNRESET` en `npm ci`, no un error de código) tras 52 minutos. Se cierra la terminal
para liberar recursos. Estado exacto para retomar sin perder contexto:

- **1.1, 1.2, 1.3, 1.4 y el ítem legal (3.2): hechos, committeados y pusheados.** Nota de
  hoy real en `main`: ~86/100.
- **1.5 (Eficiencia de recursos), a medio hacer:**
  - ✅ **Committeado y pusheado** (2026-08-18, commit `783f672`):
    `apps/backend/src/prisma/prisma.service.ts` — agrega `max` explícito al pool de
    `pg`/Prisma (`DATABASE_POOL_MAX`, default 20, ver el comentario en el código para el
    razonamiento) — y `apps/backend/.env.example` documentando la variable nueva.
  - ⚠️ Se intentó comparar el pool nuevo (20) contra el default viejo (~10) con
    `apps/backend/scripts/load-test.mjs` a 100 conexiones: el resultado fue **inconcluyente**
    por el ruido del propio hardware compartido (dos corridas seguidas dieron 528 req/s
    /188ms y luego 332 req/s/295ms bajo las mismas condiciones — varianza mayor que
    cualquier efecto real del pool). No vale la pena repetir esta comparación en esta
    máquina; si se quiere un número confiable, correrla contra el ambiente real de Render
    o una máquina sin otras cargas.
  - ❌ **Sigue pendiente:** medir el tamaño real de las imágenes Docker (`docker build -f
    apps/backend/Dockerfile -t prodexa-backend:size-check .` y lo mismo para frontend,
    ambos desde la raíz del repo) y documentar los números en `docs/deployment/docker.md`.
    Reintentar cuando la máquina esté descargada — es la única parte de 1.5 que sigue sin
    evidencia real, y el único motivo de que 1.5 no esté tachado todavía.
  - Al terminar 1.5: actualizar este archivo (marcar 1.5 con `~~tachado~~` como 1.1-1.4),
    el README (fila "Eficiencia de recursos", 84→89), el badge/conteo de tests si aplica, y
    republicar el scorecard (artifact `https://claude.ai/code/artifact/2db5d67e-c364-4336-a7cd-f7c4a35b6cca`).

**Actualización 2026-08-18 (6):** al retomar la sesión, `npm audit --omit=dev` (CI de
Seguridad) llevaba varios pushes en rojo — `@prisma/config` (dependencia de `prisma`) trae
`deepmerge-ts@7.1.5`, con un stack exhaustion conocido
([GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)) y Prisma no
tiene todavía un 7.x estable que lo arregle. Corregido con un `overrides` en
`apps/backend/package.json` forzando `deepmerge-ts@^8.0.0` (verificado: `prisma generate`,
build y los 286 tests siguen igual) — commit `47e91c3`. De paso, `prisma` (el CLI, solo se
usa en el build) pasó de `dependencies` a `devDependencies`. Aparte, el bump de
`eslint@10` en frontend (PR de Dependabot #19, mergeada esta sesión) rompió el lint real —
`eslint-config-next` sigue empaquetando `eslint-plugin-react@7.37.x`, incompatible con la
API de contexto nueva de ESLint 10 (`TypeError: contextOrFilename.getFilename is not a
function`); revertido a `eslint@^9` hasta que Next.js publique soporte real (commit
`044f355`). Ninguno de los dos es parte de 1.5-1.7, pero ambos dejaban el CI real en rojo,
así que se resolvieron antes de seguir.
- **1.6 (Fiabilidad): retry con backoff en operaciones de Prisma que fallan por error
  transitorio de conexión — en progreso ahora, no necesita Docker.**
- **1.7 (Seguridad): no arrancado.** El scan de OWASP ZAP contra el ambiente real — evaluar
  si correrlo local o esperar a que el 1.5 esté cerrado.

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
| Nota general | **86 (B+)** — Legal, Testability, Escalabilidad/Rendimiento, Monitoreabilidad y Compatibilidad ya hechos | ~87 | **~89 (B+ alto)** |

Cifras estimadas por pilar, no una promesa exacta — algunas dependen del resultado real de
una prueba de carga que todavía no corrió. El objetivo de este documento no es "maquillar"
la nota: es que cada punto que suba tenga evidencia real detrás, igual que el resto de la
autoevaluación.

## Fase 1 — motor propio

| # | Pilar | Acción | Hoy → meta | Entregable |
|---|---|---|:---:|---|
| ~~1.1~~ | ~~Testability~~ | ~~Tests para `forecast.ts` y `sugerencias.ts` (0% de cobertura) + `coverageThreshold` real en `apps/frontend/vitest.config.ts`~~ | ~~85 → 92~~ | **Hecho — 16 tests nuevos, cobertura de `src/lib/` 40.7%→93.8% statements, gate real agregado** |
| ~~1.2~~ | ~~Escalabilidad / Rendimiento~~ | ~~Script de carga (autocannon) contra el backend real, corrido de verdad, con resultados publicados~~ | ~~72 / 73 → 85 / 85~~ | **Hecho — `docs/testing/load-testing.md`: 720 req/s, 0 errores a 5x concurrencia, cuello de botella real encontrado (pool de conexiones sin `max`)** |
| ~~1.3~~ | ~~Monitoreabilidad~~ | ~~Alerta proactiva (correo al ADMIN) tras N logins fallidos seguidos~~ | ~~78 → 85~~ | **Hecho — `AuditService.notificarSiLoginsFallidosRepetidos()`, 8 tests nuevos, resuelve el pendiente de `docs/security/owasp-top10.md` A09** |
| ~~1.4~~ | ~~Compatibilidad~~ | ~~Política de versionado/deprecación de la API documentada + test de snapshot del schema OpenAPI~~ | ~~80 → 88~~ | **Hecho — `docs/api/versioning.md` + `api-schema.e2e-spec.ts` (snapshot real del contrato, falla en CI si cambia sin querer)** |
| 1.5 | Eficiencia de recursos | Medir y documentar tamaño real de las imágenes Docker + ajustar el pool de conexiones de Prisma/pg con datos, no con el default sin revisar | 84 → 89 | `docs/deployment/` actualizado con números reales |
| ~~1.6~~ | ~~Fiabilidad~~ | ~~Retry con backoff en las operaciones de Prisma que fallan por error transitorio de conexión — el mismo tipo de fallo que causó el incidente #1 de `docs/observability/known-gaps.md`~~ | ~~87 → 90~~ | **Hecho — `PrismaService` reintenta solo lecturas (nunca escrituras) ante P1001/P1002/P2024, backoff exponencial, `executeWithRetry`/`createQueryHandler` con test unitario dedicado + verificado contra Postgres real en la suite de integración** |
| 1.7 | Seguridad | Correr un scan automatizado (OWASP ZAP baseline) contra el ambiente real y documentar el resultado | 90 → 94 | Reporte nuevo en `docs/security/` |
| ~~1.8~~ | ~~Disponibilidad de datos~~ | ~~Backup automatizado del Postgres de producción — hallazgo nuevo, no estaba en el alcance original: el plan Free de Render no tiene backups propios y borra la base 30 días después de creada si nadie la sube a un plan pago~~ | — | **Hecho — `.github/workflows/backup-db.yml` (`pg_dump` diario a Cloudflare R2, retención 30 días) + `docs/deployment/backups.md` con el procedimiento de restore. Pendiente de vos: cargar los 5 secrets nuevos en GitHub y confirmar la fecha real de expiración de la base en el dashboard de Render (ver el documento — puede necesitar el ítem 3.1 antes de lo planeado)** |

## Fase 2 — barato pero externo

| # | Pilar | Acción | Hoy → meta | Entregable |
|---|---|---|:---:|---|
| 2.1a | Disponibilidad | ~~Ping de "keep-warm" cada ~10 min en horario laboral (GitHub Actions programado)~~ | — | **Hecho — `.github/workflows/keep-warm.yml`, lunes a viernes 08:00-18:00 Bogotá** |
| 2.1b | Disponibilidad | Monitor de uptime gratuito (UptimeRobot / Better Stack) sobre `/health` — necesita una cuenta externa, no algo que se resuelva solo con código | 65 → 78 | Vos — crear la cuenta y apuntarla a `https://prodexa-backend.onrender.com/health`; reduce cold starts en horario de uso real, no elimina el problema de fondo (ver 3.1) |
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

- **Prometheus/Grafana / métricas técnicas.** Sin tráfico real que monitorear es infraestructura especulativa. Con la alerta proactiva de logins fallidos ya resuelta (1.3), Monitoreabilidad quedó en 85 — subir más de ahí sí requeriría este stack. Se revisa cuando haya usuarios reales usando la plataforma a diario.
- **Múltiples instancias / balanceo de carga.** No tiene sentido decidirlo antes de saber si una sola instancia aguanta la carga real — por eso 1.2 va primero, no después.
- **Certificación de compatibilidad hacia consumidores externos de la API.** Hoy no existen integradores externos. La política de versionado + el test de snapshot (1.4, ya hecho) es lo máximo que se puede verificar sin ellos; Compatibilidad quedó en 88 — subir más de ahí requiere al menos un consumidor real poniendo el contrato a prueba.

## Seguimiento

Cada fila de este documento se convierte en un issue de GitHub cuando arranca (ver
[`gobernanza_tecnica.md`](gobernanza_tecnica.md) y
[`milestones_y_kanban.md`](milestones_y_kanban.md) para el flujo). Cuando una acción se
completa, se actualiza también la fila correspondiente en la tabla de
[Auditoría de calidad de software](../../README.md#auditoría-de-calidad-de-software) del
README — la nota que vive ahí debe reflejar siempre el estado real del código, nunca esta
hoja de ruta aspiracional.
