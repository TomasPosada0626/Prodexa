import { pinoHttpOptions } from './pino.config';

describe('pinoHttpOptions.genReqId', () => {
  function mockReqRes(headers: Record<string, string | string[]> = {}) {
    const req = { headers };
    const res = { setHeader: jest.fn() };
    return { req, res };
  }

  it('reutiliza el X-Request-Id si el cliente ya lo envio', () => {
    const { req, res } = mockReqRes({ 'x-request-id': 'incoming-id' });

    const id = pinoHttpOptions.genReqId?.(req as never, res as never);

    expect(id).toBe('incoming-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'incoming-id');
  });

  it('genera un id nuevo si el cliente no envio ninguno', () => {
    const { req, res } = mockReqRes();

    const id = pinoHttpOptions.genReqId?.(req as never, res as never);

    expect(typeof id).toBe('string');
    expect((id as string).length).toBeGreaterThan(0);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', id);
  });

  it('toma el primer valor si el header llega repetido (array)', () => {
    const { req, res } = mockReqRes({ 'x-request-id': ['primero', 'segundo'] });

    const id = pinoHttpOptions.genReqId?.(req as never, res as never);

    expect(id).toBe('primero');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'primero');
  });
});

describe('pinoHttpOptions.serializers', () => {
  it('req serializa solo method, url e id (nunca headers/cookies)', () => {
    const req = { method: 'GET', url: '/api/v1/formulations', id: 'req-1' };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const serialized = pinoHttpOptions.serializers?.req?.(req);

    expect(serialized).toEqual({
      method: 'GET',
      url: '/api/v1/formulations',
      id: 'req-1',
    });
  });

  it('res serializa solo el statusCode', () => {
    const res = { statusCode: 201 };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const serialized = pinoHttpOptions.serializers?.res?.(res);

    expect(serialized).toEqual({ statusCode: 201 });
  });
});
