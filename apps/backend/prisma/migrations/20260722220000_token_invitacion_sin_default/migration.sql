-- El token de invitacion ahora lo genera la aplicacion (8 caracteres hexadecimales,
-- para poder compartirlo/escribirlo a mano en vez de un cuid largo), no la base de datos.
ALTER TABLE "Invitation" ALTER COLUMN "token" DROP DEFAULT;
