import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function mockHost(request: object) {
    const response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
    return { host, response };
  }

  it('mapea una HttpException a su status code y su mensaje', () => {
    const { host, response } = mockHost({
      url: '/api/v1/formulations',
      id: 'req-1',
    });

    filter.catch(new BadRequestException('Datos invalidos'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'HTTP_ERROR',
        message: 'Datos invalidos',
        path: '/api/v1/formulations',
        requestId: 'req-1',
      }),
    );
  });

  it('mapea un error no controlado a 500 sin filtrar el mensaje interno', () => {
    const { host, response } = mockHost({ url: '/api/v1/x', id: 'req-2' });

    filter.catch(new Error('detalle interno sensible'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor',
      }),
    );
  });
});
