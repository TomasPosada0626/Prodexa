-- DropForeignKey
ALTER TABLE "PreparationStep" DROP CONSTRAINT "PreparationStep_formulationId_fkey";

-- AlterTable
ALTER TABLE "Formulation"
  ADD COLUMN "preparacionHtml" TEXT,
  ADD COLUMN "margenPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 30,
  ADD COLUMN "impuestoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "PreparationStep";
