import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Proveedores se crean automaticamente al registrar un precio de ingrediente (ver
 * FormulationsService.updateIngredientPrice), pero tambien se pueden gestionar a mano aca:
 * crear uno antes de tener un precio, renombrar (ej. corregir "epm" vs "Epm" duplicados) o
 * eliminar un huerfano. Borrar un proveedor es seguro: SupplierPrice.supplierId es SetNull,
 * el historial de precios se conserva con su nombre de texto libre, solo se pierde el enlace formal.
 */
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, nombre: string) {
    const nombreLimpio = nombre.trim();
    try {
      return await this.prisma.supplier.create({
        data: { organizationId, nombre: nombreLimpio },
      });
    } catch (error) {
      throw this.traducirErrorDeNombreDuplicado(error, nombreLimpio);
    }
  }

  async rename(organizationId: string, id: string, nombre: string) {
    await this.findOwned(organizationId, id);
    const nombreLimpio = nombre.trim();
    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: { nombre: nombreLimpio },
      });
    } catch (error) {
      throw this.traducirErrorDeNombreDuplicado(error, nombreLimpio);
    }
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOwned(organizationId, id);
    await this.prisma.supplier.delete({ where: { id } });
  }

  private async findOwned(organizationId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId },
    });
    if (!supplier) {
      throw new NotFoundException(`No se encontro el proveedor con id ${id}`);
    }
    return supplier;
  }

  private traducirErrorDeNombreDuplicado(
    error: unknown,
    nombre: string,
  ): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new BadRequestException(
        `Ya existe un proveedor llamado "${nombre}" en tu empresa.`,
      );
    }
    return error;
  }

  /**
   * Cada proveedor con todos sus precios registrados (ingrediente + formulacion a la que
   * pertenece), para poder comparar quien resulta mas barato/reciente por ingrediente.
   */
  async listForOrganization(organizationId: string) {
    const proveedores = await this.prisma.supplier.findMany({
      where: { organizationId },
      orderBy: { nombre: 'asc' },
      include: {
        precios: {
          orderBy: { vigenteDesde: 'desc' },
          include: {
            ingrediente: {
              select: {
                id: true,
                nombre: true,
                formulation: { select: { id: true, nombreProducto: true } },
              },
            },
          },
        },
      },
    });

    return proveedores.map((proveedor) => ({
      id: proveedor.id,
      nombre: proveedor.nombre,
      createdAt: proveedor.createdAt,
      precios: proveedor.precios.map((precio) => ({
        id: precio.id,
        precioKg: precio.precioKg,
        vigenteDesde: precio.vigenteDesde,
        ingredienteId: precio.ingrediente.id,
        ingredienteNombre: precio.ingrediente.nombre,
        formulationId: precio.ingrediente.formulation.id,
        formulationNombre: precio.ingrediente.formulation.nombreProducto,
      })),
    }));
  }
}
