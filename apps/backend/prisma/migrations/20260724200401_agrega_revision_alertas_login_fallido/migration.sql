-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "revisadoAt" TIMESTAMP(3),
ADD COLUMN     "revisadoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
