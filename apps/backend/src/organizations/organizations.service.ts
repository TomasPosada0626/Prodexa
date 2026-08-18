import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolOrganizacion } from '../auth/types';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../audit/audit.types';
import { StorageService } from '../storage/storage.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { DeleteOrganizationDto } from './dto/delete-organization.dto';

const INVITATION_TTL_DIAS = 7;

/** Nombre de archivo que UploadsController genera (ver generarNombreArchivo): UUID v4 +
 * extension de imagen conocida. Se usa para encontrar, dentro del HTML libre de
 * preparacionHtml, solo las imagenes que nosotros mismos subimos (nunca URLs externas que
 * un usuario haya pegado a mano) antes de purgarlas del storage al eliminar una empresa. */
const IMAGEN_SUBIDA_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpe?g|gif|webp)/gi;

export function extraerNombresDeImagenSubida(
  html: string | null | undefined,
): string[] {
  if (!html) {
    return [];
  }
  const coincidencias = html.match(IMAGEN_SUBIDA_REGEX);
  return coincidencias ? Array.from(new Set(coincidencias)) : [];
}

/** Codigo corto (8 hex) facil de compartir/escribir a mano, en vez de un cuid largo. */
function generarTokenInvitacion(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

const MEMBER_SELECT = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  createdAt: true,
};

