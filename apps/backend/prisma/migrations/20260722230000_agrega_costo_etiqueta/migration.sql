-- Costo de etiqueta por separado del empaque (envase/frasco/tapa), para que el productor pueda
-- llevar ambos costos por separado en vez de un solo monto de "empaque".
ALTER TABLE "ProductionOrder" ADD COLUMN "costoEtiqueta" DECIMAL(14,2) NOT NULL DEFAULT 0;
