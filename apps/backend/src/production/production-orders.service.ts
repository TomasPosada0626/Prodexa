import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SimulationService } from '../simulation/simulation.service';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../audit/audit.types';
import {
  CreateProductionOrderDto,
  EstadoProduccion,
  TRANSICIONES_ESTADO_PRODUCCION,
} from './dto/create-production-order.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { CreatePagoDto } from './dto/create-pago.dto';

/** Genera un identificador de lote legible y practicamente unico, sin necesidad de una consulta previa. */
function generarNumeroLote(): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sufijo = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LOTE-${yyyymmdd}-${sufijo}`;
}

/** Vencimiento sugerido a partir de la vida util (dias) configurada en la formulacion. */
function calcularVencimientoSugerido(vidaUtilDias: number | null): Date | null {
  if (!vidaUtilDias) return null;
  return new Date(Date.now() + vidaUtilDias * 24 * 60 * 60 * 1000);
}

/**
 * Todo en este servicio se filtra por organizationId: cualquiera de la misma empresa ve y
 * registra ordenes de produccion (no solo quien las creo). userId se sigue guardando al
 * crear, solo como dato de "quien la registro".
 */
@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly simulationService: SimulationService,
    private readonly auditService: AuditService,
  ) {}

  /** Calcula el costo/utilidad de la orden con el motor de costeo y la deja registrada como historial real de produccion. */
  async create(
    userId: string,
    organizationId: string,
    dto: CreateProductionOrderDto,
  ) {
    const formulation = await this.prisma.formulation.findFirst({
      where: { id: dto.formulationId, organizationId },
      include: { ingredientes: true },
    });
    if (!formulation) {
      throw new NotFoundException(
        `No se encontro la formulacion con id ${dto.formulationId}`,
      );
    }

    const costoBaseTotal = formulation.ingredientes.reduce(
      (total, ingrediente) => total + Number(ingrediente.precioTotal),
      0,
    );
    const margenPorcentaje =
      dto.margenPorcentaje ?? Number(formulation.margenPorcentaje);
    // El precio sugerido y la utilidad de un lote real deben cubrir TODOS sus costos, no solo
    // los ingredientes: de lo contrario el precio queda subvalorado y la utilidad reportada
    // (visible en Preparar y en el modal del lote) queda inflada frente a la real (Reportes/Analisis).
    const costosOperativosTotal =
      (dto.costoEmpaque ?? 0) +
      (dto.costoEtiqueta ?? 0) +
      (dto.costoManoObra ?? 0) +
      (dto.costoEnergia ?? 0) +
      (dto.costoTransporte ?? 0) +
      (dto.costoMermas ?? 0) +
      (dto.costoGastosGenerales ?? 0);

    const resultado = this.simulationService.calculate({
      costoBaseTotal,
      cantidadBaseKg: Number(formulation.cantidadBaseKg),
      cantidadObjetivoKg: dto.cantidadObjetivoKg,
      margenPorcentaje,
      impuestoPorcentaje:
        dto.impuestoPorcentaje ?? Number(formulation.impuestoPorcentaje),
      costosOperativosTotal,
    });

    const fechaVencimiento = dto.fechaVencimiento
      ? new Date(dto.fechaVencimiento)
      : calcularVencimientoSugerido(formulation.vidaUtilDias);

    return this.prisma.productionOrder.create({
      data: {
        formulationId: formulation.id,
        userId,
        organizationId,
        numeroLote: dto.numeroLote?.trim() || generarNumeroLote(),
        cantidadObjetivoKg: dto.cantidadObjetivoKg,
        costoEscalado: resultado.costoEscalado,
        precioVentaSugerido: resultado.precioVentaSugerido,
        utilidadEstimada: resultado.utilidadEstimada,
        margenPorcentaje,
        tamanoPresentacion: dto.tamanoPresentacion,
        unidadPresentacion: dto.unidadPresentacion,
        fechaVencimiento,
        costoEmpaque: dto.costoEmpaque,
        costoEtiqueta: dto.costoEtiqueta,
        esMaquila: dto.esMaquila,
        maquilaIncluyeEmpaque: dto.maquilaIncluyeEmpaque,
        costoManoObra: dto.costoManoObra,
        costoEnergia: dto.costoEnergia,
        tiempoProduccionHoras: dto.tiempoProduccionHoras,
        costoGastosGenerales: dto.costoGastosGenerales,
        costoTransporte: dto.costoTransporte,
        costoMermas: dto.costoMermas,
        precioVentaReal: dto.precioVentaReal,
        estadoPago: dto.estadoPago,
        // Si se marca PAGADO de una vez (sin registrar abonos uno por uno), montoCobrado
        // refleja el total para que quede consistente con lo que muestran los reportes.
        montoCobrado:
          dto.estadoPago === 'PAGADO'
            ? (dto.precioVentaReal ?? resultado.precioVentaSugerido)
            : undefined,
        fechaPago: dto.fechaPago ? new Date(dto.fechaPago) : undefined,
        estadoProduccion: dto.estadoProduccion,
        notasCalidad: dto.notasCalidad,
      },
    });
  }

  findAll(organizationId: string, formulationId?: string) {
    return this.prisma.productionOrder.findMany({
      where: { organizationId, ...(formulationId && { formulationId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Corrige una orden ya registrada (cantidad, margen o impuesto) y recalcula
   * el costo/utilidad contra el estado ACTUAL de la formulacion — igual que al
   * crearla, para que la orden corregida sea consistente con el resto de la app.
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateProductionOrderDto,
  ) {
    const orden = await this.findOwned(organizationId, id);

    if (
      dto.estadoProduccion !== undefined &&
      dto.estadoProduccion !== orden.estadoProduccion
    ) {
      const permitidos =
        TRANSICIONES_ESTADO_PRODUCCION[
          orden.estadoProduccion as EstadoProduccion
        ] ?? [];
      if (!permitidos.includes(dto.estadoProduccion)) {
        throw new BadRequestException(
          permitidos.length > 0
            ? `No se puede pasar de ${orden.estadoProduccion} a ${dto.estadoProduccion}. Desde ${orden.estadoProduccion} solo se puede pasar a: ${permitidos.join(', ')}.`
            : `${orden.estadoProduccion} es un estado final: este lote ya no puede cambiar de estado.`,
        );
      }
    }

    const formulation = await this.prisma.formulation.findFirst({
      where: { id: orden.formulationId, organizationId },
      include: { ingredientes: true },
    });
    if (!formulation) {
      throw new NotFoundException(
        `No se encontro la formulacion con id ${orden.formulationId}`,
      );
    }

    const costoBaseTotal = formulation.ingredientes.reduce(
      (total, ingrediente) => total + Number(ingrediente.precioTotal),
      0,
    );
    const cantidadObjetivoKg =
      dto.cantidadObjetivoKg ?? Number(orden.cantidadObjetivoKg);
    const margenPorcentaje =
      dto.margenPorcentaje ?? Number(orden.margenPorcentaje);
    // Igual que en create: se usa el costo operativo EFECTIVO (lo que viene en el dto, o si no
    // se envia, lo que ya tenia guardado la orden) para que precio sugerido/utilidad sigan
    // reflejando el costo total real del lote despues de editarlo.
    const costosOperativosTotal =
      (dto.costoEmpaque ?? Number(orden.costoEmpaque)) +
      (dto.costoEtiqueta ?? Number(orden.costoEtiqueta)) +
      (dto.costoManoObra ?? Number(orden.costoManoObra)) +
      (dto.costoEnergia ?? Number(orden.costoEnergia)) +
      (dto.costoTransporte ?? Number(orden.costoTransporte)) +
      (dto.costoMermas ?? Number(orden.costoMermas)) +
      (dto.costoGastosGenerales ?? Number(orden.costoGastosGenerales));

    const resultado = this.simulationService.calculate({
      costoBaseTotal,
      cantidadBaseKg: Number(formulation.cantidadBaseKg),
      cantidadObjetivoKg,
      margenPorcentaje,
      impuestoPorcentaje:
        dto.impuestoPorcentaje ?? Number(formulation.impuestoPorcentaje),
      costosOperativosTotal,
    });

    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        cantidadObjetivoKg,
        margenPorcentaje,
        costoEscalado: resultado.costoEscalado,
        precioVentaSugerido: resultado.precioVentaSugerido,
        utilidadEstimada: resultado.utilidadEstimada,
        ...(dto.tamanoPresentacion !== undefined && {
          tamanoPresentacion: dto.tamanoPresentacion,
        }),
        ...(dto.unidadPresentacion !== undefined && {
          unidadPresentacion: dto.unidadPresentacion,
        }),
        ...(dto.numeroLote !== undefined && {
          numeroLote: dto.numeroLote.trim(),
        }),
        ...(dto.fechaVencimiento !== undefined && {
          fechaVencimiento: new Date(dto.fechaVencimiento),
        }),
        ...(dto.costoEmpaque !== undefined && {
          costoEmpaque: dto.costoEmpaque,
        }),
        ...(dto.costoEtiqueta !== undefined && {
          costoEtiqueta: dto.costoEtiqueta,
        }),
        ...(dto.esMaquila !== undefined && { esMaquila: dto.esMaquila }),
        ...(dto.maquilaIncluyeEmpaque !== undefined && {
          maquilaIncluyeEmpaque: dto.maquilaIncluyeEmpaque,
        }),
        ...(dto.costoManoObra !== undefined && {
          costoManoObra: dto.costoManoObra,
        }),
        ...(dto.costoEnergia !== undefined && {
          costoEnergia: dto.costoEnergia,
        }),
        ...(dto.tiempoProduccionHoras !== undefined && {
          tiempoProduccionHoras: dto.tiempoProduccionHoras,
        }),
        ...(dto.costoGastosGenerales !== undefined && {
          costoGastosGenerales: dto.costoGastosGenerales,
        }),
        ...(dto.costoTransporte !== undefined && {
          costoTransporte: dto.costoTransporte,
        }),
        ...(dto.costoMermas !== undefined && { costoMermas: dto.costoMermas }),
        ...(dto.precioVentaReal !== undefined && {
          precioVentaReal: dto.precioVentaReal,
        }),
        ...(dto.estadoPago !== undefined && {
          estadoPago: dto.estadoPago,
          // Igual que en create: si se marca PAGADO/PENDIENTE de una vez (sin pasar por
          // abonos), montoCobrado se sincroniza para que quede consistente con los reportes.
          ...(dto.estadoPago === 'PAGADO' && {
            montoCobrado:
              dto.precioVentaReal ??
              (orden.precioVentaReal !== null
                ? Number(orden.precioVentaReal)
                : resultado.precioVentaSugerido),
          }),
          ...(dto.estadoPago === 'PENDIENTE' && { montoCobrado: 0 }),
        }),
        ...(dto.fechaPago !== undefined && {
          fechaPago: new Date(dto.fechaPago),
        }),
        ...(dto.estadoProduccion !== undefined && {
          estadoProduccion: dto.estadoProduccion,
        }),
        ...(dto.notasCalidad !== undefined && {
          notasCalidad: dto.notasCalidad,
        }),
      },
    });
  }

  /** Anula (elimina) una orden de produccion registrada por error. Queda auditado: es una
   * accion irreversible que borra un registro financiero (costo/ingreso/pagos del lote). */
  async remove(
    organizationId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    const orden = await this.findOwned(organizationId, id);
    await this.prisma.productionOrder.delete({ where: { id } });
    void this.auditService.log(AuditEvent.PRODUCTION_ORDER_DELETED, {
      userId,
      metadata: {
        productionOrderId: id,
        numeroLote: orden.numeroLote,
        costoEscalado: orden.costoEscalado.toString(),
        ingresoReal: (
          orden.precioVentaReal ?? orden.precioVentaSugerido
        ).toString(),
      },
    });
  }

  /** Un lote se puede cobrar en varias cuotas: cada abono se suma y el estado del lote
   * (PENDIENTE/PARCIAL/PAGADO) se recalcula solo, sin que el usuario tenga que fijarlo a mano. */
  async addPago(
    organizationId: string,
    productionOrderId: string,
    dto: CreatePagoDto,
  ) {
    await this.findOwned(organizationId, productionOrderId);
    await this.prisma.pago.create({
      data: {
        productionOrderId,
        monto: dto.monto,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
      },
    });
    return this.recalcularEstadoPago(productionOrderId);
  }

  async listPagos(organizationId: string, productionOrderId: string) {
    await this.findOwned(organizationId, productionOrderId);
    return this.prisma.pago.findMany({
      where: { productionOrderId },
      orderBy: { fecha: 'desc' },
    });
  }

  /** Borra un abono mal ingresado y recalcula el estado del lote (puede volver a PARCIAL o
   * PENDIENTE). Queda auditado: es una accion irreversible sobre dinero ya registrado como cobrado. */
  async removePago(
    organizationId: string,
    productionOrderId: string,
    pagoId: string,
    userId: string,
  ) {
    await this.findOwned(organizationId, productionOrderId);
    const pago = await this.prisma.pago.findFirst({
      where: { id: pagoId, productionOrderId },
    });
    if (!pago) {
      throw new NotFoundException(`No se encontro el abono con id ${pagoId}`);
    }
    await this.prisma.pago.delete({ where: { id: pagoId } });
    void this.auditService.log(AuditEvent.PAGO_DELETED, {
      userId,
      metadata: { productionOrderId, pagoId, monto: pago.monto.toString() },
    });
    return this.recalcularEstadoPago(productionOrderId);
  }

  /**
   * PENDIENTE (nada abonado), PARCIAL (algo abonado, no todo) o PAGADO (abonos cubren el
   * total: precioVentaReal si se conoce, si no precioVentaSugerido). fechaPago queda en la
   * fecha del abono mas reciente solo mientras el lote este PAGADO; si deja de estarlo
   * (se borro un abono) vuelve a null, para no dejar una fecha de pago de algo que ya no esta pagado.
   */
  private async recalcularEstadoPago(productionOrderId: string) {
    const orden = await this.prisma.productionOrder.findUniqueOrThrow({
      where: { id: productionOrderId },
    });
    const agregado = await this.prisma.pago.aggregate({
      where: { productionOrderId },
      _sum: { monto: true },
    });
    const montoCobrado = Number(agregado._sum.monto ?? 0);
    const montoTotal =
      orden.precioVentaReal !== null
        ? Number(orden.precioVentaReal)
        : Number(orden.precioVentaSugerido);

    const estadoPago: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' =
      montoCobrado <= 0
        ? 'PENDIENTE'
        : montoCobrado < montoTotal
          ? 'PARCIAL'
          : 'PAGADO';

    const ultimoPago =
      estadoPago === 'PAGADO'
        ? await this.prisma.pago.findFirst({
            where: { productionOrderId },
            orderBy: { fecha: 'desc' },
          })
        : null;

    return this.prisma.productionOrder.update({
      where: { id: productionOrderId },
      data: {
        montoCobrado,
        estadoPago,
        fechaPago: ultimoPago?.fecha ?? null,
      },
    });
  }

  private async findOwned(organizationId: string, id: string) {
    const orden = await this.prisma.productionOrder.findFirst({
      where: { id, organizationId },
    });
    if (!orden) {
      throw new NotFoundException(
        `No se encontro la orden de produccion con id ${id}`,
      );
    }
    return orden;
  }
}
