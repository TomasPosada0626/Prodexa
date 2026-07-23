import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({
    description:
      'Costo por hora de mano de obra propia, usado para calcular automaticamente el costo de produccion de cualquier lote de la empresa cuando una orden no se marca como maquila',
    example: 15000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaManoObraHora?: number;

  @ApiPropertyOptional({
    description:
      'Costo por hora de energia/gas durante la produccion, para toda la empresa',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaEnergiaHora?: number;

  @ApiPropertyOptional({
    description:
      'Gastos generales/indirectos mensuales de la empresa (arriendo, nomina administrativa, software, etc.)',
    example: 2000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gastoGeneralMensual?: number;
}
