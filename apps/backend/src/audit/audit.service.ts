import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEvent } from './audit.types';

export interface AuditContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un evento de seguridad. Nunca debe tumbar el flujo principal (login,
   * registro, etc.) si falla: se atrapa y se loguea, pero no se relanza.
   */
  async log(evento: AuditEvent, context: AuditContext = {}): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          evento,
          userId: context.userId,
          ip: context.ip,
          userAgent: context.userAgent,
          metadata: context.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar el evento de auditoria ${evento}`,
        error as Error,
      );
    }
  }

  /**
   * Eventos de seguridad de los usuarios de una empresa (login/logout/registro/cambio de
   * contrasena), mas reciente primero. AuditLog no tiene organizationId propio, asi que se
   * filtra por la organizacion del usuario asociado — eventos sin usuario (ej. un intento de
   * login con un correo que no existe) no se pueden atribuir a ninguna empresa y se excluyen.
   */
  async listForOrganization(organizationId: string, take = 200) {
    return this.prisma.auditLog.findMany({
      where: { usuario: { organizationId } },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        evento: true,
        ip: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
        usuario: { select: { id: true, nombre: true, email: true } },
      },
    });
  }
}
