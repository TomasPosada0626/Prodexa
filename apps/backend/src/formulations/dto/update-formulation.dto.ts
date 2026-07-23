import { PartialType, PickType } from '@nestjs/swagger';
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
) {}
