import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SimulationService } from '../simulation/simulation.service';
import { AuditService } from '../audit/audit.service';
import { ProductionOrdersService } from './production-orders.service';

describe('ProductionOrdersService', () => {
  let service: ProductionOrdersService;
  const auditService = { log: jest.fn() };
  const prisma = {
    formulation: { findFirst: jest.fn() },
    productionOrder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pago: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
        SimulationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(ProductionOrdersService);
  });

  describe('create', () => {
    it('lanza NotFoundException si la formulacion no existe o no es del usuario', async () => {
      prisma.formulation.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'org-1', {
          formulationId: 'f-1',
          cantidadObjetivoKg: 2,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('calcula el costo/utilidad con el motor de simulacion y guarda la orden', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        ingredientes: [{ precioTotal: 100 }, { precioTotal: 50 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 2,
      });

      expect(prisma.productionOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            formulationId: 'f-1',
            userId: 'user-1',
            organizationId: 'org-1',
            cantidadObjetivoKg: 2,
            costoEscalado: 300,
            margenPorcentaje: 30,
          }),
        }),
      );
    });

    it('genera un numeroLote legible cuando no se envia uno', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: null,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.productionOrder.create.mock.calls[0][0] as {
        data: { numeroLote: string };
      };
      expect(llamada.data.numeroLote).toMatch(/^LOTE-\d{8}-[A-Z0-9]+$/);
    });

    it('usa el numeroLote enviado en vez de generar uno', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: null,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
        numeroLote: '  LOTE-MANUAL-01  ',
      });

      expect(prisma.productionOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ numeroLote: 'LOTE-MANUAL-01' }),
        }),
      );
    });

    it('calcula la fecha de vencimiento a partir de la vida util de la formulacion cuando no se envia una', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: 10,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      const antes = Date.now();
      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.productionOrder.create.mock.calls[0][0] as {
        data: { fechaVencimiento: Date };
      };
      const diffDias =
        (llamada.data.fechaVencimiento.getTime() - antes) /
        (24 * 60 * 60 * 1000);
      expect(diffDias).toBeCloseTo(10, 1);
    });

    it('no calcula vencimiento si la formulacion no tiene vida util configurada', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: null,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
      });

      expect(prisma.productionOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ fechaVencimiento: null }),
        }),
      );
    });

    it('respeta la fecha de vencimiento enviada explicitamente', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: 10,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
        fechaVencimiento: '2027-01-01',
      });

      expect(prisma.productionOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            fechaVencimiento: new Date('2027-01-01'),
          }),
        }),
      );
    });

    it('guarda los costos operativos reales y la venta/pago real cuando se envian', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: null,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
        costoEmpaque: 5,
        costoEtiqueta: 1,
        esMaquila: true,
        maquilaIncluyeEmpaque: true,
        costoManoObra: 10,
        costoEnergia: 4,
        tiempoProduccionHoras: 2.5,
        costoTransporte: 3,
        costoMermas: 2,
        costoGastosGenerales: 6,
        precioVentaReal: 150,
        estadoPago: 'PAGADO',
        fechaPago: '2026-08-01',
      });

      expect(prisma.productionOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            costoEmpaque: 5,
            costoEtiqueta: 1,
            esMaquila: true,
            maquilaIncluyeEmpaque: true,
            costoManoObra: 10,
            costoEnergia: 4,
            tiempoProduccionHoras: 2.5,
            costoTransporte: 3,
            costoMermas: 2,
            costoGastosGenerales: 6,
            precioVentaReal: 150,
            estadoPago: 'PAGADO',
            fechaPago: new Date('2026-08-01'),
          }),
        }),
      );
    });

    it('guarda estadoProduccion y notasCalidad cuando se envian, y no fija nada si no se envian', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: null,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
        estadoProduccion: 'EN_CALIDAD',
        notasCalidad: 'Pendiente de revisar pH.',
      });

      expect(prisma.productionOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            estadoProduccion: 'EN_CALIDAD',
            notasCalidad: 'Pendiente de revisar pH.',
          }),
        }),
      );
    });

    it('el precio sugerido y la utilidad reflejan el costo TOTAL (ingredientes + operativos), no solo ingredientes', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: null,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
        margenPorcentaje: 0,
        costoEmpaque: 5,
        costoEtiqueta: 1,
        costoManoObra: 10,
        costoEnergia: 4,
        costoTransporte: 3,
        costoMermas: 2,
        costoGastosGenerales: 6,
      });

      // costoEscalado (100, solo ingredientes) + operativos (5+1+10+4+3+2+6=31) = 131 costo total;
      // con margen 0% el precio sugerido debe ser igual al costo total, y la utilidad 0.
      expect(prisma.productionOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            costoEscalado: 100,
            precioVentaSugerido: 131,
            utilidadEstimada: 0,
          }),
        }),
      );
    });

    it('sincroniza montoCobrado con el total cuando se marca PAGADO directo (sin pasar por abonos)', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: null,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
        precioVentaReal: 200,
        estadoPago: 'PAGADO',
      });

      expect(prisma.productionOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            estadoPago: 'PAGADO',
            montoCobrado: 200,
          }),
        }),
      );
    });

    it('no fija montoCobrado si no se marca PAGADO al crear', async () => {
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        vidaUtilDias: null,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.create.mockResolvedValue({ id: 'po-1' });

      await service.create('user-1', 'org-1', {
        formulationId: 'f-1',
        cantidadObjetivoKg: 1,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.productionOrder.create.mock.calls[0][0] as {
        data: { montoCobrado: unknown };
      };
      expect(llamada.data.montoCobrado).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('filtra por formulationId cuando se envia', async () => {
      prisma.productionOrder.findMany.mockResolvedValue([]);

      await service.findAll('org-1', 'f-1');

      expect(prisma.productionOrder.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', formulationId: 'f-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('no filtra por formulacion cuando no se envia', async () => {
      prisma.productionOrder.findMany.mockResolvedValue([]);

      await service.findAll('org-1');

      expect(prisma.productionOrder.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si la orden no existe o no es del usuario', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.update('org-1', 'po-1', { cantidadObjetivoKg: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si la formulacion asociada ya no existe o no es del usuario', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        formulationId: 'f-1',
        cantidadObjetivoKg: 2,
        margenPorcentaje: 30,
      });
      prisma.formulation.findFirst.mockResolvedValue(null);

      await expect(
        service.update('org-1', 'po-1', { cantidadObjetivoKg: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('recalcula el costo/utilidad contra el estado actual de la formulacion y actualiza la orden', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        formulationId: 'f-1',
        cantidadObjetivoKg: 2,
        margenPorcentaje: 30,
        costoEmpaque: 0,
        costoEtiqueta: 0,
        costoManoObra: 0,
        costoEnergia: 0,
        costoTransporte: 0,
        costoMermas: 0,
        costoGastosGenerales: 0,
      });
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        ingredientes: [{ precioTotal: 100 }, { precioTotal: 50 }],
      });
      prisma.productionOrder.update.mockResolvedValue({ id: 'po-1' });

      await service.update('org-1', 'po-1', { cantidadObjetivoKg: 3 });

      expect(prisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            cantidadObjetivoKg: 3,
            margenPorcentaje: 30,
            costoEscalado: 450,
          }),
        }),
      );
    });

    it('usa los valores existentes de la orden cuando el dto no los envia', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        formulationId: 'f-1',
        cantidadObjetivoKg: 2,
        margenPorcentaje: 30,
        costoEmpaque: 0,
        costoEtiqueta: 0,
        costoManoObra: 0,
        costoEnergia: 0,
        costoTransporte: 0,
        costoMermas: 0,
        costoGastosGenerales: 0,
      });
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        ingredientes: [{ precioTotal: 100 }, { precioTotal: 50 }],
      });
      prisma.productionOrder.update.mockResolvedValue({ id: 'po-1' });

      await service.update('org-1', 'po-1', {});

      expect(prisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            cantidadObjetivoKg: 2,
            margenPorcentaje: 30,
            costoEscalado: 300,
          }),
        }),
      );
    });

    it('actualiza numero de lote, vencimiento, costos operativos y estado de pago cuando se envian', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        formulationId: 'f-1',
        cantidadObjetivoKg: 2,
        margenPorcentaje: 30,
        costoGastosGenerales: 0,
      });
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.update.mockResolvedValue({ id: 'po-1' });

      await service.update('org-1', 'po-1', {
        numeroLote: '  LOTE-EDITADO  ',
        fechaVencimiento: '2027-02-01',
        costoEmpaque: 7,
        costoEtiqueta: 1.5,
        esMaquila: false,
        maquilaIncluyeEmpaque: false,
        costoManoObra: 8,
        costoEnergia: 3,
        tiempoProduccionHoras: 4,
        costoTransporte: 1,
        costoMermas: 0.5,
        costoGastosGenerales: 2,
        precioVentaReal: 200,
        estadoPago: 'PAGADO',
        fechaPago: '2026-09-01',
      });

      expect(prisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            numeroLote: 'LOTE-EDITADO',
            fechaVencimiento: new Date('2027-02-01'),
            // costoEscalado (100 x 2kg = 200, solo ingredientes) + operativos (7+1.5+8+3+1+0.5+2=23)
            // = 223 costo total; con margen 30% precioVentaSugerido = 223 / 0.7 = 318.57.
            costoEscalado: 200,
            precioVentaSugerido: 318.57,
            utilidadEstimada: 95.57,
            costoEmpaque: 7,
            costoEtiqueta: 1.5,
            esMaquila: false,
            maquilaIncluyeEmpaque: false,
            costoManoObra: 8,
            costoEnergia: 3,
            tiempoProduccionHoras: 4,
            costoTransporte: 1,
            costoMermas: 0.5,
            costoGastosGenerales: 2,
            precioVentaReal: 200,
            estadoPago: 'PAGADO',
            montoCobrado: 200,
            fechaPago: new Date('2026-09-01'),
          }),
        }),
      );
    });

    it('vuelve montoCobrado a 0 al marcar PENDIENTE directo', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        formulationId: 'f-1',
        cantidadObjetivoKg: 2,
        margenPorcentaje: 30,
        costoGastosGenerales: 0,
        precioVentaReal: 200,
      });
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.update.mockResolvedValue({ id: 'po-1' });

      await service.update('org-1', 'po-1', { estadoPago: 'PENDIENTE' });

      expect(prisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            estadoPago: 'PENDIENTE',
            montoCobrado: 0,
          }),
        }),
      );
    });

    it('actualiza estadoProduccion y notasCalidad cuando se envian (ej. rechazar un lote en calidad)', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        formulationId: 'f-1',
        cantidadObjetivoKg: 2,
        margenPorcentaje: 30,
        costoGastosGenerales: 0,
        precioVentaReal: null,
      });
      prisma.formulation.findFirst.mockResolvedValue({
        id: 'f-1',
        cantidadBaseKg: 1,
        margenPorcentaje: 30,
        impuestoPorcentaje: 19,
        ingredientes: [{ precioTotal: 100 }],
      });
      prisma.productionOrder.update.mockResolvedValue({ id: 'po-1' });

      await service.update('org-1', 'po-1', {
        estadoProduccion: 'RECHAZADO',
        notasCalidad: 'No paso la prueba de viscosidad.',
      });

      expect(prisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            estadoProduccion: 'RECHAZADO',
            notasCalidad: 'No paso la prueba de viscosidad.',
          }),
        }),
      );
    });
  });

  describe('pagos (abonos parciales)', () => {
    const ORDEN_BASE = {
      id: 'po-1',
      organizationId: 'org-1',
      precioVentaReal: null,
      precioVentaSugerido: 100,
    };

    it('addPago crea el abono y recalcula PARCIAL cuando no cubre el total', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue(ORDEN_BASE);
      prisma.pago.create.mockResolvedValue({ id: 'pago-1' });
      prisma.productionOrder.findUniqueOrThrow.mockResolvedValue(ORDEN_BASE);
      prisma.pago.aggregate.mockResolvedValue({ _sum: { monto: 40 } });
      prisma.productionOrder.update.mockResolvedValue({ id: 'po-1' });

      await service.addPago('org-1', 'po-1', { monto: 40 });

      expect(prisma.pago.create).toHaveBeenCalledWith({
        data: { productionOrderId: 'po-1', monto: 40, fecha: undefined },
      });
      expect(prisma.productionOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: { montoCobrado: 40, estadoPago: 'PARCIAL', fechaPago: null },
      });
    });

    it('addPago marca PAGADO y fija fechaPago cuando los abonos cubren el total', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue(ORDEN_BASE);
      prisma.pago.create.mockResolvedValue({ id: 'pago-2' });
      prisma.productionOrder.findUniqueOrThrow.mockResolvedValue(ORDEN_BASE);
      prisma.pago.aggregate.mockResolvedValue({ _sum: { monto: 100 } });
      const fechaUltimoPago = new Date('2026-08-15');
      prisma.pago.findFirst.mockResolvedValue({
        id: 'pago-2',
        fecha: fechaUltimoPago,
      });
      prisma.productionOrder.update.mockResolvedValue({ id: 'po-1' });

      await service.addPago('org-1', 'po-1', { monto: 100 });

      expect(prisma.productionOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: {
          montoCobrado: 100,
          estadoPago: 'PAGADO',
          fechaPago: fechaUltimoPago,
        },
      });
    });

    it('addPago lanza NotFoundException si el lote no es de la organizacion', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.addPago('org-1', 'po-inexistente', { monto: 10 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.pago.create).not.toHaveBeenCalled();
    });

    it('listPagos devuelve los abonos del lote, mas reciente primero', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue(ORDEN_BASE);
      prisma.pago.findMany.mockResolvedValue([]);

      await service.listPagos('org-1', 'po-1');

      expect(prisma.pago.findMany).toHaveBeenCalledWith({
        where: { productionOrderId: 'po-1' },
        orderBy: { fecha: 'desc' },
      });
    });

    it('removePago lanza NotFoundException si el abono no existe o no es de ese lote', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue(ORDEN_BASE);
      prisma.pago.findFirst.mockResolvedValue(null);

      await expect(
        service.removePago('org-1', 'po-1', 'pago-inexistente', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.pago.delete).not.toHaveBeenCalled();
    });

    it('removePago borra el abono, lo audita y vuelve a PENDIENTE si ya no queda nada cobrado', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue(ORDEN_BASE);
      prisma.pago.findFirst.mockResolvedValue({
        id: 'pago-1',
        productionOrderId: 'po-1',
        monto: 50,
      });
      prisma.pago.delete.mockResolvedValue({ id: 'pago-1' });
      prisma.productionOrder.findUniqueOrThrow.mockResolvedValue(ORDEN_BASE);
      prisma.pago.aggregate.mockResolvedValue({ _sum: { monto: null } });
      prisma.productionOrder.update.mockResolvedValue({ id: 'po-1' });

      await service.removePago('org-1', 'po-1', 'pago-1', 'user-1');

      expect(prisma.pago.delete).toHaveBeenCalledWith({
        where: { id: 'pago-1' },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'PAGO_DELETED',
        expect.objectContaining({
          userId: 'user-1',
          metadata: {
            productionOrderId: 'po-1',
            pagoId: 'pago-1',
            monto: '50',
          },
        }),
      );
      expect(prisma.productionOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: { montoCobrado: 0, estadoPago: 'PENDIENTE', fechaPago: null },
      });
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si la orden no existe o no es del usuario', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue(null);

      await expect(service.remove('org-1', 'po-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.productionOrder.delete).not.toHaveBeenCalled();
    });

    it('elimina la orden cuando pertenece al usuario y lo audita', async () => {
      prisma.productionOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        numeroLote: 'LOTE-1',
        costoEscalado: 80,
        precioVentaSugerido: 100,
        precioVentaReal: null,
      });
      prisma.productionOrder.delete.mockResolvedValue({ id: 'po-1' });

      await service.remove('org-1', 'po-1', 'user-1');

      expect(prisma.productionOrder.delete).toHaveBeenCalledWith({
        where: { id: 'po-1' },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'PRODUCTION_ORDER_DELETED',
        expect.objectContaining({
          userId: 'user-1',
          metadata: {
            productionOrderId: 'po-1',
            numeroLote: 'LOTE-1',
            costoEscalado: '80',
            ingresoReal: '100',
          },
        }),
      );
    });
  });
});
