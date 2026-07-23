import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SimulationService } from './simulation.service';

describe('SimulationService', () => {
  let service: SimulationService;
  const ORGANIZATION_ID = 'org-1';
  const prisma = {
    formulation: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SimulationService);
  });

  describe('calculate', () => {
    it('calcula costo escalado y precio de venta con margen e impuesto', () => {
      const result = service.calculate({
        costoBaseTotal: 10,
        cantidadBaseKg: 1,
        cantidadObjetivoKg: 5,
        margenPorcentaje: 20,
        impuestoPorcentaje: 10,
      });

      expect(result.costoPorKg).toBe(10);
      expect(result.costoEscalado).toBe(50);
      expect(result.precioVentaSugerido).toBe(62.5);
      expect(result.precioConImpuesto).toBe(68.75);
      expect(result.utilidadEstimada).toBe(12.5);
    });

    it('aplica el descuento mayorista sobre el precio con impuesto', () => {
      const result = service.calculate({
        costoBaseTotal: 100,
        cantidadBaseKg: 10,
        cantidadObjetivoKg: 10,
        margenPorcentaje: 50,
        impuestoPorcentaje: 0,
        descuentoMayoristaPorcentaje: 10,
      });

      expect(result.precioVentaSugerido).toBe(200);
      expect(result.precioMayorista).toBe(180);
    });

    it('asume impuesto 0 cuando no se envia', () => {
      const result = service.calculate({
        costoBaseTotal: 10,
        cantidadBaseKg: 1,
        cantidadObjetivoKg: 1,
        margenPorcentaje: 20,
      });

      expect(result.precioConImpuesto).toBe(result.precioVentaSugerido);
    });

    it('rechaza margenes mayores o iguales a 100%', () => {
      expect(() =>
        service.calculate({
          costoBaseTotal: 10,
          cantidadBaseKg: 1,
          cantidadObjetivoKg: 1,
          margenPorcentaje: 100,
        }),
      ).toThrow(BadRequestException);
    });

    it('suma los costos operativos al costo escalado antes de calcular precio y utilidad', () => {
      const result = service.calculate({
        costoBaseTotal: 10,
        cantidadBaseKg: 1,
        cantidadObjetivoKg: 5,
        margenPorcentaje: 20,
        costosOperativosTotal: 10,
      });

      // costoEscalado = 50, + 10 operativos = 60 costo total; precio sugerido = 60 / 0.8 = 75.
      expect(result.costoEscalado).toBe(50);
      expect(result.precioVentaSugerido).toBe(75);
      expect(result.utilidadEstimada).toBe(15);
    });

    it('rechaza formulaciones sin cantidad base valida', () => {
      expect(() =>
        service.calculate({
          costoBaseTotal: 10,
          cantidadBaseKg: 0,
          cantidadObjetivoKg: 1,
          margenPorcentaje: 20,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('simulateForFormulation', () => {
    it('lanza NotFoundException si la formulacion no existe o no pertenece a la organizacion', async () => {
      prisma.formulation.findFirst.mockResolvedValue(null);

      await expect(
        service.simulateForFormulation(ORGANIZATION_ID, {
          formulationId: 'inexistente',
          cantidadObjetivoKg: 1,
          margenPorcentaje: 20,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.formulation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inexistente', organizationId: ORGANIZATION_ID },
        }),
      );
    });

    it('agrega los costos de los ingredientes antes de calcular', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: '1',
        cantidadBaseKg: '1',
        margenPorcentaje: '30',
        impuestoPorcentaje: '0',
        ingredientes: [
          { precioTotal: '5', cantidadKg: '0.5' },
          { precioTotal: '5', cantidadKg: '0.5' },
        ],
      });

      const result = await service.simulateForFormulation(ORGANIZATION_ID, {
        formulationId: '1',
        cantidadObjetivoKg: 1,
        margenPorcentaje: 0,
      });

      expect(result.costoPorKg).toBe(10);
      expect(result.costoEscalado).toBe(10);
    });

    it('usa el margen e impuesto guardados en la formulacion si no se envian en la simulacion', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: '1',
        cantidadBaseKg: '1',
        margenPorcentaje: '50',
        impuestoPorcentaje: '10',
        ingredientes: [{ precioTotal: '10', cantidadKg: '1' }],
      });

      const result = await service.simulateForFormulation(ORGANIZATION_ID, {
        formulationId: '1',
        cantidadObjetivoKg: 1,
      });

      expect(result.precioVentaSugerido).toBe(20);
      expect(result.precioConImpuesto).toBe(22);
    });

    it('incluye los costos operativos enviados en el precio sugerido y la utilidad', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: '1',
        cantidadBaseKg: '1',
        margenPorcentaje: '0',
        impuestoPorcentaje: '0',
        ingredientes: [{ precioTotal: '10', cantidadKg: '1' }],
      });

      const result = await service.simulateForFormulation(ORGANIZATION_ID, {
        formulationId: '1',
        cantidadObjetivoKg: 1,
        costoEmpaque: 2,
        costoEtiqueta: 1,
        costoTransporte: 3,
        costoMermas: 4,
      });

      // costoEscalado (10) + operativos (2+1+3+4=10) = 20, con margen 0% el precio sugerido es igual al costo total.
      expect(result.costoEscalado).toBe(10);
      expect(result.precioVentaSugerido).toBe(20);
      expect(result.utilidadEstimada).toBe(0);
    });

    it('incluye mano de obra y energia enviadas en el precio sugerido y la utilidad', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: '1',
        cantidadBaseKg: '1',
        margenPorcentaje: '0',
        impuestoPorcentaje: '0',
        ingredientes: [{ precioTotal: '10', cantidadKg: '1' }],
      });

      const result = await service.simulateForFormulation(ORGANIZATION_ID, {
        formulationId: '1',
        cantidadObjetivoKg: 1,
        costoManoObra: 5,
        costoEnergia: 2,
      });

      // costoEscalado (10) + mano de obra (5) + energia (2) = 17, con margen 0% el precio sugerido es igual al costo total.
      expect(result.costoEscalado).toBe(10);
      expect(result.precioVentaSugerido).toBe(17);
      expect(result.utilidadEstimada).toBe(0);
    });
  });
});
