-- AlterTable: el impuesto ya no es un valor libre por formulacion, es el IVA fijo (19%).
ALTER TABLE "Formulation" ALTER COLUMN "impuestoPorcentaje" SET DEFAULT 19;

-- Alinea las formulaciones existentes al IVA fijo.
UPDATE "Formulation" SET "impuestoPorcentaje" = 19;
