import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateFormulationDto } from './dto/create-formulation.dto';
import { FormulationsService } from './formulations.service';

@Controller('formulations')
export class FormulationsController {
  constructor(private readonly formulationsService: FormulationsService) {}

  @Post()
  create(@Body() dto: CreateFormulationDto) {
    return this.formulationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.formulationsService.findAll();
  }
}
