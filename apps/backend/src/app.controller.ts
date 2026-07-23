import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Endpoint raiz, para verificar rapido que el API responde (sin ser un health check formal). */
  @Get()
  getHealth() {
    return this.appService.getHealth();
  }
}
