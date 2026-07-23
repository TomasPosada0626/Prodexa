import { Test } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  const service = {
    listForOrganization: jest.fn(),
    create: jest.fn(),
    rename: jest.fn(),
    remove: jest.fn(),
  };
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

  it('create delega en el servicio con el organizationId y el nombre', async () => {
    await controller.create(user, { nombre: 'Proveedor Nuevo' });
    expect(service.create).toHaveBeenCalledWith('org-1', 'Proveedor Nuevo');
  });

  it('rename delega en el servicio con el organizationId, el id y el nombre', async () => {
    await controller.rename(user, 'sup-1', { nombre: 'Nuevo nombre' });
    expect(service.rename).toHaveBeenCalledWith(
      'org-1',
      'sup-1',
      'Nuevo nombre',
    );
  });

  it('remove delega en el servicio con el organizationId y el id', async () => {
    await controller.remove(user, 'sup-1');
    expect(service.remove).toHaveBeenCalledWith('org-1', 'sup-1');
  });
});
