-- Marca si un usuario puede iniciar sesion. Al remover a alguien del equipo se pone en false
-- en vez de borrar la fila, para no arrastrar en cascada (onDelete: Cascade) las formulaciones
-- y ordenes de produccion que esa persona creo — son datos de la empresa, no solo suyos.
ALTER TABLE "User" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
