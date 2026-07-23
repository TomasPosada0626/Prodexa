import { ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateFormulationDto } from './create-formulation.dto';

export class UpdateFormulationDto extends PartialType(
  PickType(CreateFormulationDto, [
    'nombreProducto',
    'categoria',
    'registroSanitario',
    'registroSanitarioVencimiento',
    'registroSanitarioEstado',
    'preparacionHtml',
    'cantidadBaseKg',
    'margenPorcentaje',
    'impuestoPorcentaje',
    'vidaUtilDias',
    'tiempoProduccionHoras',
    'ingredientes',
  ] as const),
) {
  @ApiPropertyOptional({
    description:
      'Archivar (false) deja de ofrecer la formulacion en Preparar/Costos sin borrar nada; activar (true) la vuelve a mostrar',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
