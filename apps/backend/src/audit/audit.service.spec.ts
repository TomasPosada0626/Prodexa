import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { AuditEvent } from './audit.types';

describe('AuditService', () => {
  let service: AuditService;
  const prisma = { auditLog: { create: jest.fn(), findMany: jest.fn() } };

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
});
