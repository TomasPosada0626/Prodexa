import { PartialType, PickType } from '@nestjs/swagger';
import { CreateProductionOrderDto } from './create-production-order.dto';

/** No incluye formulationId: una orden no cambia de formulacion, solo se corrige o se anula. */
export class UpdateProductionOrderDto extends PartialType(
  PickType(CreateProductionOrderDto, [
    'cantidadObjetivoKg',
    'margenPorcentaje',
    'impuestoPorcentaje',
    'tamanoPresentacion',
    'unidadPresentacion',
    'numeroLote',
    'fechaVencimiento',
    'costoEmpaque',
    'costoEtiqueta',
    'esMaquila',
    'maquilaIncluyeEmpaque',
    'costoManoObra',
    'costoEnergia',
    'tiempoProduccionHoras',
    'costoGastosGenerales',
    'costoTransporte',
    'costoMermas',
    'precioVentaReal',
    'estadoPago',
    'fechaPago',
    'estadoProduccion',
    'notasCalidad',
  ] as const),
) {}
