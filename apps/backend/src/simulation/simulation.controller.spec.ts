import { Test } from '@nestjs/testing';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';

describe('SimulationController', () => {
  let controller: SimulationController;
  const service = { simulateForFormulation: jest.fn() };
  const user = {
    id: 'user-1',
    email: 'a@a.com',
    organizationId: 'org-1',
    rol: 'ADMIN' as const,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [SimulationController],
      providers: [{ provide: SimulationService, useValue: service }],
    }).compile();

    controller = module.get(SimulationController);
  });

  it('simulate delega en el servicio con el organizationId y el dto', async () => {
    service.simulateForFormulation.mockResolvedValue({ costoEscalado: 100 });
    const dto = { formulationId: 'f-1', cantidadObjetivoKg: 2 };

    await controller.simulate(user, dto);

    expect(service.simulateForFormulation).toHaveBeenCalledWith('org-1', dto);
  });
});
