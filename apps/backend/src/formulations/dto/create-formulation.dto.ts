import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Estados manuales de cumplimiento que la sola fecha de vencimiento no puede representar. */
export const REGISTRO_SANITARIO_ESTADOS_MANUALES = [
  'EN_TRAMITE',
  'SUSPENDIDO',
] as const;

export class IngredientDto {
  @ApiProperty({ description: 'Nombre del ingrediente' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({
    description: 'Porcentaje del ingrediente en la formula',
    example: 12.5,
  })
  @IsNumber()
  @Min(0.0001)
  porcentaje!: number;

  @ApiProperty({ description: 'Cantidad en gramos para el lote base' })
  @IsNumber()
  @Min(0)
  cantidadGramosBase!: number;

  @ApiProperty({ description: 'Cantidad en kg para el lote base' })
  @IsNumber()
  @Min(0)
  cantidadKg!: number;

  @ApiProperty({ description: 'Precio por kg del ingrediente' })
  @IsNumber()
  @Min(0)
  precioKg!: number;

  @ApiProperty({ description: 'Precio total del ingrediente en el lote base' })
  @IsNumber()
  @Min(0)
  precioTotal!: number;
}

export class CreateFormulationDto {
  @ApiProperty({ description: 'Nombre del producto formulado' })
  @IsString()
  @IsNotEmpty()
  nombreProducto!: string;

  @ApiPropertyOptional({
    description: 'Categoria del producto (ej. Salsas, Cremas)',
  })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Registro sanitario del producto. Enviar null para borrarlo.',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  registroSanitario?: string | null;

  @ApiPropertyOptional({
    description:
      'Fecha de vencimiento del registro sanitario (ISO 8601). Enviar null para borrarla.',
    example: '2027-01-31',
    nullable: true,
  })
  @IsDateString()
  @IsOptional()
  registroSanitarioVencimiento?: string | null;

  @ApiPropertyOptional({
    description:
      'Override manual del estado de cumplimiento cuando la fecha de vencimiento no representa la realidad (ej. tramite de renovacion en curso). Enviar null para volver al calculo automatico por fecha.',
    enum: REGISTRO_SANITARIO_ESTADOS_MANUALES,
    nullable: true,
  })
  @IsIn([...REGISTRO_SANITARIO_ESTADOS_MANUALES, null])
  @IsOptional()
  registroSanitarioEstado?:
    (typeof REGISTRO_SANITARIO_ESTADOS_MANUALES)[number] | null;

  @ApiProperty({
    description:
      'Cantidad en kg que produce esta formulacion (el lote base). Es la referencia que se usa luego en Produccion para escalar a cualquier cantidad objetivo.',
    example: 5,
  })
  @IsNumber()
  @Min(0.001)
  cantidadBaseKg!: number;

  @ApiProperty({
    type: [IngredientDto],
    description: 'Ingredientes de la formulacion',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredientes!: IngredientDto[];

  @ApiPropertyOptional({
    description:
      'Preparacion en formato HTML enriquecido (negrita, cursiva, listas, etc.)',
  })
  @IsString()
  @IsOptional()
  preparacionHtml?: string;

  @ApiPropertyOptional({
    description:
      'Margen de ganancia por defecto de la formulacion, en porcentaje',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99.99)
  margenPorcentaje?: number;

  @ApiPropertyOptional({
    description:
      'Impuesto aplicable a la formulacion, en porcentaje. Es el IVA fijo (19%), no un valor libre por producto.',
    example: 19,
    default: 19,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  impuestoPorcentaje?: number;

  @ApiPropertyOptional({
    description:
      'Vida util del producto en dias desde que se produce. Se usa para sugerir automaticamente la fecha de vencimiento de cada lote en Produccion.',
    example: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  vidaUtilDias?: number;

  @ApiPropertyOptional({
    description:
      'Horas estimadas para producir cantidadBaseKg. Se escala proporcionalmente en cada orden y se usa para calcular automaticamente mano de obra propia y energia en Produccion.',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempoProduccionHoras?: number;
}
