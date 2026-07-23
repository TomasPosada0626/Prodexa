import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class UpdateIngredientPriceDto {
  @ApiProperty({
    description: 'Nuevo precio por kg del ingrediente',
    example: 1650,
  })
  @IsNumber()
  @Min(0)
  precioKg!: number;

  @ApiProperty({
    description:
      'Proveedor asociado a este precio. Obligatorio para poder comparar y cambiar de proveedor con trazabilidad.',
    example: 'Distribuidora XYZ',
  })
  @IsString()
  @IsNotEmpty()
  proveedor!: string;
}
