import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from './audit.service';
import { AuditEvent } from './audit.types';

describe('AuditService', () => {
  let service: AuditService;
  const prisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const mailService = {
    enviarAlertaLoginsFallidos: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(AuditService);
  });

  it('guarda el evento con el contexto recibido', async () => {
    prisma.auditLog.create.mockResolvedValue({});

    await service.log(AuditEvent.LOGIN_SUCCESS, {
      userId: 'user-1',
      ip: '127.0.0.1',
      userAgent: 'jest',
      metadata: { foo: 'bar' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        evento: AuditEvent.LOGIN_SUCCESS,
        userId: 'user-1',
        ip: '127.0.0.1',
        userAgent: 'jest',
        metadata: { foo: 'bar' },
      },
    });
  });

  it('usa un contexto vacio por defecto', async () => {
    prisma.auditLog.create.mockResolvedValue({});

    await service.log(AuditEvent.REGISTER);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        evento: AuditEvent.REGISTER,
        userId: undefined,
        ip: undefined,
        userAgent: undefined,
        metadata: undefined,
      },
    });
  });

  it('nunca lanza si la escritura falla: el flujo principal no debe interrumpirse', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('DB caida'));

    await expect(service.log(AuditEvent.LOGOUT)).resolves.toBeUndefined();
  });

  describe('notificarSiLoginsFallidosRepetidos', () => {
    function racha(...eventos: AuditEvent[]) {
      return eventos.map((evento) => ({ evento }));
    }

    it('avisa a los ADMIN activos cuando la racha llega exactamente al umbral (5 por defecto)', async () => {
      prisma.auditLog.findMany.mockResolvedValue(
        racha(
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
        ),
      );
      prisma.user.findUnique.mockResolvedValue({
        email: 'victima@empresa.test',
        organizationId: 'org-1',
      });
      prisma.user.findMany.mockResolvedValue([
        { email: 'admin1@empresa.test' },
        { email: 'admin2@empresa.test' },
      ]);
      mailService.enviarAlertaLoginsFallidos.mockResolvedValue(undefined);

      await service.notificarSiLoginsFallidosRepetidos('user-1');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1', rol: 'ADMIN', activo: true },
        }),
      );
      expect(mailService.enviarAlertaLoginsFallidos).toHaveBeenCalledTimes(2);
      expect(mailService.enviarAlertaLoginsFallidos).toHaveBeenCalledWith(
        'admin1@empresa.test',
        'victima@empresa.test',
        5,
      );
      expect(mailService.enviarAlertaLoginsFallidos).toHaveBeenCalledWith(
        'admin2@empresa.test',
        'victima@empresa.test',
        5,
      );
    });

    it('no avisa si la racha todavia no llega al umbral', async () => {
      prisma.auditLog.findMany.mockResolvedValue(
        racha(
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_SUCCESS,
        ),
      );

      await service.notificarSiLoginsFallidosRepetidos('user-1');

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(mailService.enviarAlertaLoginsFallidos).not.toHaveBeenCalled();
    });

    it('un LOGIN_SUCCESS corta la racha, aunque haya fallidos mas viejos antes', async () => {
      prisma.auditLog.findMany.mockResolvedValue(
        racha(
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_SUCCESS,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
        ),
      );

      await service.notificarSiLoginsFallidosRepetidos('user-1');

      expect(mailService.enviarAlertaLoginsFallidos).not.toHaveBeenCalled();
    });

    it('no vuelve a avisar en el intento fallido 6, 7, etc. despues de ya haber avisado en el 5', async () => {
      // 6 fallidos seguidos: la racha completa (6) ya paso el umbral (5) -> no dispara de nuevo.
      prisma.auditLog.findMany.mockResolvedValue(
        racha(
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
        ),
      );

      await service.notificarSiLoginsFallidosRepetidos('user-1');

      expect(mailService.enviarAlertaLoginsFallidos).not.toHaveBeenCalled();
    });

    it('no hace nada si el usuario ya no existe', async () => {
      prisma.auditLog.findMany.mockResolvedValue(
        racha(
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
          AuditEvent.LOGIN_FAILED,
        ),
      );
      prisma.user.findUnique.mockResolvedValue(null);

      await service.notificarSiLoginsFallidosRepetidos('user-1');

      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(mailService.enviarAlertaLoginsFallidos).not.toHaveBeenCalled();
    });

    it('nunca lanza si algo falla: el flujo de login no debe interrumpirse', async () => {
      prisma.auditLog.findMany.mockRejectedValue(new Error('DB caida'));

      await expect(
        service.notificarSiLoginsFallidosRepetidos('user-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('listForOrganization', () => {
    it('filtra por la organizacion del usuario asociado, mas reciente primero', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.listForOrganization('org-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuario: { organizationId: 'org-1' } },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      );
    });

    it('respeta el limite enviado', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.listForOrganization('org-1', 10);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('marcarComoRevisado', () => {
    it('lanza NotFoundException si el evento no existe', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(
        service.marcarComoRevisado('evento-1', 'org-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.auditLog.update).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el evento no es LOGIN_FAILED', async () => {
      prisma.auditLog.findUnique.mockResolvedValue({
        id: 'evento-1',
        evento: AuditEvent.LOGIN_SUCCESS,
        usuario: { organizationId: 'org-1' },
      });

      await expect(
        service.marcarComoRevisado('evento-1', 'org-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.auditLog.update).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si el evento es de otra empresa', async () => {
      prisma.auditLog.findUnique.mockResolvedValue({
        id: 'evento-1',
        evento: AuditEvent.LOGIN_FAILED,
        usuario: { organizationId: 'otra-org' },
      });

      await expect(
        service.marcarComoRevisado('evento-1', 'org-1', 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.auditLog.update).not.toHaveBeenCalled();
    });

    it('marca el evento como revisado cuando es un LOGIN_FAILED de la misma empresa', async () => {
      prisma.auditLog.findUnique.mockResolvedValue({
        id: 'evento-1',
        evento: AuditEvent.LOGIN_FAILED,
        usuario: { organizationId: 'org-1' },
      });
      prisma.auditLog.update.mockResolvedValue({});

      await service.marcarComoRevisado('evento-1', 'org-1', 'admin-1');

      expect(prisma.auditLog.update).toHaveBeenCalledWith({
        where: { id: 'evento-1' },
        data: {
          revisadoAt: expect.any(Date) as Date,
          revisadoPorId: 'admin-1',
        },
      });
    });
  });
});
