# Backups de la base de datos

## El riesgo real, no solo teórico

El Postgres de producción corre en el **plan Free de Render**. Dos límites reales de
ese plan, verificados contra la documentación oficial de Render (agosto de 2026):

- **No incluye backups automáticos ni point-in-time recovery** — a diferencia del plan
  Starter (3 días de PITR) o superior.
- **Expira 30 días después de creada** (antes eran 90; Render lo redujo en 2024), con
  14 días de gracia para migrar a un plan pago antes de que Render **borre la base de
  datos completa**, datos incluidos.

Esto dejó de ser una limitación aceptable de portafolio el 14 de agosto de 2026, cuando
Prodexa entró en fase de pilotaje con clientes reales — hay datos de negocio de terceros
viviendo ahí.

**Acción inmediata recomendada, fuera del alcance de este documento:** confirmar en el
dashboard de Render la fecha real de creación de la base de datos y decidir si conviene
subirla a un plan pago (Starter, con PITR real) antes de que expire. Ver el ítem 3.1 de
[`roadmap-calidad-90.md`](../gestion/roadmap-calidad-90.md) — es una decisión de gasto
recurrente, no algo que se resuelva solo con código.

## Lo que este repo sí puede resolver sin esperar esa decisión

Un backup lógico diario (`pg_dump`) a Cloudflare R2, automatizado por GitHub Actions —
[`​.github/workflows/backup-db.yml`](../../.github/workflows/backup-db.yml). Corre a las
07:00 UTC (02:00 Bogotá) todos los días, sin importar si el Postgres sigue en Free o ya
se subió a un plan pago con su propio PITR — es una capa adicional, no un sustituto de
la decisión de arriba. Retiene 30 días de backups y borra los más viejos.

## Configurar el workflow (una sola vez)

En **Settings → Secrets and variables → Actions** del repo, agregar:

| Secret | De dónde sale |
|---|---|
| `BACKUP_DATABASE_URL` | Panel del servicio de Postgres en Render → **External Database URL** (la misma que se usa para aplicar migraciones a mano, ver [`roadmap-despliegue.md`](roadmap-despliegue.md)) |
| `R2_ACCOUNT_ID` | Dashboard de Cloudflare → R2 |
| `R2_BACKUP_ACCESS_KEY_ID` / `R2_BACKUP_SECRET_ACCESS_KEY` | Un API token de R2 **nuevo y separado** del que usa el backend para las imágenes subidas — con permiso de escritura solo sobre el bucket de backups, para que una fuga de una credencial no exponga la otra |
| `R2_BACKUP_BUCKET_NAME` | Nombre de un bucket de R2 dedicado a backups (crear uno nuevo — no reusar el de `apps/backend/.env` para no mezclar datos de clientes con backups bajo el mismo control de acceso) |

Después de cargar los 5 secrets, correr el workflow una vez a mano (**Actions → Backup
de la base de datos → Run workflow**) para confirmar que efectivamente sube un archivo
a R2 antes de confiar en que la corrida programada lo haga sola.

## Restaurar un backup (probarlo al menos una vez, no solo tenerlo)

Un backup que nunca se restauró es una suposición, no una garantía. Contra una base
de prueba, no la de producción:

```bash
# 1. Descargar el dump más reciente desde el dashboard de Cloudflare R2 (bucket de
#    backups, prefijo db-backups/) o con aws-cli apuntando al endpoint de R2.
# 2. Descomprimir y restaurar contra una base vacía de prueba:
gunzip -c prodexa-2026-08-18T07-00-00Z.sql.gz | psql "$DATABASE_URL_DE_PRUEBA"
```

## Qué NO cubre este backup

- **Los archivos subidos** (imágenes del editor de preparación de formulaciones) viven
  en R2 aparte (`R2_BUCKET_NAME` de `apps/backend/.env`) o en disco local si esas
  variables no están configuradas — este workflow solo respalda Postgres, no esos
  archivos. Si el proyecto ya usa R2 para uploads, ese bucket tiene su propia
  durabilidad (R2 no expira solo, a diferencia del Postgres Free de Render); si todavía
  usa disco local, esos archivos no tienen backup real y se pierden con cualquier
  redeploy del plan Free (ver [`roadmap-despliegue.md`](roadmap-despliegue.md)).
- **Recuperación punto-en-el-tiempo real** (restaurar a un minuto específico, no al
  momento del último dump diario) — eso es lo que da el PITR de un plan pago de Render,
  no algo que un `pg_dump` una vez al día pueda igualar.
