-- Organization: la empresa/cuenta compartida.
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- User: se le agrega organizationId (rellenado abajo) y rol.
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN "rol" TEXT NOT NULL DEFAULT 'ADMIN';

-- Backfill: cada usuario existente pasa a ser ADMIN de su propia empresa nueva
-- (asi ningun dato cambia de dueno con esta migracion).
DO $$
DECLARE
  u RECORD;
  nueva_org_id TEXT;
BEGIN
  FOR u IN SELECT id, nombre, email FROM "User" WHERE "organizationId" IS NULL LOOP
    nueva_org_id := 'org_' || substr(md5(random()::text || u.id), 1, 20);
    INSERT INTO "Organization" (id, nombre, "createdAt")
      VALUES (nueva_org_id, COALESCE(u.nombre, split_part(u.email, '@', 1)) || ' - Empresa', CURRENT_TIMESTAMP);
    UPDATE "User" SET "organizationId" = nueva_org_id WHERE id = u.id;
  END LOOP;
END $$;

ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- Invitation: links de invitacion para sumar gente a una organizacion con un rol.
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Formulation: se le agrega organizationId, rellenado desde el organizationId de su dueno actual.
ALTER TABLE "Formulation" ADD COLUMN "organizationId" TEXT;
UPDATE "Formulation" f SET "organizationId" = u."organizationId"
  FROM "User" u WHERE f."userId" = u.id;
ALTER TABLE "Formulation" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Formulation" ADD CONSTRAINT "Formulation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Formulation_organizationId_idx" ON "Formulation"("organizationId");

-- ProductionOrder: mismo backfill, y la unicidad de numeroLote pasa de ser por usuario a ser por organizacion.
ALTER TABLE "ProductionOrder" ADD COLUMN "organizationId" TEXT;
UPDATE "ProductionOrder" po SET "organizationId" = u."organizationId"
  FROM "User" u WHERE po."userId" = u.id;
ALTER TABLE "ProductionOrder" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ProductionOrder_organizationId_idx" ON "ProductionOrder"("organizationId");

DROP INDEX IF EXISTS "ProductionOrder_userId_numeroLote_key";
CREATE UNIQUE INDEX "ProductionOrder_organizationId_numeroLote_key" ON "ProductionOrder"("organizationId", "numeroLote");
