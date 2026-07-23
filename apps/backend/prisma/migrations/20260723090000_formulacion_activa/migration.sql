-- Permite archivar una formulacion (alternativa segura a eliminarla cuando ya tiene
-- lotes de produccion registrados, que se perderian por cascade si se borra).
ALTER TABLE "Formulation" ADD COLUMN "activa" BOOLEAN NOT NULL DEFAULT true;
