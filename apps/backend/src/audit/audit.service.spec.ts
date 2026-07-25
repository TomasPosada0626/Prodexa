import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
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
