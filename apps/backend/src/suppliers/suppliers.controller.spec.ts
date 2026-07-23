import { Test } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  const service = { listForOrganization: jest.fn() };
  const user = {
    id: 'user-1',
    email: 'a@a.com',
    organizationId: 'org-1',
    rol: 'MIEMBRO' as const,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: service }],
    }).compile();

    controller = module.get(SuppliersController);
  });

  it('findAll delega en el servicio con el organizationId', async () => {
    await controller.findAll(user);
    expect(service.listForOrganization).toHaveBeenCalledWith('org-1');
  });
});
