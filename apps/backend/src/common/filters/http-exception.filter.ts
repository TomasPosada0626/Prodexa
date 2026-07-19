import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const base = {
      code: isHttp ? 'HTTP_ERROR' : 'INTERNAL_SERVER_ERROR',
      message: isHttp ? exception.message : 'Error interno del servidor',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(base);
  }
}
