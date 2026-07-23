-- Gastos generales (prorrateados por kg producido al mes)
ALTER TABLE "Organization" ADD COLUMN "gastoGeneralMensual" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "capacidadProduccionMensualKg" DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE "ProductionOrder" ADD COLUMN "costoGastosGenerales" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Pagos parciales
ALTER TABLE "ProductionOrder" ADD COLUMN "montoCobrado" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Pago_productionOrderId_idx" ON "Pago"("productionOrderId");

ALTER TABLE "Pago" ADD CONSTRAINT "Pago_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Para lotes ya marcados PAGADO antes de este cambio, refleja el ingreso ya reconocido como
-- cobrado (evita que aparezcan como "PAGADO" pero con $0 cobrado en los nuevos reportes).
UPDATE "ProductionOrder"
SET "montoCobrado" = COALESCE("precioVentaReal", "precioVentaSugerido")
WHERE "estadoPago" = 'PAGADO';
