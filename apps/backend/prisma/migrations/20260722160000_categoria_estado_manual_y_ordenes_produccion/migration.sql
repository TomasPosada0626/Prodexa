ALTER TABLE "Formulation" ADD COLUMN "categoria" TEXT;
ALTER TABLE "Formulation" ADD COLUMN "registroSanitarioEstado" TEXT;

CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "formulationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cantidadObjetivoKg" DECIMAL(14,4) NOT NULL,
    "costoEscalado" DECIMAL(14,2) NOT NULL,
    "precioVentaSugerido" DECIMAL(14,2) NOT NULL,
    "utilidadEstimada" DECIMAL(14,2) NOT NULL,
    "margenPorcentaje" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionOrder_formulationId_idx" ON "ProductionOrder"("formulationId");
CREATE INDEX "ProductionOrder_userId_idx" ON "ProductionOrder"("userId");

ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_formulationId_fkey"
    FOREIGN KEY ("formulationId") REFERENCES "Formulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
