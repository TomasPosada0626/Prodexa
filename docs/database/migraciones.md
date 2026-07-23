# Migraciones

## Cómo se manejan hoy

Las migraciones de Prisma están versionadas en `apps/backend/prisma/migrations/` (23
carpetas a la fecha de esta revisión), cada una con nombre `YYYYMMDDHHmmss_descripcion`
— la convención estándar de Prisma, con la descripción en español para que el
historial de cambios de esquema se lea como una narrativa del proyecto (ej.
`20260722290000_flujo_produccion_calidad_proveedores`).

- **Local (desarrollo):** `npm run prisma:migrate` (`prisma migrate dev`) — crea una
  migración nueva a partir del diff de `schema.prisma` y la aplica a la vez.
- **CI / test (`prodexa_test`):** `npm run prisma:deploy` (`prisma migrate deploy`) —
  solo aplica migraciones ya existentes, nunca genera una nueva. Es lo que corre
  `.github/workflows/test.yml` contra el Postgres efímero de CI.
- `npm run prisma:generate` regenera el cliente de Prisma después de cualquier cambio
  de esquema — hace falta correrlo tras cada `git pull` que toque `schema.prisma`.

## Dos bases de datos, siempre

- `prodexa` — desarrollo local.
- `prodexa_test` — dedicada a integration/e2e tests (`apps/backend/test/*.e2e-spec.ts`),
  tanto en local (`apps/backend/.env.test`) como en CI (servicio Postgres efímero). Nunca
  se comparte con `prodexa` para que correr la suite de tests no pueda borrar datos de
  desarrollo por accidente.

## Sin seed script

No existe `prisma/seed.ts`. Un clone nuevo aplica las migraciones y arranca con la base
de datos vacía — no hay datos de ejemplo que cargar automáticamente.