/**
 * Todo aca opera sobre la empresa (organizationId) del usuario autenticado — nunca sobre
 * otras. Remover a alguien desactiva su cuenta (activo=false) en vez de borrarla: sus
 * formulaciones y ordenes de produccion son de la empresa, no solo suyas, y borrar la
 * fila del usuario las arrastraria en cascada.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
  ) {}

  listMembers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, activo: true },
      select: MEMBER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Tarifas por hora (mano de obra, energia) de TODA la empresa: son de la organizacion, no de
   * cada usuario, para que el mismo producto cueste lo mismo sin importar quien registre el lote.
   */
  async updateSettings(
    organizationId: string,
    dto: UpdateOrganizationSettingsDto,
    userId: string,
  ) {
    const resultado = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.tarifaManoObraHora !== undefined && {
          tarifaManoObraHora: dto.tarifaManoObraHora,
        }),
        ...(dto.tarifaEnergiaHora !== undefined && {
          tarifaEnergiaHora: dto.tarifaEnergiaHora,
        }),
        ...(dto.gastoGeneralMensual !== undefined && {
          gastoGeneralMensual: dto.gastoGeneralMensual,
        }),
      },
      select: {
        tarifaManoObraHora: true,
        tarifaEnergiaHora: true,
        gastoGeneralMensual: true,
      },
    });

    void this.auditService.log(AuditEvent.ORGANIZATION_SETTINGS_UPDATED, {
      userId,
      metadata: { campos: Object.keys(dto) },
    });

    return resultado;
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    requestingUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    if (memberId === requestingUserId) {
      throw new BadRequestException('No puedes cambiar tu propio rol.');
    }

    const member = await this.findActiveMember(organizationId, memberId);

    if (member.rol === 'ADMIN' && dto.rol !== 'ADMIN') {
      await this.assertNoEsElUltimoAdmin(organizationId, memberId);
    }

    const actualizado = await this.prisma.user.update({
      where: { id: memberId },
      data: { rol: dto.rol },
      select: MEMBER_SELECT,
    });

    void this.auditService.log(AuditEvent.MEMBER_ROLE_CHANGED, {
      userId: requestingUserId,
      metadata: {
        memberId,
        memberEmail: member.email,
        rolAnterior: member.rol,
        rolNuevo: dto.rol,
      },
    });

    return actualizado;
  }

  async removeMember(
    organizationId: string,
    memberId: string,
    requestingUserId: string,
  ): Promise<void> {
    if (memberId === requestingUserId) {
      throw new BadRequestException(
        'No puedes removerte a ti mismo del equipo.',
      );
    }

    const member = await this.findActiveMember(organizationId, memberId);

    if (member.rol === 'ADMIN') {
      await this.assertNoEsElUltimoAdmin(organizationId, memberId);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: memberId },
        data: { activo: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: memberId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    void this.auditService.log(AuditEvent.MEMBER_REMOVED, {
      userId: requestingUserId,
      metadata: {
        memberId,
        memberEmail: member.email,
        memberNombre: member.nombre,
      },
    });
  }

  async createInvitation(
    organizationId: string,
    createdByUserId: string,
    dto: CreateInvitationDto,
  ) {
    const expiresAt = new Date(
      Date.now() + INVITATION_TTL_DIAS * 24 * 60 * 60 * 1000,
    );

    let token = generarTokenInvitacion();
    // Colision practicamente imposible (1 en ~4.3 mil millones), pero se verifica igual
    // porque el token es corto (8 hex) y unico en toda la tabla.
    while (await this.prisma.invitation.findUnique({ where: { token } })) {
      token = generarTokenInvitacion();
    }

    return this.prisma.invitation.create({
      data: {
        organizationId,
        createdByUserId,
        rol: dto.rol,
        token,
        expiresAt,
      },
    });
  }

  /** Invitaciones vigentes (sin usar, sin expirar) de la empresa, mas reciente primero. */
  listPendingInvitations(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: {
        organizationId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(
    organizationId: string,
    invitationId: string,
  ): Promise<void> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId },
    });
    if (!invitation) {
      throw new NotFoundException('No se encontro esa invitacion.');
    }
    await this.prisma.invitation.delete({ where: { id: invitationId } });
  }

  /**
   * Elimina la empresa completa: TODO lo que cuelga de organizationId (usuarios,
   * formulaciones, ingredientes, historial de versiones, ordenes de produccion, pagos,
   * proveedores, invitaciones) se borra en cascada por el propio schema — a diferencia de
   * eliminar un solo perfil, aca no hace falta anonimizar nada porque no queda nadie en el
   * equipo para quien preservar el dato. Irreversible: solo ADMIN, con contrasena y el
   * nombre exacto de la empresa escrito a mano como doble confirmacion.
   */
  async deleteOrganization(
    organizationId: string,
    requestingUserId: string,
    dto: DeleteOrganizationDto,
  ): Promise<{ nombre: string; miembrosEliminados: number }> {
    await this.authService.verifyPassword(requestingUserId, dto.password);

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('No se encontro la empresa.');
    }
    if (dto.confirmacion.trim() !== organization.nombre) {
      throw new BadRequestException(
        'El nombre escrito no coincide exactamente con el nombre de la empresa.',
      );
    }

    const [miembrosEliminados, formulaciones] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, activo: true } }),
      this.prisma.formulation.findMany({
        where: { organizationId },
        select: { preparacionHtml: true },
      }),
    ]);

    const archivos = Array.from(
      new Set(
        formulaciones.flatMap((f) =>
          extraerNombresDeImagenSubida(f.preparacionHtml),
        ),
      ),
    );

    await this.prisma.organization.delete({ where: { id: organizationId } });

    // Best-effort y despues del delete: la base de datos ya quedo consistente sin estos
    // archivos, asi que una falla aca (ej. R2 caido) deja como mucho un archivo huerfano
    // en el storage, nunca un dato de negocio a medio borrar.
    await Promise.allSettled(
      archivos.map((filename) => this.storageService.delete(filename)),
    );

    void this.auditService.log(AuditEvent.ORGANIZATION_DELETED, {
      metadata: {
        organizacionNombre: organization.nombre,
        miembrosEliminados,
        archivosPurgados: archivos.length,
      },
    });

    return { nombre: organization.nombre, miembrosEliminados };
  }

  private async findActiveMember(organizationId: string, memberId: string) {
    const member = await this.prisma.user.findFirst({
      where: { id: memberId, organizationId, activo: true },
    });
    if (!member) {
      throw new NotFoundException('No se encontro ese miembro del equipo.');
    }
    return member;
  }

  /** Evita dejar la empresa sin ningun ADMIN activo. */
  private async assertNoEsElUltimoAdmin(
    organizationId: string,
    excludeUserId: string,
  ): Promise<void> {
    const otrosAdmins = await this.prisma.user.count({
      where: {
        organizationId,
        activo: true,
        rol: 'ADMIN' satisfies RolOrganizacion,
        id: { not: excludeUserId },
      },
    });
    if (otrosAdmins === 0) {
      throw new ForbiddenException(
        'La empresa debe tener al menos un administrador activo.',
      );
    }
  }
}
