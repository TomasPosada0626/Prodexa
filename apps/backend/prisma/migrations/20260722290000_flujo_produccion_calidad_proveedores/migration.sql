-- Flujo de produccion: lotes ya existentes se consideran ya terminados (comportamiento
-- anterior a este cambio); lotes nuevos arrancan en PLANIFICADO.
ALTER TABLE "ProductionOrder" ADD COLUMN "estadoProduccion" TEXT NOT NULL DEFAULT 'TERMINADO';
ALTER TABLE "ProductionOrder" ALTER COLUMN "estadoProduccion" SET DEFAULT 'PLANIFICADO';
ALTER TABLE "ProductionOrder" ADD COLUMN "notasCalidad" TEXT;

-- Gestion de proveedores: formaliza el texto libre "proveedor" de SupplierPrice en su propia tabla.
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Supplier_organizationId_idx" ON "Supplier"("organizationId");
CREATE UNIQUE INDEX "Supplier_organizationId_nombre_key" ON "Supplier"("organizationId", "nombre");

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierPrice" ADD COLUMN "supplierId" TEXT;
CREATE INDEX "SupplierPrice_supplierId_idx" ON "SupplierPrice"("supplierId");
ALTER TABLE "SupplierPrice" ADD CONSTRAINT "SupplierPrice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: crea un Supplier por cada nombre de proveedor distinto ya usado en cada empresa.
INSERT INTO "Supplier" ("id", "organizationId", "nombre", "createdAt")
SELECT 'sup_' || md5(sub."organizationId" || sub."proveedor"), sub."organizationId", sub."proveedor", NOW()
FROM (
  SELECT DISTINCT f."organizationId" AS "organizationId", sp."proveedor" AS "proveedor"
  FROM "SupplierPrice" sp
  JOIN "Ingredient" i ON i.id = sp."ingredientId"
  JOIN "Formulation" f ON f.id = i."formulationId"
  WHERE sp."proveedor" IS NOT NULL AND trim(sp."proveedor") <> ''
) sub
ON CONFLICT ("organizationId", "nombre") DO NOTHING;

-- Backfill: enlaza cada SupplierPrice existente con el Supplier recien creado que le corresponde.
UPDATE "SupplierPrice" sp
SET "supplierId" = s."id"
FROM "Ingredient" i, "Formulation" f, "Supplier" s
WHERE sp."ingredientId" = i."id"
  AND i."formulationId" = f."id"
  AND s."organizationId" = f."organizationId"
  AND s."nombre" = sp."proveedor"
  AND sp."proveedor" IS NOT NULL;
