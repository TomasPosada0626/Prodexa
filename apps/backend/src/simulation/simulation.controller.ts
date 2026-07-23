import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/types';
import { SimulateCostDto } from './dto/simulate-cost.dto';
import { SimulationService } from './simulation.service';

@ApiTags('simulation')
@UseGuards(JwtAuthGuard)
@Controller('simulations')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post()
  @ApiOperation({
    summary:
      'Simular costo y precio de venta al escalar una formulacion a una cantidad objetivo',
  })
  simulate(@CurrentUser() user: RequestUser, @Body() dto: SimulateCostDto) {
    return this.simulationService.simulateForFormulation(
      user.organizationId,
      dto,
    );
  }
}
