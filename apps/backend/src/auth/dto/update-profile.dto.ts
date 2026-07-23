import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Nombre completo del usuario' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre no puede estar vacio.' })
  nombre?: string;

  @ApiPropertyOptional({
    description:
      'Margen (%) que se propone por defecto al crear una formulacion nueva',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99.99)
  margenPorDefecto?: number;
}
