import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../audit/audit.types';
import { CreateFormulationDto } from './dto/create-formulation.dto';
import { UpdateFormulationDto } from './dto/update-formulation.dto';
import { UpdateIngredientPriceDto } from './dto/update-ingredient-price.dto';

const FORMULATION_INCLUDE = {
  ingredientes: true,
};

interface FormulationWithIngredientes {
  nombreProducto: string;
  registroSanitario: string | null;
  registroSanitarioVencimiento: Date | null;
  preparacionHtml: string | null;
  cantidadBaseKg: Prisma.Decimal;
  margenPorcentaje: Prisma.Decimal;
  impuestoPorcentaje: Prisma.Decimal;
  ingredientes: Array<{
    nombre: string;
    porcentaje: Prisma.Decimal;
    cantidadGramosBase: Prisma.Decimal;
    cantidadKg: Prisma.Decimal;
    precioKg: Prisma.Decimal;
    precioTotal: Prisma.Decimal;
  }>;
}

/** Convierte una formulacion (con sus ingredientes) a un objeto plano serializable en JSON para el snapshot. */
function buildSnapshot(
  formulation: FormulationWithIngredientes,
): Prisma.InputJsonValue {
  return {
    nombreProducto: formulation.nombreProducto,
    registroSanitario: formulation.registroSanitario,
    registroSanitarioVencimiento:
      formulation.registroSanitarioVencimiento?.toISOString() ?? null,
    preparacionHtml: formulation.preparacionHtml,
    cantidadBaseKg: formulation.cantidadBaseKg.toString(),
    margenPorcentaje: formulation.margenPorcentaje.toString(),
    impuestoPorcentaje: formulation.impuestoPorcentaje.toString(),
    ingredientes: formulation.ingredientes.map((i) => ({
      nombre: i.nombre,
      porcentaje: i.porcentaje.toString(),
      cantidadGramosBase: i.cantidadGramosBase.toString(),
      cantidadKg: i.cantidadKg.toString(),
      precioKg: i.precioKg.toString(),
      precioTotal: i.precioTotal.toString(),
    })),
  };
}

/**
 * Todo en este servicio se filtra por organizationId, no por userId: una formulacion la ve
 * y (segun el rol) la edita cualquiera de la misma empresa, no solo quien la creo. userId se
 * sigue guardando al crear, solo como dato de "quien la creo", no para controlar acceso.
 */
