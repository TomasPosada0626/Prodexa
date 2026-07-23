import { Test } from '@nestjs/testing';
import { FormulationsController } from './formulations.controller';
import { FormulationsService } from './formulations.service';

describe('FormulationsController', () => {
  let controller: FormulationsController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateIngredientPrice: jest.fn(),
    getIngredientPriceHistory: jest.fn(),
    getVersions: jest.fn(),
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
      controllers: [FormulationsController],
      providers: [{ provide: FormulationsService, useValue: service }],
    }).compile();

    controller = module.get(FormulationsController);
  });

  it('create delega en el servicio con el userId, el organizationId y el dto', async () => {
    service.create.mockResolvedValue({ id: 'f-1' });
    const dto = { nombreProducto: 'X', cantidadBaseKg: 1, ingredientes: [] };

    await controller.create(user, dto);

    expect(service.create).toHaveBeenCalledWith('user-1', 'org-1', dto);
  });

  it('findAll delega en el servicio con el organizationId, sin archivadas por defecto', async () => {
    await controller.findAll(user);
    expect(service.findAll).toHaveBeenCalledWith('org-1', false);
  });

  it('findAll incluye archivadas cuando se envia incluirArchivadas=true', async () => {
    await controller.findAll(user, 'true');
    expect(service.findAll).toHaveBeenCalledWith('org-1', true);
  });

  it('findOne delega en el servicio con el organizationId y el id', async () => {
    await controller.findOne(user, 'f-1');
    expect(service.findOne).toHaveBeenCalledWith('org-1', 'f-1');
  });

  it('update delega en el servicio con el organizationId, el id y el dto', async () => {
    const dto = { nombreProducto: 'Nuevo' };
    await controller.update(user, 'f-1', dto);
    expect(service.update).toHaveBeenCalledWith('org-1', 'f-1', dto, 'user-1');
  });

  it('remove delega en el servicio con el organizationId y el id', async () => {
    await controller.remove(user, 'f-1');
    expect(service.remove).toHaveBeenCalledWith('org-1', 'f-1');
  });

  it('updateIngredientPrice delega con organizationId, formulationId, ingredientId y dto', async () => {
    const dto = { precioKg: 100, proveedor: 'Proveedor Test' };
    await controller.updateIngredientPrice(user, 'f-1', 'i-1', dto);
    expect(service.updateIngredientPrice).toHaveBeenCalledWith(
      'org-1',
      'f-1',
      'i-1',
      dto,
      'user-1',
    );
  });

  it('getIngredientPriceHistory delega con organizationId, formulationId e ingredientId', async () => {
    await controller.getIngredientPriceHistory(user, 'f-1', 'i-1');
    expect(service.getIngredientPriceHistory).toHaveBeenCalledWith(
      'org-1',
      'f-1',
      'i-1',
    );
  });

  it('getVersions delega en el servicio con el organizationId y el id', async () => {
    await controller.getVersions(user, 'f-1');
    expect(service.getVersions).toHaveBeenCalledWith('org-1', 'f-1');
  });
});
