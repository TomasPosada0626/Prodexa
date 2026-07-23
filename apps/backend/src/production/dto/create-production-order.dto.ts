import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const UNIDADES_PRESENTACION = ['ml', 'L', 'g', 'kg'] as const;
export type UnidadPresentacion = (typeof UNIDADES_PRESENTACION)[number];

export const ESTADOS_PAGO = ['PENDIENTE', 'PARCIAL', 'PAGADO'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

/** Flujo fisico del lote (no de cobro): PLANIFICADO -> EN_PROCESO -> EN_CALIDAD -> TERMINADO,
 * o RECHAZADO si no pasa control de calidad (se excluye de utilidad/ingreso en los reportes). */
export const ESTADOS_PRODUCCION = [
  'PLANIFICADO',
  'EN_PROCESO',
  'EN_CALIDAD',
  'TERMINADO',
  'RECHAZADO',
] as const;
export type EstadoProduccion = (typeof ESTADOS_PRODUCCION)[number];

/**
 * Transiciones validas del flujo de produccion. TERMINADO solo se alcanza desde EN_CALIDAD
 * (el control de calidad es obligatorio, no un paso que se pueda saltar); se permite retroceder
 * un paso (reprocesar) pero no de dos en dos; RECHAZADO se puede marcar desde cualquier estado
 * no final (un lote se puede danar o contaminar antes de llegar a calidad). TERMINADO y
 * RECHAZADO son finales: ninguna orden vuelve a cambiar de estado despues.
 */
export const TRANSICIONES_ESTADO_PRODUCCION: Record<
  EstadoProduccion,
  EstadoProduccion[]
> = {
  PLANIFICADO: ['EN_PROCESO', 'RECHAZADO'],
  EN_PROCESO: ['EN_CALIDAD', 'PLANIFICADO', 'RECHAZADO'],
  EN_CALIDAD: ['TERMINADO', 'EN_PROCESO', 'RECHAZADO'],
  TERMINADO: [],
  RECHAZADO: [],
};

export class CreateProductionOrderDto {
  @ApiProperty({ description: 'Id de la formulacion producida' })
  @IsString()
  formulationId!: string;

  @ApiProperty({ description: 'Cantidad producida, en kg', example: 5 })
  @IsNumber()
  @Min(0.001)
  cantidadObjetivoKg!: number;

  @ApiPropertyOptional({
    description:
      'Margen usado para esta orden (si no se envia, se usa el de la formulacion)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  margenPorcentaje?: number;

  @ApiPropertyOptional({
    description:
      'Impuesto usado para esta orden (si no se envia, se usa el de la formulacion)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  impuestoPorcentaje?: number;

  @ApiPropertyOptional({
    description:
      'Tamano de la presentacion/envase de este lote (solo informativo, no afecta el costeo)',
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  tamanoPresentacion?: number;

  @ApiPropertyOptional({
    description: 'Unidad del tamano de presentacion',
    enum: UNIDADES_PRESENTACION,
  })
  @IsOptional()
  @IsIn(UNIDADES_PRESENTACION)
  unidadPresentacion?: UnidadPresentacion;

  @ApiPropertyOptional({
    description:
      'Numero de lote para trazabilidad. Si no se envia, se genera automaticamente.',
  })
  @IsOptional()
  @IsString()
  numeroLote?: string;

  @ApiPropertyOptional({
    description:
      'Fecha de vencimiento del lote. Si no se envia y la formulacion tiene vidaUtilDias configurada, se calcula automaticamente.',
  })
  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @ApiPropertyOptional({
    description: 'Costo real de empaque (envase) de este lote',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoEmpaque?: number;

  @ApiPropertyOptional({
    description: 'Costo real de etiqueta de este lote',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoEtiqueta?: number;

  @ApiPropertyOptional({
    description:
      'true si este lote se mando a maquilar con un tercero (costoManoObra es lo que cobro el maquilador); false si se calculo solo (tiempoProduccionHoras x tarifaManoObraHora)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  esMaquila?: boolean;

  @ApiPropertyOptional({
    description:
      'Solo aplica si esMaquila es true: si la tarifa del maquilador ya incluye empacar y etiquetar el producto terminado (entrega llave en mano)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  maquilaIncluyeEmpaque?: boolean;

  @ApiPropertyOptional({
    description:
      'Costo real de mano de obra de este lote: monto de maquila si esMaquila es true, o calculado (tiempoProduccionHoras x tarifaManoObraHora) si es false',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoManoObra?: number;

  @ApiPropertyOptional({
    description:
      'Costo real de energia/gas de este lote (tiempoProduccionHoras x tarifaEnergiaHora)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoEnergia?: number;

  @ApiPropertyOptional({
    description:
      'Horas estimadas de produccion de este lote (snapshot de tiempoProduccionHoras de la formulacion, escalado a la cantidad)',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempoProduccionHoras?: number;

  @ApiPropertyOptional({
    description:
      'Prorrateo de gastos generales de la empresa para este lote (gastoGeneralMensual / capacidad mensual promedio calculada x cantidadObjetivoKg)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoGastosGenerales?: number;

  @ApiPropertyOptional({
    description: 'Costo real de transporte de este lote',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoTransporte?: number;

  @ApiPropertyOptional({
    description: 'Costo real de mermas/desperdicio de este lote',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoMermas?: number;

  @ApiPropertyOptional({
    description:
      'Precio de venta real cobrado (si se conoce); si no se envia, se usa el sugerido como estimado',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaReal?: number;

  @ApiPropertyOptional({
    description: 'Estado de cobro del lote',
    enum: ESTADOS_PAGO,
  })
  @IsOptional()
  @IsIn(ESTADOS_PAGO)
  estadoPago?: EstadoPago;

  @ApiPropertyOptional({ description: 'Fecha en que se cobro el lote' })
  @IsOptional()
  @IsDateString()
  fechaPago?: string;

  @ApiPropertyOptional({
    description:
      'Estado del flujo fisico del lote (no de cobro). Si no se envia, arranca en PLANIFICADO.',
    enum: ESTADOS_PRODUCCION,
  })
  @IsOptional()
  @IsIn(ESTADOS_PRODUCCION)
  estadoProduccion?: EstadoProduccion;

  @ApiPropertyOptional({
    description: 'Notas de control de calidad (ej. motivo de un rechazo)',
  })
  @IsOptional()
  @IsString()
  notasCalidad?: string;
}
