import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuppliersService } from './suppliers.service';

function errorNombreDuplicado(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('SuppliersService', () => {
  let service: SuppliersService;
  const prisma = {
    supplier: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

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

  describe('create', () => {
    it('crea un proveedor con el nombre recortado', async () => {
      prisma.supplier.create.mockResolvedValue({
        id: 'sup-1',
        nombre: 'Distribuidora XYZ',
      });

      const result = await service.create('org-1', '  Distribuidora XYZ  ');

      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: { organizationId: 'org-1', nombre: 'Distribuidora XYZ' },
      });
      expect(result).toEqual({ id: 'sup-1', nombre: 'Distribuidora XYZ' });
    });

    it('lanza BadRequestException si ya existe un proveedor con ese nombre', async () => {
      prisma.supplier.create.mockRejectedValue(errorNombreDuplicado());

      await expect(service.create('org-1', 'Repetido')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rename', () => {
    it('lanza NotFoundException si el proveedor no existe o no es de la empresa', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.rename('org-1', 'inexistente', 'Nuevo nombre'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.supplier.update).not.toHaveBeenCalled();
    });

    it('renombra el proveedor', async () => {
      prisma.supplier.findFirst.mockResolvedValue({
        id: 'sup-1',
        organizationId: 'org-1',
      });
      prisma.supplier.update.mockResolvedValue({
        id: 'sup-1',
        nombre: 'Nuevo nombre',
      });

      const result = await service.rename('org-1', 'sup-1', 'Nuevo nombre');

      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
        data: { nombre: 'Nuevo nombre' },
      });
      expect(result).toEqual({ id: 'sup-1', nombre: 'Nuevo nombre' });
    });

    it('lanza BadRequestException si el nuevo nombre ya lo usa otro proveedor', async () => {
      prisma.supplier.findFirst.mockResolvedValue({
        id: 'sup-1',
        organizationId: 'org-1',
      });
      prisma.supplier.update.mockRejectedValue(errorNombreDuplicado());

      await expect(
        service.rename('org-1', 'sup-1', 'Repetido'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si el proveedor no existe o no es de la empresa', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);

      await expect(service.remove('org-1', 'inexistente')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.supplier.delete).not.toHaveBeenCalled();
    });

    it('elimina el proveedor (el historial de precios se conserva via SetNull)', async () => {
      prisma.supplier.findFirst.mockResolvedValue({
        id: 'sup-1',
        organizationId: 'org-1',
      });
      prisma.supplier.delete.mockResolvedValue({ id: 'sup-1' });

      await service.remove('org-1', 'sup-1');

      expect(prisma.supplier.delete).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
      });
    });
  });
});
