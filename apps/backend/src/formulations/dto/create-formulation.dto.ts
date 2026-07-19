import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class IngredientDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsNumber()
  @Min(0.0001)
  porcentaje!: number;

  @IsNumber()
  @Min(0)
  cantidadGramosBase!: number;

  @IsNumber()
  @Min(0)
  cantidadKg!: number;

  @IsNumber()
  @Min(0)
  precioKg!: number;

  @IsNumber()
  @Min(0)
  precioTotal!: number;
}

export class CreateFormulationDto {
  @IsString()
  @IsNotEmpty()
  nombreProducto!: string;

  @IsString()
  @IsOptional()
  registroSanitario?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredientes!: IngredientDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pasosPreparacion?: string[];
}
