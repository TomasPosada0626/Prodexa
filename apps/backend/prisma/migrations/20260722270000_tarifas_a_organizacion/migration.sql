ALTER TABLE "Organization" ADD COLUMN "tarifaManoObraHora" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "tarifaEnergiaHora" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Copia la tarifa mas alta entre los usuarios de cada empresa a la organizacion, para no perder
-- silenciosamente lo que ya hubieran configurado antes de que este ajuste existiera.
UPDATE "Organization" o
SET "tarifaManoObraHora" = sub.max_mano_obra,
    "tarifaEnergiaHora" = sub.max_energia
FROM (
  SELECT "organizationId",
         MAX("tarifaManoObraHora") AS max_mano_obra,
         MAX("tarifaEnergiaHora") AS max_energia
  FROM "User"
  GROUP BY "organizationId"
) sub
WHERE o.id = sub."organizationId";

ALTER TABLE "User" DROP COLUMN "tarifaManoObraHora";
ALTER TABLE "User" DROP COLUMN "tarifaEnergiaHora";
