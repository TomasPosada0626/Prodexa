import { Test } from '@nestjs/testing';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';

describe('ProductionOrdersController', () => {
  let controller: ProductionOrdersController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addPago: jest.fn(),
    listPagos: jest.fn(),
    removePago: jest.fn(),
  };
  const user = {
    id: 'user-1',
    email: 'a@a.com',
    organizationId: 'org-1',
    rol: 'ADMIN' as const,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [{ provide: ProductionOrdersService, useValue: service }],
    }).compile();

    controller = module.get(ProductionOrdersController);
  });

  it('create delega en el servicio con el userId, el organizationId y el dto', async () => {
    const dto = { formulationId: 'f-1', cantidadObjetivoKg: 2 };
    await controller.create(user, dto);
    expect(service.create).toHaveBeenCalledWith('user-1', 'org-1', dto);
  });

  it('findAll delega en el servicio con el organizationId y filtra por formulationId', async () => {
    await controller.findAll(user, 'f-1');
    expect(service.findAll).toHaveBeenCalledWith('org-1', 'f-1');
  });

  it('findAll delega sin formulationId cuando no se envia', async () => {
    await controller.findAll(user, undefined);
    expect(service.findAll).toHaveBeenCalledWith('org-1', undefined);
  });

  it('update delega en el servicio con el organizationId, el id y el dto', async () => {
    const dto = { cantidadObjetivoKg: 3 };
    await controller.update(user, 'po-1', dto);
    expect(service.update).toHaveBeenCalledWith('org-1', 'po-1', dto);
  });

  it('remove delega en el servicio con el organizationId, el id y el userId', async () => {
    await controller.remove(user, 'po-1');
    expect(service.remove).toHaveBeenCalledWith('org-1', 'po-1', 'user-1');
  });

  it('addPago delega en el servicio con el organizationId, el id de la orden y el dto', async () => {
    const dto = { monto: 50 };
    await controller.addPago(user, 'po-1', dto);
    expect(service.addPago).toHaveBeenCalledWith('org-1', 'po-1', dto);
  });

  it('listPagos delega en el servicio con el organizationId y el id de la orden', async () => {
    await controller.listPagos(user, 'po-1');
    expect(service.listPagos).toHaveBeenCalledWith('org-1', 'po-1');
  });

  it('removePago delega en el servicio con el organizationId, el id de la orden, el id del pago y el userId', async () => {
    await controller.removePago(user, 'po-1', 'pago-1');
    expect(service.removePago).toHaveBeenCalledWith(
      'org-1',
      'po-1',
      'pago-1',
      'user-1',
    );
  });
});
