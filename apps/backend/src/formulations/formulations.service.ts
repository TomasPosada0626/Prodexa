import { Injectable } from '@nestjs/common';
import { CreateFormulationDto } from './dto/create-formulation.dto';

@Injectable()
export class FormulationsService {
  private readonly formulations: CreateFormulationDto[] = [];

  create(dto: CreateFormulationDto) {
    this.formulations.push(dto);
    return dto;
  }

  findAll() {
    return this.formulations;
  }
}
