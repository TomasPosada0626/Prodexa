import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FormulationsService } from './formulations.service';
import { CreateFormulationDto } from './dto/create-formulation.dto';

describe('FormulationsService', () => {
  let service: FormulationsService;
  const auditService = { log: jest.fn() };
  const USER_ID = 'user-1';
  const ORG_ID = 'org-1';
  const prisma = {
    formulation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    formulationVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    supplierPrice: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    supplier: {
      upsert: jest.fn(),
    },
    ingredient: {
      update: jest.fn(),
    },
    productionOrder: {
      count: jest.fn(),
    },
  };

  const formulacionCompleta = {
    id: '1',
    userId: USER_ID,
    organizationId: ORG_ID,
    nombreProducto: 'Crema',
    registroSanitario: null,
    registroSanitarioVencimiento: null,
    preparacionHtml: null,
    cantidadBaseKg: 1,
    margenPorcentaje: 30,
    impuestoPorcentaje: 19,
    ingredientes: [
      {
        id: 'ing-1',
        nombre: 'Agua',
        porcentaje: 80,
        cantidadGramosBase: 800,
        cantidadKg: 0.8,
        precioKg: 10,
        precioTotal: 8,
      },
    ],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        FormulationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(FormulationsService);
  });

  it('crea una formulacion con ingredientes anidados para la empresa dueña', async () => {
    const dto: CreateFormulationDto = {
      nombreProducto: 'Crema hidratante',
      registroSanitario: 'RS-001',
      preparacionHtml: '<p>Mezclar</p><p>Envasar</p>',
      cantidadBaseKg: 0.8,
      margenPorcentaje: 40,
      impuestoPorcentaje: 19,
      ingredientes: [
        {
          nombre: 'Agua',
          porcentaje: 80,
          cantidadGramosBase: 800,
          cantidadKg: 0.8,
          precioKg: 1,
          precioTotal: 0.8,
        },
      ],
    };
    prisma.formulation.create.mockResolvedValue({
      id: '1',
      userId: USER_ID,
      organizationId: ORG_ID,
      impuestoPorcentaje: 19,
      ...dto,
    });
    prisma.formulationVersion.create.mockResolvedValue({});

    await service.create(USER_ID, ORG_ID, dto);

    expect(prisma.formulation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          userId: USER_ID,
          organizationId: ORG_ID,
          nombreProducto: 'Crema hidratante',
          preparacionHtml: '<p>Mezclar</p><p>Envasar</p>',
          cantidadBaseKg: 0.8,
          margenPorcentaje: 40,
        }),
      }),
    );
    expect(prisma.formulationVersion.create).toHaveBeenCalled();
  });

  it('crea con fecha de vencimiento cuando se envia', async () => {
    const dto: CreateFormulationDto = {
      nombreProducto: 'Crema',
      cantidadBaseKg: 1,
      registroSanitarioVencimiento: '2027-01-31',
      ingredientes: [],
    };
    prisma.formulation.create.mockResolvedValue({
      id: '1',
      ...dto,
      registroSanitarioVencimiento: new Date(
        dto.registroSanitarioVencimiento as string,
      ),
      margenPorcentaje: 30,
      impuestoPorcentaje: 19,
      ingredientes: [],
    });
    prisma.formulationVersion.create.mockResolvedValue({});

    await service.create(USER_ID, ORG_ID, dto);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const createArgs = prisma.formulation.create.mock.calls[0][0] as {
      data: { registroSanitarioVencimiento: Date };
    };
    expect(createArgs.data.registroSanitarioVencimiento).toBeInstanceOf(Date);
  });

  it('crea con tiempo estimado de produccion cuando se envia', async () => {
    const dto: CreateFormulationDto = {
      nombreProducto: 'Crema',
      cantidadBaseKg: 1,
      tiempoProduccionHoras: 2.5,
      ingredientes: [],
    };
    prisma.formulation.create.mockResolvedValue({
      id: '1',
      ...dto,
      margenPorcentaje: 30,
      impuestoPorcentaje: 19,
      ingredientes: [],
    });
    prisma.formulationVersion.create.mockResolvedValue({});

    await service.create(USER_ID, ORG_ID, dto);

    expect(prisma.formulation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ tiempoProduccionHoras: 2.5 }),
      }),
    );
  });

  it('findAll devuelve las formulaciones activas de la empresa ordenadas por mas reciente', async () => {
    prisma.formulation.findMany.mockResolvedValue([]);

    await service.findAll(ORG_ID);

    expect(prisma.formulation.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID, activa: true },
      include: { ingredientes: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('findAll incluye tambien las archivadas cuando incluirArchivadas es true', async () => {
    prisma.formulation.findMany.mockResolvedValue([]);

    await service.findAll(ORG_ID, true);

    expect(prisma.formulation.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      include: { ingredientes: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('lanza NotFoundException si la formulacion no existe o no pertenece a la empresa', async () => {
    prisma.formulation.findFirst.mockResolvedValue(null);

    await expect(service.findOne(ORG_ID, 'inexistente')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.formulation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inexistente', organizationId: ORG_ID },
      }),
    );
  });

  it('devuelve la formulacion cuando existe y pertenece a la empresa', async () => {
    const formulation = {
      id: '1',
      organizationId: ORG_ID,
      nombreProducto: 'Crema',
    };
    prisma.formulation.findFirst.mockResolvedValue(formulation);

    await expect(service.findOne(ORG_ID, '1')).resolves.toEqual(formulation);
  });

  describe('update', () => {
    it('actualiza campos simples y guarda snapshot previo', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);
      prisma.formulationVersion.create.mockResolvedValue({});
      prisma.formulation.update.mockResolvedValue({
        id: '1',
        margenPorcentaje: 45,
      });

      const result = await service.update(
        ORG_ID,
        '1',
        { margenPorcentaje: 45 },
        USER_ID,
      );

      expect(prisma.formulationVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ formulationId: '1' }),
        }),
      );
      expect(prisma.formulation.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { margenPorcentaje: 45 },
        include: { ingredientes: true },
      });
      expect(result).toEqual({ id: '1', margenPorcentaje: 45 });
      expect(auditService.log).toHaveBeenCalledWith(
        'FORMULATION_UPDATED',
        expect.objectContaining({
          userId: USER_ID,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({ formulationId: '1' }),
        }),
      );
    });

    it('convierte la fecha de vencimiento cuando se envia', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);
      prisma.formulationVersion.create.mockResolvedValue({});
      prisma.formulation.update.mockResolvedValue({});

      await service.update(
        ORG_ID,
        '1',
        { registroSanitarioVencimiento: '2027-06-30' },
        USER_ID,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const updateArgs = prisma.formulation.update.mock.calls[0][0] as {
        data: { registroSanitarioVencimiento: Date };
      };
      expect(updateArgs.data.registroSanitarioVencimiento).toBeInstanceOf(Date);
    });

    it('limpia la fecha de vencimiento cuando se envia vacia', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);
      prisma.formulationVersion.create.mockResolvedValue({});
      prisma.formulation.update.mockResolvedValue({});

      await service.update(
        ORG_ID,
        '1',
        { registroSanitarioVencimiento: '' },
        USER_ID,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const updateArgs = prisma.formulation.update.mock.calls[0][0] as {
        data: { registroSanitarioVencimiento: Date | null };
      };
      expect(updateArgs.data.registroSanitarioVencimiento).toBeNull();
    });

    it('reemplaza la lista completa de ingredientes cuando se envia', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);
      prisma.formulationVersion.create.mockResolvedValue({});
      prisma.formulation.update.mockResolvedValue({});

      await service.update(
        ORG_ID,
        '1',
        {
          ingredientes: [
            {
              nombre: 'Aceite',
              porcentaje: 20,
              cantidadGramosBase: 200,
              cantidadKg: 0.2,
              precioKg: 5,
              precioTotal: 1,
            },
          ],
        },
        USER_ID,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const updateArgs = prisma.formulation.update.mock.calls[0][0] as {
        data: { ingredientes: { deleteMany: object; create: unknown[] } };
      };
      expect(updateArgs.data.ingredientes.deleteMany).toEqual({});
      expect(updateArgs.data.ingredientes.create).toHaveLength(1);
    });
  });

  it('elimina una formulacion existente sin lotes de produccion', async () => {
    prisma.formulation.findFirst.mockResolvedValue({
      id: '1',
      organizationId: ORG_ID,
    });
    prisma.productionOrder.count.mockResolvedValue(0);
    prisma.formulation.delete.mockResolvedValue({ id: '1' });

    await service.remove(ORG_ID, '1');

    expect(prisma.formulation.delete).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });

  it('bloquea el borrado si la formulacion ya tiene lotes de produccion registrados', async () => {
    prisma.formulation.findFirst.mockResolvedValue({
      id: '1',
      organizationId: ORG_ID,
    });
    prisma.productionOrder.count.mockResolvedValue(3);

    await expect(service.remove(ORG_ID, '1')).rejects.toThrow(
      /3 lotes de produccion registrados/,
    );
    expect(prisma.formulation.delete).not.toHaveBeenCalled();
  });

  describe('updateIngredientPrice', () => {
    it('lanza NotFoundException si el ingrediente no existe en la formulacion', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);

      await expect(
        service.updateIngredientPrice(
          ORG_ID,
          '1',
          'inexistente',
          { precioKg: 12, proveedor: 'Proveedor Test' },
          USER_ID,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.supplierPrice.create).not.toHaveBeenCalled();
    });

    it('registra el nuevo precio en el historial y recalcula el precio total', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);
      prisma.supplier.upsert.mockResolvedValue({ id: 'sup-1' });
      prisma.supplierPrice.create.mockResolvedValue({});
      prisma.ingredient.update.mockResolvedValue({ id: 'ing-1' });

      await service.updateIngredientPrice(
        ORG_ID,
        '1',
        'ing-1',
        { precioKg: 12, proveedor: 'Proveedor X' },
        USER_ID,
      );

      expect(prisma.supplier.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_nombre: {
            organizationId: ORG_ID,
            nombre: 'Proveedor X',
          },
        },
        create: { organizationId: ORG_ID, nombre: 'Proveedor X' },
        update: {},
      });
      expect(prisma.supplierPrice.create).toHaveBeenCalledWith({
        data: {
          ingredientId: 'ing-1',
          precioKg: 12,
          proveedor: 'Proveedor X',
          supplierId: 'sup-1',
        },
      });
      expect(prisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { precioKg: 12, precioTotal: 9.6 },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        'INGREDIENT_PRICE_UPDATED',
        expect.objectContaining({
          userId: USER_ID,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          metadata: expect.objectContaining({
            ingredienteNombre: 'Agua',
            precioNuevo: 12,
            proveedor: 'Proveedor X',
          }),
        }),
      );
    });
  });

  describe('getIngredientPriceHistory', () => {
    it('lanza NotFoundException si el ingrediente no existe en la formulacion', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);

      await expect(
        service.getIngredientPriceHistory(ORG_ID, '1', 'inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devuelve el historial de precios mas reciente primero', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);
      prisma.supplierPrice.findMany.mockResolvedValue([{ id: 'sp-1' }]);

      const result = await service.getIngredientPriceHistory(
        ORG_ID,
        '1',
        'ing-1',
      );

      expect(prisma.supplierPrice.findMany).toHaveBeenCalledWith({
        where: { ingredientId: 'ing-1' },
        orderBy: { vigenteDesde: 'desc' },
      });
      expect(result).toEqual([{ id: 'sp-1' }]);
    });
  });

  describe('getVersions', () => {
    it('lanza NotFoundException si la formulacion no pertenece a la empresa', async () => {
      prisma.formulation.findFirst.mockResolvedValue(null);

      await expect(service.getVersions(ORG_ID, '1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el historial de versiones mas reciente primero', async () => {
      prisma.formulation.findFirst.mockResolvedValue(formulacionCompleta);
      prisma.formulationVersion.findMany.mockResolvedValue([{ id: 'v-1' }]);

      const result = await service.getVersions(ORG_ID, '1');

      expect(prisma.formulationVersion.findMany).toHaveBeenCalledWith({
        where: { formulationId: '1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ id: 'v-1' }]);
    });
  });
});
