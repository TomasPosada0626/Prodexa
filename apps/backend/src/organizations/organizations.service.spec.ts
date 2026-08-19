import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { StorageService } from '../storage/storage.service';
import {
  extraerNombresDeImagenSubida,
  OrganizationsService,
} from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  const auditService = { log: jest.fn() };
  const authService = { verifyPassword: jest.fn() };
  const storageService = { upload: jest.fn(), delete: jest.fn() };
  const ORG_ID = 'org-1';
  const USER_ID = 'user-1';
  const prisma = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    formulation: {
      findMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((ops: unknown[]) =>
      Promise.all(ops as Promise<unknown>[]),
    );
    storageService.delete.mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: AuthService, useValue: authService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get(OrganizationsService);
  });

  describe('updateSettings', () => {
    it('actualiza solo las tarifas enviadas, escopado a la organizacion', async () => {
      prisma.organization.update.mockResolvedValue({
        tarifaManoObraHora: 15000,
        tarifaEnergiaHora: 5000,
      });

      const result = await service.updateSettings(
        ORG_ID,
        { tarifaManoObraHora: 15000, tarifaEnergiaHora: 5000 },
        USER_ID,
      );

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: { tarifaManoObraHora: 15000, tarifaEnergiaHora: 5000 },
        select: {
          tarifaManoObraHora: true,
          tarifaEnergiaHora: true,
          gastoGeneralMensual: true,
        },
      });
      expect(result).toEqual({
        tarifaManoObraHora: 15000,
        tarifaEnergiaHora: 5000,
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'ORGANIZATION_SETTINGS_UPDATED',
        expect.objectContaining({ userId: USER_ID }),
      );
    });

    it('no incluye tarifas que no se envian', async () => {
      prisma.organization.update.mockResolvedValue({});

      await service.updateSettings(
        ORG_ID,
        { tarifaManoObraHora: 20000 },
        USER_ID,
      );

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: { tarifaManoObraHora: 20000 },
        select: {
          tarifaManoObraHora: true,
          tarifaEnergiaHora: true,
          gastoGeneralMensual: true,
        },
      });
    });

    it('actualiza gastos generales', async () => {
      prisma.organization.update.mockResolvedValue({});

      await service.updateSettings(
        ORG_ID,
        { gastoGeneralMensual: 2000000 },
        USER_ID,
      );

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { gastoGeneralMensual: 2000000 },
        }),
      );
    });
  });

  describe('listMembers', () => {
    it('lista solo miembros activos de la empresa, ordenados por antiguedad', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.listMembers(ORG_ID);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: ORG_ID, activo: true },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('updateMemberRole', () => {
    it('lanza BadRequestException si el usuario intenta cambiar su propio rol', async () => {
      await expect(
        service.updateMemberRole(ORG_ID, 'user-1', 'user-1', {
          rol: 'MIEMBRO',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el miembro no existe, no es activo o es de otra empresa', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(ORG_ID, 'miembro-1', 'admin-1', {
          rol: 'MIEMBRO',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si intenta degradar al ultimo ADMIN', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-2', rol: 'ADMIN' });
      prisma.user.count.mockResolvedValue(0);

      await expect(
        service.updateMemberRole(ORG_ID, 'admin-2', 'admin-1', {
          rol: 'MIEMBRO',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('actualiza el rol cuando no queda la empresa sin administradores y lo audita', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'miembro-1',
        rol: 'MIEMBRO',
        email: 'miembro@a.com',
      });
      prisma.user.update.mockResolvedValue({
        id: 'miembro-1',
        rol: 'COORDINADOR',
      });

      const result = await service.updateMemberRole(
        ORG_ID,
        'miembro-1',
        'admin-1',
        {
          rol: 'COORDINADOR',
        },
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'miembro-1' },
          data: { rol: 'COORDINADOR' },
        }),
      );
      expect(result).toEqual({ id: 'miembro-1', rol: 'COORDINADOR' });
      expect(auditService.log).toHaveBeenCalledWith(
        'MEMBER_ROLE_CHANGED',
        expect.objectContaining({
          userId: 'admin-1',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            memberId: 'miembro-1',
            rolAnterior: 'MIEMBRO',
            rolNuevo: 'COORDINADOR',
          }),
        }),
      );
    });
  });

  describe('removeMember', () => {
    it('lanza BadRequestException si el usuario intenta removerse a si mismo', async () => {
      await expect(
        service.removeMember(ORG_ID, 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el miembro no existe, no es activo o es de otra empresa', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.removeMember(ORG_ID, 'miembro-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si intenta remover al ultimo ADMIN', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-2', rol: 'ADMIN' });
      prisma.user.count.mockResolvedValue(0);

      await expect(
        service.removeMember(ORG_ID, 'admin-2', 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('desactiva al miembro, revoca sus sesiones activas (no borra la fila) y lo audita', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'miembro-1',
        rol: 'MIEMBRO',
        email: 'miembro@a.com',
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await service.removeMember(ORG_ID, 'miembro-1', 'admin-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'miembro-1' },
        data: { activo: false },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'miembro-1', revokedAt: null },
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        'MEMBER_REMOVED',
        expect.objectContaining({
          userId: 'admin-1',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({ memberId: 'miembro-1' }),
        }),
      );
    });
  });

  describe('createInvitation', () => {
    it('crea una invitacion que expira en 7 dias', async () => {
      prisma.invitation.create.mockResolvedValue({ id: 'inv-1' });

      const antes = Date.now();
      await service.createInvitation(ORG_ID, 'admin-1', { rol: 'MIEMBRO' });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const args = prisma.invitation.create.mock.calls[0][0] as {
        data: {
          organizationId: string;
          createdByUserId: string;
          rol: string;
          token: string;
          expiresAt: Date;
        };
      };
      expect(args.data.organizationId).toBe(ORG_ID);
      expect(args.data.createdByUserId).toBe('admin-1');
      expect(args.data.rol).toBe('MIEMBRO');
      expect(args.data.token).toMatch(/^[0-9A-F]{8}$/);
      const diasRestantes =
        (args.data.expiresAt.getTime() - antes) / (24 * 60 * 60 * 1000);
      expect(diasRestantes).toBeGreaterThan(6.9);
      // Tolerancia de unos ms: `antes` se captura en el test antes de llamar al servicio,
      // que calcula su propio Date.now() al entrar a la funcion.
      expect(diasRestantes).toBeLessThanOrEqual(7.001);
    });

    it('genera un token nuevo si el primero ya existe (colision improbable pero cubierta)', async () => {
      prisma.invitation.findUnique
        .mockResolvedValueOnce({ id: 'ya-existe' })
        .mockResolvedValueOnce(null);
      prisma.invitation.create.mockResolvedValue({ id: 'inv-2' });

      await service.createInvitation(ORG_ID, 'admin-1', { rol: 'ADMIN' });

      expect(prisma.invitation.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('listPendingInvitations', () => {
    it('filtra por empresa, sin usar y sin expirar', async () => {
      prisma.invitation.findMany.mockResolvedValue([]);

      await service.listPendingInvitations(ORG_ID);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const args = prisma.invitation.findMany.mock.calls[0][0] as {
        where: {
          organizationId: string;
          usedAt: null;
          expiresAt: { gt: Date };
        };
      };
      expect(args.where.organizationId).toBe(ORG_ID);
      expect(args.where.usedAt).toBeNull();
      expect(args.where.expiresAt.gt).toBeInstanceOf(Date);
    });
  });

  describe('revokeInvitation', () => {
    it('lanza NotFoundException si la invitacion no existe o es de otra empresa', async () => {
      prisma.invitation.findFirst.mockResolvedValue(null);

      await expect(service.revokeInvitation(ORG_ID, 'inv-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.invitation.delete).not.toHaveBeenCalled();
    });

    it('elimina la invitacion cuando pertenece a la empresa', async () => {
      prisma.invitation.findFirst.mockResolvedValue({ id: 'inv-1' });
      prisma.invitation.delete.mockResolvedValue({});

      await service.revokeInvitation(ORG_ID, 'inv-1');

      expect(prisma.invitation.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });
  });

  describe('deleteOrganization', () => {
    it('propaga el error de contrasena incorrecta sin tocar la base de datos', async () => {
      authService.verifyPassword.mockRejectedValue(new Error('nope'));

      await expect(
        service.deleteOrganization(ORG_ID, USER_ID, {
          password: 'mal',
          confirmacion: 'Empresa',
        }),
      ).rejects.toThrow('nope');
      expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la empresa no existe', async () => {
      authService.verifyPassword.mockResolvedValue(undefined);
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteOrganization(ORG_ID, USER_ID, {
          password: 'ok',
          confirmacion: 'Empresa',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.organization.delete).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el nombre de confirmacion no coincide', async () => {
      authService.verifyPassword.mockResolvedValue(undefined);
      prisma.organization.findUnique.mockResolvedValue({
        nombre: 'Empresa Real',
      });

      await expect(
        service.deleteOrganization(ORG_ID, USER_ID, {
          password: 'ok',
          confirmacion: 'nombre equivocado',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.organization.delete).not.toHaveBeenCalled();
    });

    it('elimina la empresa, purga las imagenes subidas encontradas y lo audita', async () => {
      authService.verifyPassword.mockResolvedValue(undefined);
      prisma.organization.findUnique.mockResolvedValue({
        nombre: 'Empresa Real',
      });
      prisma.user.count.mockResolvedValue(3);
      prisma.formulation.findMany.mockResolvedValue([
        {
          preparacionHtml:
            '<img src="/uploads/images/11111111-1111-1111-1111-111111111111.png">',
        },
        { preparacionHtml: null },
      ]);
      prisma.organization.delete.mockResolvedValue({});

      const result = await service.deleteOrganization(ORG_ID, USER_ID, {
        password: 'ok',
        confirmacion: 'Empresa Real',
      });

      expect(prisma.organization.delete).toHaveBeenCalledWith({
        where: { id: ORG_ID },
      });
      expect(storageService.delete).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111.png',
      );
      expect(result).toEqual({ nombre: 'Empresa Real', miembrosEliminados: 3 });
      expect(auditService.log).toHaveBeenCalledWith(
        'ORGANIZATION_DELETED',
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            organizacionNombre: 'Empresa Real',
            miembrosEliminados: 3,
            archivosPurgados: 1,
          }),
        }),
      );
    });

    it('no bloquea la eliminacion si purgar un archivo falla (best-effort)', async () => {
      authService.verifyPassword.mockResolvedValue(undefined);
      prisma.organization.findUnique.mockResolvedValue({
        nombre: 'Empresa Real',
      });
      prisma.user.count.mockResolvedValue(1);
      prisma.formulation.findMany.mockResolvedValue([
        {
          preparacionHtml:
            '<img src="/uploads/images/22222222-2222-2222-2222-222222222222.jpg">',
        },
      ]);
      prisma.organization.delete.mockResolvedValue({});
      storageService.delete.mockRejectedValue(new Error('storage caida'));

      await expect(
        service.deleteOrganization(ORG_ID, USER_ID, {
          password: 'ok',
          confirmacion: 'Empresa Real',
        }),
      ).resolves.toEqual({ nombre: 'Empresa Real', miembrosEliminados: 1 });
    });
  });
});

describe('extraerNombresDeImagenSubida', () => {
  it('retorna [] para HTML vacio o sin imagenes', () => {
    expect(extraerNombresDeImagenSubida(null)).toEqual([]);
    expect(extraerNombresDeImagenSubida(undefined)).toEqual([]);
    expect(extraerNombresDeImagenSubida('<p>sin imagenes</p>')).toEqual([]);
  });

  it('extrae solo nombres de archivo con forma de imagen subida (UUID + extension conocida)', () => {
    const html =
      '<p>texto</p><img src="https://r2.example.com/images/33333333-3333-4333-8333-333333333333.webp"><img src="https://otro-sitio.com/foto.png">';

    expect(extraerNombresDeImagenSubida(html)).toEqual([
      '33333333-3333-4333-8333-333333333333.webp',
    ]);
  });

  it('deduplica nombres repetidos', () => {
    const nombre = '44444444-4444-4444-4444-444444444444.gif';
    const html = `<img src="/uploads/images/${nombre}"><img src="/uploads/images/${nombre}">`;

    expect(extraerNombresDeImagenSubida(html)).toEqual([nombre]);
  });
});
