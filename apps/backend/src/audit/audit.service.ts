import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { RolOrganizacion } from '../auth/types';
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

  /** A cuantos LOGIN_FAILED consecutivos se le avisa por correo a los ADMIN de la empresa.
   * Configurable porque 5 (el mismo numero que el rate limit de login) es un punto de partida
   * razonable, no un valor que deba quedar fijo en el codigo para siempre. */
  private readonly failedLoginAlertThreshold = Number(
    process.env.FAILED_LOGIN_ALERT_THRESHOLD ?? 5,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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
   * Avisa por correo a los ADMIN activos de la empresa cuando una cuenta acumula
   * failedLoginAlertThreshold logins fallidos SEGUIDOS (sin un LOGIN_SUCCESS de por medio).
   * Se llama desde AuthController justo despues de loguear un LOGIN_FAILED, siempre en
   * fire-and-forget (nunca debe bloquear ni tumbar la respuesta de login) — mismo espiritu
   * que log(). Dispara exactamente una vez al CRUZAR el umbral, no en cada intento fallido
   * subsecuente: si ya van 5 y llega un 6to, no se manda un segundo correo por el mismo
   * incidente. Antes de esto, un ADMIN solo se enteraba si entraba por su cuenta a Auditoria
   * o al widget del Dashboard — no habia notificacion proactiva (pendiente que ya senalaba
   * docs/security/owasp-top10.md, A09).
   */
  async notificarSiLoginsFallidosRepetidos(userId: string): Promise<void> {
    try {
      // +1 para poder distinguir "la racha tiene exactamente el umbral" de "ya lo paso hace
      // rato" sin traer de mas: en cuanto aparece algo que no es LOGIN_FAILED (o se acaban los
      // registros), la racha termina ahi.
      const recientes = await this.prisma.auditLog.findMany({
        where: {
          userId,
          evento: {
            in: [
              AuditEvent.LOGIN_FAILED as string,
              AuditEvent.LOGIN_SUCCESS as string,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: this.failedLoginAlertThreshold + 1,
        select: { evento: true },
      });

      let racha = 0;
      for (const evento of recientes) {
        if (evento.evento !== (AuditEvent.LOGIN_FAILED as string)) break;
        racha += 1;
      }

      if (racha !== this.failedLoginAlertThreshold) {
        return;
      }

      const usuario = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, organizationId: true },
      });
      if (!usuario) return;

      const admins = await this.prisma.user.findMany({
        where: {
          organizationId: usuario.organizationId,
          rol: 'ADMIN' satisfies RolOrganizacion,
          activo: true,
        },
        select: { email: true },
      });

      await Promise.all(
        admins.map((admin) =>
          this.mailService.enviarAlertaLoginsFallidos(
            admin.email,
            usuario.email,
            this.failedLoginAlertThreshold,
          ),
        ),
      );
    } catch (error) {
      this.logger.error(
        'No se pudo evaluar/enviar la alerta de logins fallidos repetidos',
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
        revisadoAt: true,
        usuario: { select: { id: true, nombre: true, email: true } },
        revisadoPor: { select: { id: true, nombre: true, email: true } },
      },
    });
  }

  /**
   * Marca un LOGIN_FAILED como revisado: deja de contar como alerta activa en el panel
   * de Auditoria (ver AuditoriaPage, tarjeta "Inicios de sesion fallidos"). Solo aplica a
   * ese evento — los demas (cambios de precio, roles, etc.) no son "alertas de seguridad"
   * pendientes de revisar.
   */
  async marcarComoRevisado(
    id: string,
    organizationId: string,
    revisadoPorId: string,
  ): Promise<void> {
    const evento = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { usuario: true },
    });
    if (!evento) {
      throw new NotFoundException('No se encontro ese evento.');
    }
    if (evento.evento !== (AuditEvent.LOGIN_FAILED as string)) {
      throw new BadRequestException(
        'Solo los inicios de sesion fallidos se pueden marcar como revisados.',
      );
    }
    if (evento.usuario?.organizationId !== organizationId) {
      throw new ForbiddenException('Ese evento no pertenece a tu empresa.');
    }

    await this.prisma.auditLog.update({
      where: { id },
      data: { revisadoAt: new Date(), revisadoPorId },
    });
  }
}