@Injectable()
export class FormulationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    dto: CreateFormulationDto,
  ) {
    const formulation = await this.prisma.formulation.create({
      data: {
        userId,
        organizationId,
        nombreProducto: dto.nombreProducto,
        categoria: dto.categoria,
        registroSanitario: dto.registroSanitario,
        registroSanitarioEstado: dto.registroSanitarioEstado,
        registroSanitarioVencimiento: dto.registroSanitarioVencimiento
          ? new Date(dto.registroSanitarioVencimiento)
          : undefined,
        preparacionHtml: dto.preparacionHtml,
        cantidadBaseKg: dto.cantidadBaseKg,
        ...(dto.margenPorcentaje !== undefined && {
          margenPorcentaje: dto.margenPorcentaje,
        }),
        ...(dto.impuestoPorcentaje !== undefined && {
          impuestoPorcentaje: dto.impuestoPorcentaje,
        }),
        vidaUtilDias: dto.vidaUtilDias,
        tiempoProduccionHoras: dto.tiempoProduccionHoras,
        ingredientes: {
          create: dto.ingredientes.map((ingrediente) => ({
            nombre: ingrediente.nombre,
            porcentaje: ingrediente.porcentaje,
            cantidadGramosBase: ingrediente.cantidadGramosBase,
            cantidadKg: ingrediente.cantidadKg,
            precioKg: ingrediente.precioKg,
            precioTotal: ingrediente.precioTotal,
          })),
        },
      },
      include: FORMULATION_INCLUDE,
    });

    // Version inicial: el estado con el que nace la formulacion.
    await this.prisma.formulationVersion.create({
      data: {
        formulationId: formulation.id,
        snapshot: buildSnapshot(formulation),
      },
    });

    return formulation;
  }

  /** Por defecto solo trae las activas: una formulacion archivada deja de ofrecerse en
   * Preparar/Costos/el selector normal, pero se puede seguir consultando con incluirArchivadas. */
  findAll(organizationId: string, incluirArchivadas = false) {
    return this.prisma.formulation.findMany({
      where: { organizationId, ...(!incluirArchivadas && { activa: true }) },
      include: FORMULATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const formulation = await this.prisma.formulation.findFirst({
      where: { id, organizationId },
      include: FORMULATION_INCLUDE,
    });

    if (!formulation) {
      throw new NotFoundException(`No se encontro la formulacion con id ${id}`);
    }

    return formulation;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateFormulationDto,
    userId: string,
  ) {
    const actual = await this.findOne(organizationId, id);
    const { ingredientes, registroSanitarioVencimiento, ...rest } = dto;

    // Guarda el estado ANTES de aplicar el cambio: el historial queda como una
    // linea de tiempo de "como estaba justo antes de cada edicion".
    await this.prisma.formulationVersion.create({
      data: {
        formulationId: id,
        snapshot: buildSnapshot(actual),
      },
    });

    const actualizada = await this.prisma.formulation.update({
      where: { id },
      data: {
        ...rest,
        ...(registroSanitarioVencimiento !== undefined && {
          registroSanitarioVencimiento: registroSanitarioVencimiento
            ? new Date(registroSanitarioVencimiento)
            : null,
        }),
        // Reemplaza la lista completa de ingredientes cuando se envia: mas simple y
        // predecible que hacer diff/merge por id contra lo que ya existe en la BD.
        ...(ingredientes && {
          ingredientes: {
            deleteMany: {},
            create: ingredientes.map((ingrediente) => ({
              nombre: ingrediente.nombre,
              porcentaje: ingrediente.porcentaje,
              cantidadGramosBase: ingrediente.cantidadGramosBase,
              cantidadKg: ingrediente.cantidadKg,
              precioKg: ingrediente.precioKg,
              precioTotal: ingrediente.precioTotal,
            })),
          },
        }),
      },
      include: FORMULATION_INCLUDE,
    });

    void this.auditService.log(AuditEvent.FORMULATION_UPDATED, {
      userId,
      metadata: {
        formulationId: id,
        nombreProducto: actual.nombreProducto,
        campos: Object.keys(dto),
      },
    });

    return actualizada;
  }

  /**
   * Eliminar borra en cascada TODAS las ordenes de produccion (y sus pagos) de esta
   * formulacion — un historial financiero real irrecuperable. Si ya tiene lotes registrados,
   * se bloquea el borrado y se sugiere archivar en su lugar (ver UpdateFormulationDto.activa).
   */
  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    const lotesCount = await this.prisma.productionOrder.count({
      where: { formulationId: id },
    });
    if (lotesCount > 0) {
      throw new BadRequestException(
        `Esta formulacion tiene ${lotesCount} lote${lotesCount === 1 ? '' : 's'} de produccion registrado${lotesCount === 1 ? '' : 's'} y no se puede eliminar (se perderia ese historial). Archivala en su lugar para dejar de usarla sin perder los datos.`,
      );
    }
    await this.prisma.formulation.delete({ where: { id } });
  }

  /**
   * Actualiza el precio activo de un ingrediente y registra el cambio en SupplierPrice
   * para trazabilidad historica. precioTotal se recalcula con el nuevo precio.
   */
  async updateIngredientPrice(
    organizationId: string,
    formulationId: string,
    ingredientId: string,
    dto: UpdateIngredientPriceDto,
    userId: string,
  ) {
    const formulation = await this.findOne(organizationId, formulationId);
    const ingrediente = formulation.ingredientes.find(
      (i) => i.id === ingredientId,
    );
    if (!ingrediente) {
      throw new NotFoundException(
        `No se encontro el ingrediente ${ingredientId} en la formulacion ${formulationId}`,
      );
    }

    const nuevoPrecioTotal =
      Math.round(Number(ingrediente.cantidadKg) * dto.precioKg * 100) / 100;

    // Crea el proveedor formal si es la primera vez que se usa ese nombre en esta empresa
    // (o reutiliza el existente), para poder comparar precios entre proveedores mas adelante.
    const nombreProveedor = dto.proveedor.trim();
    const proveedor = await this.prisma.supplier.upsert({
      where: {
        organizationId_nombre: { organizationId, nombre: nombreProveedor },
      },
      create: { organizationId, nombre: nombreProveedor },
      update: {},
    });

    await this.prisma.supplierPrice.create({
      data: {
        ingredientId,
        precioKg: dto.precioKg,
        proveedor: nombreProveedor,
        supplierId: proveedor.id,
      },
    });

    const actualizado = await this.prisma.ingredient.update({
      where: { id: ingredientId },
      data: { precioKg: dto.precioKg, precioTotal: nuevoPrecioTotal },
    });

    void this.auditService.log(AuditEvent.INGREDIENT_PRICE_UPDATED, {
      userId,
      metadata: {
        formulationId,
        ingredienteNombre: ingrediente.nombre,
        precioAnterior: ingrediente.precioKg.toString(),
        precioNuevo: dto.precioKg,
        proveedor: nombreProveedor,
      },
    });

    return actualizado;
  }

  /** Historial de precios de un ingrediente, mas reciente primero. */
  async getIngredientPriceHistory(
    organizationId: string,
    formulationId: string,
    ingredientId: string,
  ) {
    const formulation = await this.findOne(organizationId, formulationId);
    const ingrediente = formulation.ingredientes.find(
      (i) => i.id === ingredientId,
    );
    if (!ingrediente) {
      throw new NotFoundException(
        `No se encontro el ingrediente ${ingredientId} en la formulacion ${formulationId}`,
      );
    }

    return this.prisma.supplierPrice.findMany({
      where: { ingredientId },
      orderBy: { vigenteDesde: 'desc' },
    });
  }

  /** Historial de versiones (snapshots completos) de una formulacion, mas reciente primero. */
  async getVersions(organizationId: string, formulationId: string) {
    await this.findOne(organizationId, formulationId);

    return this.prisma.formulationVersion.findMany({
      where: { formulationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
