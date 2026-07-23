-- La produccion mensual estimada deja de ser un dato manual: ahora se calcula automaticamente
-- como el promedio de los ultimos meses completos de produccion real (ver auth.service.ts),
-- para no depender de una estimacion del usuario que rapidamente queda desactualizada.
ALTER TABLE "Organization" DROP COLUMN "capacidadProduccionMensualKg";
