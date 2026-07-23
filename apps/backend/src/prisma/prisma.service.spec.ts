import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('se conecta en onModuleInit y se desconecta en onModuleDestroy', async () => {
    const service = new PrismaService();
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue();

    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
