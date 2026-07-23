import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Options } from 'pino-http';

type RequestWithId = IncomingMessage & { id?: string };

/**
 * Logging estructurado (JSON) de cada request/response, con un correlation id
 * (X-Request-Id) que se reutiliza si el cliente ya lo envio, o se genera si no.
 * Redacta credenciales para que nunca queden en texto plano en los logs.
 */
export const pinoHttpOptions: Options = {
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const existing = req.headers['x-request-id'];
    const id =
      (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  redact: [
    'req.headers.cookie',
    'req.headers.authorization',
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
  ],
  serializers: {
    req: (req: RequestWithId) => ({
      method: req.method,
      url: req.url,
      id: req.id,
    }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
};
