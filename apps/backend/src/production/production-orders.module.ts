import { Module } from '@nestjs/common';
import { SimulationModule } from '../simulation/simulation.module';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';

@Module({
  imports: [SimulationModule],
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService],
})
export class ProductionOrdersModule {}
