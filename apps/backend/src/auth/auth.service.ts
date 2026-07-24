import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthTokens, AuthenticatedUser, RolOrganizacion } from './types';

const REFRESH_TOKEN_BYTES = 40;
const PASSWORD_RESET_CODE_TTL_MINUTES = 15;

/** Incluye la organizacion en la misma consulta: toAuthenticatedUser necesita su nombre. */
const USER_INCLUDE_ORGANIZACION = { organizacion: true };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Creates the account only — does NOT issue a session. The user is
   * redirected to /login and must authenticate explicitly afterwards.
   *
   * Si viene un invitationToken, se une a la empresa de esa invitacion con el rol que
   * el invitador definio. Si no, crea una empresa nueva y queda como ADMIN de esa empresa.
   */
  async register(dto: RegisterDto): Promise<AuthenticatedUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe una cuenta registrada con este correo.',
      );
    }

    const passwordHash = (await argon2.hash(dto.password)) as string;

    if (dto.invitationToken) {
      // El token es un codigo corto pensado para escribirlo a mano: se normaliza
      // mayusculas/espacios para que un typo de capitalizacion no lo rechace.
      const invitation = await this.prisma.invitation.findUnique({
        where: { token: dto.invitationToken.trim().toUpperCase() },
      });
      if (
        !invitation ||
        invitation.usedAt ||
        invitation.expiresAt < new Date()
      ) {
        throw new BadRequestException(
          'La invitacion no es valida o ya expiro. Pide un link nuevo.',
        );
      }

      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            nombre: dto.nombre,
            organizationId: invitation.organizationId,
            rol: invitation.rol,
          },
          include: USER_INCLUDE_ORGANIZACION,
        });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { usedAt: new Date() },
        });
        return created;
      });

      return this.toAuthenticatedUser(user);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { nombre: dto.nombreEmpresa! },
      });
      return tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          nombre: dto.nombre,
          organizationId: organization.id,
          rol: 'ADMIN',
        },
        include: USER_INCLUDE_ORGANIZACION,
      });
    });

    return this.toAuthenticatedUser(user);
  }

  async login(
    dto: LoginDto,
    sessionContext?: SessionContext,
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: USER_INCLUDE_ORGANIZACION,
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.organizationId,
      user.rol as RolOrganizacion,
      sessionContext,
    );
    return {
      user: await this.toAuthenticatedUser(user),
      tokens,
    };
  }

  async refresh(
    rawRefreshToken: string,
    sessionContext?: SessionContext,
  ): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Sesion invalida o expirada, inicia sesion de nuevo.',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: USER_INCLUDE_ORGANIZACION,
    });
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.organizationId,
      user.rol as RolOrganizacion,
      sessionContext,
    );
    return {
      user: await this.toAuthenticatedUser(user),
      tokens,
    };
  }

  /** Revoca el refresh token y devuelve el userId asociado (o null) para poder auditar el evento. */
  async logout(
    rawRefreshToken: string | undefined,
  ): Promise<{ userId: string | null }> {
    if (!rawRefreshToken) {
      return { userId: null };
    }
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt) {
      return { userId: null };
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return { userId: stored.userId };
  }

  /**
   * Para auditar un login fallido contra una cuenta real (LOGIN_FAILED necesita userId para
   * poder atribuirse a una empresa, ver AuditService.listForOrganization). No revela si el
   * correo existe: el controller solo la usa para enriquecer el log, nunca para la respuesta.
   */
  async findUserIdByEmail(email: string): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user?.id;
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_INCLUDE_ORGANIZACION,
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    return this.toAuthenticatedUser(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nombre: dto.nombre,
        ...(dto.margenPorDefecto !== undefined && {
          margenPorDefecto: dto.margenPorDefecto,
        }),
      },
      include: USER_INCLUDE_ORGANIZACION,
    });
    return this.toAuthenticatedUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const passwordValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('La contrasena actual no es correcta.');
    }

    const passwordHash = (await argon2.hash(dto.newPassword)) as string;
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /**
   * No revela si el correo existe: siempre retorna sin lanzar, el controller responde
   * el mismo mensaje generico sin importar el resultado. Si la cuenta existe, invalida
   * cualquier codigo anterior sin usar (solo el ultimo pedido es valido, mismo espiritu
   * que la rotacion de refresh tokens) y envia uno nuevo por correo.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.activo) {
      return;
    }

    await this.prisma.passwordResetCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: hashToken(codigo),
        expiresAt: new Date(
          Date.now() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000,
        ),
      },
    });

    await this.mailService.enviarCodigoRecuperacion(user.email, codigo);
  }

  /**
   * Colapsa toda falla (correo inexistente, codigo inexistente/usado/expirado/no
   * coincide) en un solo error generico — mismo patron que la validacion de
   * Invitation en register(), para no revelar cual condicion fallo. Al resetear,
   * revoca todas las sesiones activas del usuario (mismo mecanismo que
   * OrganizationsService al remover un miembro): un codigo de recuperacion usado
   * significa que cualquier sesion abierta en otro dispositivo deja de ser confiable.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const invalido = () =>
      new BadRequestException('El codigo no es valido o ya expiro.');

    if (!user) {
      throw invalido();
    }

    const record = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !record ||
      record.expiresAt < new Date() ||
      record.codeHash !== hashToken(dto.code)
    ) {
      throw invalido();
    }

    const passwordHash = (await argon2.hash(dto.newPassword)) as string;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /**
   * Sesiones (refresh tokens) activas del usuario, mas reciente primero. Nunca expone el
   * tokenHash: se usa solo internamente para marcar `actual` (la sesion del refresh token con el
   * que se hizo esta misma peticion), asi la UI puede resaltarla y evitar que el usuario se
   * cierre su propia sesion sin darse cuenta.
   */
  async listSessions(userId: string, currentRawRefreshToken?: string) {
    const currentHash = currentRawRefreshToken
      ? hashToken(currentRawRefreshToken)
      : null;
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
        tokenHash: true,
      },
    });
    return tokens.map(({ tokenHash, ...sesion }) => ({
      ...sesion,
      actual: tokenHash === currentHash,
    }));
  }

  /** Revoca una sesion especifica, verificando que pertenezca al usuario autenticado. */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });
    if (!stored) {
      throw new NotFoundException('No se encontro esa sesion.');
    }
    if (stored.userId !== userId) {
      throw new ForbiddenException('Esa sesion no pertenece a tu cuenta.');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
    organizationId: string,
    rol: RolOrganizacion,
    sessionContext?: SessionContext,
  ): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, organizationId, rol },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_TTL ??
          '15m') as JwtSignOptions['expiresIn'],
      },
    );

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const ttlDays = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        ip: sessionContext?.ip,
        userAgent: sessionContext?.userAgent,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Promedio de kg producidos (excluye RECHAZADO, igual que el resto de rentabilidad) en los
   * ultimos MAX_MESES_BASE meses YA completos (excluye el mes en curso, que subestimaria el
   * promedio al no haber terminado). Reemplaza la antigua "produccion mensual estimada" manual:
   * se ajusta solo con el historial real en vez de depender de una adivinanza del usuario.
   */
  private async calcularCapacidadPromedioMensual(
    organizationId: string,
  ): Promise<{ kg: number; mesesBase: number }> {
    const MAX_MESES_BASE = 3;
    const desde = new Date();
    desde.setMonth(desde.getMonth() - (MAX_MESES_BASE + 1));

    const ordenes = await this.prisma.productionOrder.findMany({
      where: {
        organizationId,
        estadoProduccion: { not: 'RECHAZADO' },
        createdAt: { gte: desde },
      },
      select: { cantidadObjetivoKg: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const ahora = new Date();
    const claveMesActual = `${ahora.getFullYear()}-${ahora.getMonth()}`;
    const porMes = new Map<string, number>();
    for (const orden of ordenes) {
      const clave = `${orden.createdAt.getFullYear()}-${orden.createdAt.getMonth()}`;
      if (clave === claveMesActual) continue;
      porMes.set(
        clave,
        (porMes.get(clave) ?? 0) + Number(orden.cantidadObjetivoKg),
      );
    }

    const base = Array.from(porMes.values()).slice(-MAX_MESES_BASE);
    if (base.length === 0) return { kg: 0, mesesBase: 0 };

    return {
      kg: base.reduce((total, kg) => total + kg, 0) / base.length,
      mesesBase: base.length,
    };
  }

  private async toAuthenticatedUser(
    user: UserRecord,
  ): Promise<AuthenticatedUser> {
    const capacidad = await this.calcularCapacidadPromedioMensual(
      user.organizationId,
    );
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      margenPorDefecto: user.margenPorDefecto.toString(),
      tarifaManoObraHora: user.organizacion.tarifaManoObraHora.toString(),
      tarifaEnergiaHora: user.organizacion.tarifaEnergiaHora.toString(),
      gastoGeneralMensual: user.organizacion.gastoGeneralMensual.toString(),
      capacidadProduccionMensualKg: capacidad.kg.toFixed(4),
      capacidadMesesBase: capacidad.mesesBase,
      organizationId: user.organizationId,
      organizationNombre: user.organizacion.nombre,
      rol: user.rol as RolOrganizacion,
    };
  }
}

interface UserRecord {
  id: string;
  email: string;
  nombre: string | null;
  margenPorDefecto: { toString(): string };
  organizationId: string;
  rol: string;
  organizacion: {
    nombre: string;
    tarifaManoObraHora: { toString(): string };
    tarifaEnergiaHora: { toString(): string };
    gastoGeneralMensual: { toString(): string };
  };
}

export interface SessionContext {
  ip?: string;
  userAgent?: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
