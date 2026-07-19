import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health payload', () => {
      const response = appController.getHealth();

      expect(response).toHaveProperty('status', 'ok');
      expect(response).toHaveProperty('service', 'prodexa-backend');
      expect(response).toHaveProperty('timestamp');
    });
  });
});
