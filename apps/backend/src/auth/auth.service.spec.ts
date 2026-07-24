import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';

/** Espejo del hashToken privado de AuthService (mismo algoritmo), solo para armar fixtures de test. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    invitation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    productionOrder: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const mailService = {
    enviarCodigoRecuperacion: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.JWT_REFRESH_TTL_DAYS = '30';
    prisma.$transaction.mockImplementation(
      (arg: ((tx: typeof prisma) => unknown) | Promise<unknown>[]) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
    );
    // Sin lotes registrados por defecto: capacidadProduccionMensualKg calcula 0.0000 / 0 meses,
    // salvo que un test especifico mockee otra cosa para probar el promedio.
    prisma.productionOrder.findMany.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        JwtService,
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('lanza ConflictException si el correo ya esta registrado', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.register({ email: 'a@a.com', password: 'Contrasena123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea el usuario con la contrasena hasheada y NO emite sesion', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({ id: 'org-1' });
      prisma.user.create.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: 30,
        organizationId: 'org-1',
        rol: 'ADMIN',
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
      });

      const result = await service.register({
        email: 'a@a.com',
        password: 'Contrasena123',
        nombre: 'Ana',
        nombreEmpresa: 'Empresa Test',
      });

      expect(prisma.user.create).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const createArgs = prisma.user.create.mock.calls[0][0] as {
        data: { passwordHash: string };
      };
      expect(createArgs.data.passwordHash).not.toBe('Contrasena123');
      expect(
        await argon2.verify(createArgs.data.passwordHash, 'Contrasena123'),
      ).toBe(true);
      expect(result).toEqual({
        id: '1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: '30',
        tarifaManoObraHora: '0',
        tarifaEnergiaHora: '0',
        gastoGeneralMensual: '0',
        capacidadProduccionMensualKg: '0.0000',
        capacidadMesesBase: 0,
        organizationId: 'org-1',
        organizationNombre: 'Empresa Test',
        rol: 'ADMIN',
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('normaliza el token de invitacion (espacios y minusculas) antes de buscarlo', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        rol: 'MIEMBRO',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.create.mockResolvedValue({
        id: '2',
        email: 'b@b.com',
        nombre: null,
        margenPorDefecto: 30,
        organizationId: 'org-1',
        rol: 'MIEMBRO',
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
      });
      prisma.invitation.update.mockResolvedValue({});

      await service.register({
        email: 'b@b.com',
        password: 'Contrasena123',
        invitationToken: '  ab12cd34  ',
      });

      expect(prisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { token: 'AB12CD34' },
      });
    });

    it('lanza BadRequestException si el token de invitacion no existe, ya se uso o expiro', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'c@c.com',
          password: 'Contrasena123',
          invitationToken: 'DEADBEEF',
        }),
      ).rejects.toThrow('La invitacion no es valida o ya expiro');
    });
  });

  describe('login', () => {
    it('lanza UnauthorizedException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'a@a.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la contrasena es incorrecta', async () => {
      const passwordHash = (await argon2.hash('contrasenaCorrecta')) as string;
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash,
      });

      await expect(
        service.login({ email: 'a@a.com', password: 'incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('emite tokens cuando las credenciales son correctas', async () => {
      const passwordHash = (await argon2.hash('contrasenaCorrecta')) as string;
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: 30,
        organizationId: 'org-1',
        rol: 'ADMIN',
        activo: true,
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
        passwordHash,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'a@a.com',
        password: 'contrasenaCorrecta',
      });

      expect(result.user).toEqual({
        id: '1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: '30',
        tarifaManoObraHora: '0',
        tarifaEnergiaHora: '0',
        gastoGeneralMensual: '0',
        capacidadProduccionMensualKg: '0.0000',
        capacidadMesesBase: 0,
        organizationId: 'org-1',
        organizationNombre: 'Empresa Test',
        rol: 'ADMIN',
      });
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('usa 30 dias de vigencia por defecto si no hay JWT_REFRESH_TTL_DAYS configurado', async () => {
      delete process.env.JWT_REFRESH_TTL_DAYS;
      const passwordHash = (await argon2.hash('contrasenaCorrecta')) as string;
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: 30,
        organizationId: 'org-1',
        rol: 'ADMIN',
        activo: true,
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
        passwordHash,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      await service.login({
        email: 'a@a.com',
        password: 'contrasenaCorrecta',
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const createArgs = prisma.refreshToken.create.mock.calls[0][0] as {
        data: { expiresAt: Date };
      };
      const diasRestantes =
        (createArgs.data.expiresAt.getTime() - Date.now()) /
        (24 * 60 * 60 * 1000);
      expect(diasRestantes).toBeGreaterThan(29);
      expect(diasRestantes).toBeLessThanOrEqual(30);
    });
  });

  describe('refresh', () => {
    it('lanza UnauthorizedException si el token no existe, esta revocado o expirado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('token-invalido')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rota el token: revoca el anterior y emite uno nuevo', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: 30,
        organizationId: 'org-1',
        rol: 'ADMIN',
        activo: true,
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('token-valido');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: '30',
        tarifaManoObraHora: '0',
        tarifaEnergiaHora: '0',
        gastoGeneralMensual: '0',
        capacidadProduccionMensualKg: '0.0000',
        capacidadMesesBase: 0,
        organizationId: 'org-1',
        organizationNombre: 'Empresa Test',
        rol: 'ADMIN',
      });
    });

    it('lanza UnauthorizedException si el token es valido pero el usuario ya no existe', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-eliminado',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('token-valido')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('no hace nada si no hay token', async () => {
      const result = await service.logout(undefined);
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
      expect(result).toEqual({ userId: null });
    });

    it('revoca el refresh token si se envia y devuelve el userId para auditoria', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
      });
      prisma.refreshToken.update.mockResolvedValue({});

      const result = await service.logout('token-valido');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
      expect(result).toEqual({ userId: 'user-1' });
    });

    it('no hace nada si el token ya estaba revocado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: new Date(),
      });

      const result = await service.logout('token-ya-revocado');

      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
      expect(result).toEqual({ userId: null });
    });
  });

  describe('findUserIdByEmail', () => {
    it('devuelve el id si el correo pertenece a un usuario', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const result = await service.findUserIdByEmail('a@a.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@a.com' },
        select: { id: true },
      });
      expect(result).toBe('user-1');
    });

    it('devuelve undefined si el correo no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findUserIdByEmail('no-existe@a.com');

      expect(result).toBeUndefined();
    });
  });

  describe('me', () => {
    it('lanza UnauthorizedException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('user-inexistente')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devuelve el usuario autenticado', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: 30,
        organizationId: 'org-1',
        rol: 'ADMIN',
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
      });

      const result = await service.me('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: '30',
        tarifaManoObraHora: '0',
        tarifaEnergiaHora: '0',
        gastoGeneralMensual: '0',
        capacidadProduccionMensualKg: '0.0000',
        capacidadMesesBase: 0,
        organizationId: 'org-1',
        organizationNombre: 'Empresa Test',
        rol: 'ADMIN',
      });
    });

    it('calcula capacidadProduccionMensualKg como el promedio de los ultimos meses completos, excluyendo RECHAZADO y el mes en curso', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: 30,
        organizationId: 'org-1',
        rol: 'ADMIN',
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
      });
      const ahora = new Date();
      const mesAnterior = new Date(
        ahora.getFullYear(),
        ahora.getMonth() - 1,
        10,
      );
      const dosMesesAtras = new Date(
        ahora.getFullYear(),
        ahora.getMonth() - 2,
        10,
      );
      // El mock ya representa lo que Prisma devolveria DESPUES de aplicar el "where" (RECHAZADO
      // excluido en la consulta): por eso no hay que repetir ese filtro aqui en JS.
      prisma.productionOrder.findMany.mockResolvedValue([
        { cantidadObjetivoKg: 100, createdAt: dosMesesAtras },
        { cantidadObjetivoKg: 200, createdAt: mesAnterior },
        // Este lote es del mes EN CURSO: no debe contar, subestimaria el promedio.
        { cantidadObjetivoKg: 9999, createdAt: ahora },
      ]);

      const result = await service.me('user-1');

      expect(prisma.productionOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            organizationId: 'org-1',
            estadoProduccion: { not: 'RECHAZADO' },
          }),
        }),
      );
      // (100 + 200) / 2 meses = 150
      expect(result.capacidadProduccionMensualKg).toBe('150.0000');
      expect(result.capacidadMesesBase).toBe(2);
    });
  });

  describe('updateProfile', () => {
    it('actualiza el nombre y devuelve el usuario', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'a@a.com',
        nombre: 'Nuevo Nombre',
        margenPorDefecto: 30,
        organizationId: 'org-1',
        rol: 'ADMIN',
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
      });

      const result = await service.updateProfile('user-1', {
        nombre: 'Nuevo Nombre',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { nombre: 'Nuevo Nombre' },
        }),
      );
      expect(result).toEqual({
        id: 'user-1',
        email: 'a@a.com',
        nombre: 'Nuevo Nombre',
        margenPorDefecto: '30',
        tarifaManoObraHora: '0',
        tarifaEnergiaHora: '0',
        gastoGeneralMensual: '0',
        capacidadProduccionMensualKg: '0.0000',
        capacidadMesesBase: 0,
        organizationId: 'org-1',
        organizationNombre: 'Empresa Test',
        rol: 'ADMIN',
      });
    });

    it('incluye margenPorDefecto en la actualizacion cuando se envia', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'a@a.com',
        nombre: 'Ana',
        margenPorDefecto: 40,
        organizationId: 'org-1',
        rol: 'ADMIN',
        organizacion: {
          nombre: 'Empresa Test',
          tarifaManoObraHora: 0,
          tarifaEnergiaHora: 0,
          gastoGeneralMensual: 0,
        },
      });

      await service.updateProfile('user-1', { margenPorDefecto: 40 });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { nombre: undefined, margenPorDefecto: 40 },
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('lanza UnauthorizedException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'x',
          newPassword: 'NuevaContrasena123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la contrasena actual es incorrecta', async () => {
      const passwordHash = (await argon2.hash('contrasenaActual')) as string;
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'incorrecta',
          newPassword: 'NuevaContrasena123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('actualiza el hash cuando la contrasena actual es correcta', async () => {
      const passwordHash = (await argon2.hash('contrasenaActual')) as string;
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash });
      prisma.user.update.mockResolvedValue({});

      await service.changePassword('user-1', {
        currentPassword: 'contrasenaActual',
        newPassword: 'NuevaContrasena123!',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const updateArgs = prisma.user.update.mock.calls[0][0] as {
        data: { passwordHash: string };
      };
      expect(updateArgs.data.passwordHash).not.toBe('NuevaContrasena123!');
      expect(
        await argon2.verify(
          updateArgs.data.passwordHash,
          'NuevaContrasena123!',
        ),
      ).toBe(true);
    });
  });

  describe('forgotPassword', () => {
    it('no hace nada si el correo no existe (no revela si existe o no)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword({ email: 'nadie@a.com' });

      expect(prisma.passwordResetCode.create).not.toHaveBeenCalled();
      expect(mailService.enviarCodigoRecuperacion).not.toHaveBeenCalled();
    });

    it('no hace nada si el usuario existe pero esta inactivo', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', activo: false });

      await service.forgotPassword({ email: 'a@a.com' });

      expect(prisma.passwordResetCode.create).not.toHaveBeenCalled();
    });

    it('invalida codigos anteriores, crea uno nuevo de 6 digitos y lo envia por correo', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@a.com',
        activo: true,
      });
      prisma.passwordResetCode.updateMany.mockResolvedValue({});
      prisma.passwordResetCode.create.mockResolvedValue({});

      await service.forgotPassword({ email: 'a@a.com' });

      expect(prisma.passwordResetCode.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', usedAt: null },
        data: { usedAt: expect.any(Date) as Date },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const createArgs = prisma.passwordResetCode.create.mock.calls[0][0] as {
        data: { codeHash: string; expiresAt: Date };
      };
      expect(createArgs.data.codeHash).toHaveLength(64); // sha256 hex
      expect(mailService.enviarCodigoRecuperacion).toHaveBeenCalledWith(
        'a@a.com',
        expect.stringMatching(/^\d{6}$/) as string,
      );
    });
  });

  describe('resetPassword', () => {
    const baseInput = {
      email: 'a@a.com',
      code: '123456',
      newPassword: 'NuevaContrasena123!',
    };

    it('lanza BadRequestException si el correo no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(baseInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si no hay codigo pendiente', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetCode.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(baseInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si el codigo no coincide', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: hashToken('000000'),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.resetPassword(baseInput)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el codigo ya expiro', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: hashToken('123456'),
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.resetPassword(baseInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('con codigo valido: actualiza la contrasena, marca el codigo usado y revoca todas las sesiones', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetCode.findFirst.mockResolvedValue({
        id: 'code-1',
        codeHash: hashToken('123456'),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await service.resetPassword(baseInput);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(prisma.passwordResetCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'code-1' } }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });
  });

  describe('listSessions', () => {
    it('lista solo sesiones activas (no revocadas ni expiradas), mas reciente primero', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([]);

      await service.listSessions('user-1');

      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ userId: 'user-1', revokedAt: null }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('marca actual:true solo en la sesion cuyo hash coincide con el refresh token de la peticion, y nunca expone tokenHash', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([
        { id: 'sesion-1', ip: '1.1.1.1', tokenHash: 'hash-de-otra-sesion' },
        { id: 'sesion-2', ip: '2.2.2.2', tokenHash: hashToken('token-actual') },
      ]);

      const result = await service.listSessions('user-1', 'token-actual');

      expect(result).toEqual([
        { id: 'sesion-1', ip: '1.1.1.1', actual: false },
        { id: 'sesion-2', ip: '2.2.2.2', actual: true },
      ]);
    });

    it('ninguna sesion queda como actual si no se envia el refresh token de la peticion', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([
        { id: 'sesion-1', ip: '1.1.1.1', tokenHash: 'hash-1' },
      ]);

      const result = await service.listSessions('user-1');

      expect(result).toEqual([
        { id: 'sesion-1', ip: '1.1.1.1', actual: false },
      ]);
    });
  });

  describe('revokeSession', () => {
    it('lanza NotFoundException si la sesion no existe', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.revokeSession('user-1', 'rt-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si la sesion es de otro usuario', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'otro-usuario',
      });

      await expect(service.revokeSession('user-1', 'rt-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('revoca la sesion cuando pertenece al usuario', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
      });
      prisma.refreshToken.update.mockResolvedValue({});

      await service.revokeSession('user-1', 'rt-1');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
    });
  });
});
