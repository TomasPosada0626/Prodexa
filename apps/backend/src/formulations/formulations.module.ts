import { Module } from '@nestjs/common';
import { FormulationsController } from './formulations.controller';
import { FormulationsService } from './formulations.service';

@Module({
  controllers: [FormulationsController],
  providers: [FormulationsService],
})
export class FormulationsModule {}
