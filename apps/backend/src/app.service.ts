import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'prodexa-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
