-- CreateTable: historial de snapshots completos de una formulacion
CREATE TABLE "FormulationVersion" (
    "id" TEXT NOT NULL,
    "formulationId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormulationVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FormulationVersion_formulationId_idx" ON "FormulationVersion"("formulationId");

ALTER TABLE "FormulationVersion" ADD CONSTRAINT "FormulationVersion_formulationId_fkey"
    FOREIGN KEY ("formulationId") REFERENCES "Formulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
