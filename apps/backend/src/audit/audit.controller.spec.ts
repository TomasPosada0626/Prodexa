import { Test } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  const service = {
    listForOrganization: jest.fn(),
    marcarComoRevisado: jest.fn(),
  };
  const user = {
    id: 'admin-1',
    email: 'admin@a.com',
    organizationId: 'org-1',
    rol: 'ADMIN' as const,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: service }],
    }).compile();

    controller = module.get(AuditController);
  });

  it('list delega en el servicio con el organizationId', async () => {
    await controller.list(user);
    expect(service.listForOrganization).toHaveBeenCalledWith('org-1');
  });

  it('revisar delega en el servicio con el id, organizationId y quien revisa', async () => {
    await controller.revisar(user, 'evento-1');
    expect(service.marcarComoRevisado).toHaveBeenCalledWith(
      'evento-1',
      'org-1',
      'admin-1',
    );
  });
});
