-- Tarifas por hora del usuario, usadas para calcular automaticamente mano de obra propia y
-- energia/gas cuando una orden de produccion no se marca como maquila.
ALTER TABLE "User" ADD COLUMN "tarifaManoObraHora" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "tarifaEnergiaHora" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Horas estimadas para producir cantidadBaseKg de esta formulacion.
ALTER TABLE "Formulation" ADD COLUMN "tiempoProduccionHoras" DECIMAL(8,2);

-- Maquila (costo manual de un tercero) vs. mano de obra propia (calculada), energia calculada,
-- y el snapshot de horas estimadas usado para calcular ambas en este lote especifico.
ALTER TABLE "ProductionOrder" ADD COLUMN "esMaquila" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductionOrder" ADD COLUMN "costoEnergia" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "ProductionOrder" ADD COLUMN "tiempoProduccionHoras" DECIMAL(8,2);
