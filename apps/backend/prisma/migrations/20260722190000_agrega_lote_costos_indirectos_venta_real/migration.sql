-- Formulation: vida util para sugerir vencimiento de cada lote
ALTER TABLE "Formulation" ADD COLUMN "vidaUtilDias" INTEGER;

-- ProductionOrder: trazabilidad de lote, costos operativos reales, venta real y estado de pago
ALTER TABLE "ProductionOrder" ADD COLUMN "numeroLote" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN "fechaVencimiento" TIMESTAMP(3);
ALTER TABLE "ProductionOrder" ADD COLUMN "costoEmpaque" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ProductionOrder" ADD COLUMN "costoManoObra" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ProductionOrder" ADD COLUMN "costoTransporte" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ProductionOrder" ADD COLUMN "costoMermas" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ProductionOrder" ADD COLUMN "precioVentaReal" DECIMAL(14,2);
ALTER TABLE "ProductionOrder" ADD COLUMN "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE "ProductionOrder" ADD COLUMN "fechaPago" TIMESTAMP(3);

-- Backfill de numeroLote para las ordenes ya existentes (antes de este cambio no tenian lote asignado).
-- Se usa el id completo (no un prefijo corto) porque los cuid comparten prefijo de timestamp y
-- dos ordenes creadas en el mismo segundo pueden colisionar en los primeros caracteres.
UPDATE "ProductionOrder"
SET "numeroLote" = 'LOTE-' || to_char("createdAt", 'YYYYMMDD') || '-' || "id"
WHERE "numeroLote" IS NULL;

ALTER TABLE "ProductionOrder" ALTER COLUMN "numeroLote" SET NOT NULL;

CREATE UNIQUE INDEX "ProductionOrder_userId_numeroLote_key" ON "ProductionOrder"("userId", "numeroLote");
