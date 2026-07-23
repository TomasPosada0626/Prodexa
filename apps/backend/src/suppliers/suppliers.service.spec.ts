import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  const prisma = { supplier: { findMany: jest.fn() } };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SuppliersService);
  });

  describe('listForOrganization', () => {
    it('escopa por organizationId y ordena por nombre', async () => {
      prisma.supplier.findMany.mockResolvedValue([]);

      await service.listForOrganization('org-1');

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
          orderBy: { nombre: 'asc' },
        }),
      );
    });

    it('aplana los precios con el ingrediente y la formulacion a la que pertenecen', async () => {
      prisma.supplier.findMany.mockResolvedValue([
        {
          id: 'sup-1',
          nombre: 'Proveedor X',
          createdAt: new Date('2026-01-01'),
          precios: [
            {
              id: 'sp-1',
              precioKg: 1500,
              vigenteDesde: new Date('2026-02-01'),
              ingrediente: {
                id: 'ing-1',
                nombre: 'Aceite de coco',
                formulation: { id: 'f-1', nombreProducto: 'Jabon' },
              },
            },
          ],
        },
      ]);

      const result = await service.listForOrganization('org-1');

      expect(result).toEqual([
        {
          id: 'sup-1',
          nombre: 'Proveedor X',
          createdAt: new Date('2026-01-01'),
          precios: [
            {
              id: 'sp-1',
              precioKg: 1500,
              vigenteDesde: new Date('2026-02-01'),
              ingredienteId: 'ing-1',
              ingredienteNombre: 'Aceite de coco',
              formulationId: 'f-1',
              formulationNombre: 'Jabon',
            },
          ],
        },
      ]);
    });
  });
});
