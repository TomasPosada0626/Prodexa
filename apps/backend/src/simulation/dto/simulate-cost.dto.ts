import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SimulateCostDto {
  @ApiProperty({
    description: 'Id de la formulacion sobre la que se simula el costo',
  })
  @IsString()
  @IsNotEmpty()
  formulationId!: string;

  @ApiProperty({
    description: 'Cantidad objetivo a producir, en kg',
    example: 10,
  })
  @IsNumber()
  @Min(0.001)
  cantidadObjetivoKg!: number;

  @ApiPropertyOptional({
    description:
      'Margen de ganancia a usar, en porcentaje (0-100). Si se omite, se usa el margen guardado en la formulacion.',
    example: 35,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99.99)
  margenPorcentaje?: number;

  @ApiPropertyOptional({
    description:
      'Impuesto a usar, en porcentaje. Si se omite, se usa el impuesto guardado en la formulacion.',
    example: 19,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  impuestoPorcentaje?: number;

  @ApiPropertyOptional({
    description:
      'Descuento por venta mayorista, en porcentaje, aplicado sobre el precio final',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoMayoristaPorcentaje?: number;

  @ApiPropertyOptional({
    description:
      'Costo operativo estimado de empaque para la cantidad objetivo (para que el precio sugerido y la utilidad reflejen el costo total, no solo ingredientes)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoEmpaque?: number;

  @ApiPropertyOptional({
    description:
      'Costo operativo estimado de etiqueta para la cantidad objetivo',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoEtiqueta?: number;

  @ApiPropertyOptional({
    description:
      'Costo operativo estimado de transporte para la cantidad objetivo',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoTransporte?: number;

  @ApiPropertyOptional({
    description:
      'Costo operativo estimado de mermas para la cantidad objetivo (ya calculado en $, no en %)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoMermas?: number;

  @ApiPropertyOptional({
    description:
      'Prorrateo estimado de gastos generales de la empresa para la cantidad objetivo',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoGastosGenerales?: number;

  @ApiPropertyOptional({
    description:
      'Costo estimado de mano de obra para la cantidad objetivo (tiempo estimado de produccion x tarifa/hora de la empresa)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoManoObra?: number;

  @ApiPropertyOptional({
    description:
      'Costo estimado de energia/gas para la cantidad objetivo (tiempo estimado de produccion x tarifa/hora de energia de la empresa)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoEnergia?: number;
}
