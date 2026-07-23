import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Proveedores son de solo lectura desde aca: se crean automaticamente al registrar un precio
 * de ingrediente (ver FormulationsService.updateIngredientPrice). Este servicio solo expone
 * la comparacion entre ellos, no un CRUD independiente.
 */
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

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
