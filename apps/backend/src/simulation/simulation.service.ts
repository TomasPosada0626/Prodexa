import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SimulateCostDto } from './dto/simulate-cost.dto';
import { CostSimulationInput, CostSimulationResult } from './simulation.types';

@Injectable()
export class SimulationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Motor de costeo puro: escala el costo de una formulacion base a la
   * cantidad objetivo y calcula precio de venta sugerido segun margen,
   * impuesto y descuento mayorista.
   */
  calculate(input: CostSimulationInput): CostSimulationResult {
    if (input.cantidadBaseKg <= 0) {
      throw new BadRequestException(
        'La formulacion no tiene una cantidad base valida para calcular el costo por kg.',
      );
    }
    if (input.margenPorcentaje >= 100) {
      throw new BadRequestException('El margen debe ser menor a 100%.');
    }

    const costoPorKg = input.costoBaseTotal / input.cantidadBaseKg;
    const costoEscalado = costoPorKg * input.cantidadObjetivoKg;

    // El precio sugerido y la utilidad se calculan sobre el costo TOTAL (ingredientes +
    // operativos reales de este lote, si se enviaron), no solo sobre el costo de ingredientes.
    const costosOperativosTotal = input.costosOperativosTotal ?? 0;
    const costoTotal = costoEscalado + costosOperativosTotal;

    const precioVentaSugerido = costoTotal / (1 - input.margenPorcentaje / 100);
    const impuestoPorcentaje = input.impuestoPorcentaje ?? 0;
    const precioConImpuesto =
      precioVentaSugerido * (1 + impuestoPorcentaje / 100);

    const descuentoMayoristaPorcentaje =
      input.descuentoMayoristaPorcentaje ?? 0;
    const precioMayorista =
      precioConImpuesto * (1 - descuentoMayoristaPorcentaje / 100);

    const utilidadEstimada = precioVentaSugerido - costoTotal;

    return {
      costoPorKg: round(costoPorKg),
      costoEscalado: round(costoEscalado),
      precioVentaSugerido: round(precioVentaSugerido),
      precioConImpuesto: round(precioConImpuesto),
      precioMayorista: round(precioMayorista),
      utilidadEstimada: round(utilidadEstimada),
    };
  }

  async simulateForFormulation(
    organizationId: string,
    dto: SimulateCostDto,
  ): Promise<CostSimulationResult> {
    // Escopado por organizationId (no userId): cualquiera de la empresa puede simular costos
    // sobre una formulacion, no solo quien la creo — igual que en formulations/production-orders.
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

    const costosOperativosTotal =
      (dto.costoEmpaque ?? 0) +
      (dto.costoEtiqueta ?? 0) +
      (dto.costoTransporte ?? 0) +
      (dto.costoMermas ?? 0) +
      (dto.costoGastosGenerales ?? 0) +
      (dto.costoManoObra ?? 0) +
      (dto.costoEnergia ?? 0);

    return this.calculate({
      costoBaseTotal,
      cantidadBaseKg: Number(formulation.cantidadBaseKg),
      cantidadObjetivoKg: dto.cantidadObjetivoKg,
      margenPorcentaje:
        dto.margenPorcentaje ?? Number(formulation.margenPorcentaje),
      impuestoPorcentaje:
        dto.impuestoPorcentaje ?? Number(formulation.impuestoPorcentaje),
      descuentoMayoristaPorcentaje: dto.descuentoMayoristaPorcentaje,
      costosOperativosTotal,
    });
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
