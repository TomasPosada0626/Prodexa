import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PrismaService,
  createQueryHandler,
  executeWithRetry,
} from './prisma.service';

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

describe('executeWithRetry', () => {
  const noopLogger: Pick<Logger, 'warn'> = { warn: jest.fn() };
  const connectionError = () =>
    new Prisma.PrismaClientKnownRequestError(
      'timed out fetching a connection',
      {
        code: 'P2024',
        clientVersion: '7.9.0',
      },
    );

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('devuelve el resultado sin reintentar si la query no falla', async () => {
    const query = jest.fn().mockResolvedValue('ok');

    await expect(executeWithRetry('findMany', query, noopLogger)).resolves.toBe(
      'ok',
    );
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reintenta con backoff exponencial ante un error de conexion y termina bien', async () => {
    const query = jest
      .fn()
      .mockRejectedValueOnce(connectionError())
      .mockResolvedValueOnce('ok-tras-reintento');

    const promise = executeWithRetry('findMany', query, noopLogger);
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toBe('ok-tras-reintento');
    expect(query).toHaveBeenCalledTimes(2);
    expect(noopLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('se rinde despues del maximo de intentos y propaga el ultimo error', async () => {
    const query = jest.fn().mockRejectedValue(connectionError());

    const promise = executeWithRetry('findMany', query, noopLogger);
    promise.catch(() => {});
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow('timed out fetching a connection');
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('no reintenta un error que no es de conexion transitoria', async () => {
    const query = jest.fn().mockRejectedValue(new Error('bug real de la app'));

    await expect(
      executeWithRetry('findMany', query, noopLogger),
    ).rejects.toThrow('bug real de la app');
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('createQueryHandler', () => {
  it('pasa una lectura (findMany) por executeWithRetry', async () => {
    const query = jest.fn().mockResolvedValue(['ok']);
    const handler = createQueryHandler({ warn: jest.fn() });

    await expect(
      handler({ operation: 'findMany', args: { where: {} }, query }),
    ).resolves.toEqual(['ok']);
    expect(query).toHaveBeenCalledWith({ where: {} });
  });

  it('deja pasar una escritura (create) directo, sin reintento', async () => {
    const query = jest.fn().mockResolvedValue({ id: '1' });
    const handler = createQueryHandler({ warn: jest.fn() });

    await expect(
      handler({ operation: 'create', args: { data: {} }, query }),
    ).resolves.toEqual({ id: '1' });
    expect(query).toHaveBeenCalledWith({ data: {} });
  });
});
