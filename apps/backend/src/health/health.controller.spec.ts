import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const prisma = { $queryRaw: jest.fn() };

  function mockResponse() {
    const res: { status: jest.Mock; json: jest.Mock } = {
      status: jest.fn(),
      json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(HealthController);
  });

  describe('liveness', () => {
    it('siempre responde ok, sin depender de nada externo', () => {
      const result = controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('responde 200 cuando la base de datos responde', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const res = mockResponse();

      await controller.readiness(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const body = res.json.mock.calls[0][0] as { status: string };
      expect(body.status).toBe('ok');
    });

    it('responde 503 cuando la base de datos no responde', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('conexion caida'));
      const res = mockResponse();

      await controller.readiness(res as never);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const body = res.json.mock.calls[0][0] as { status: string };
      expect(body.status).toBe('error');
    });
  });
});
