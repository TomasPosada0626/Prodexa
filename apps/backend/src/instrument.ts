import * as Sentry from '@sentry/nestjs';

// Sin SENTRY_DSN, Sentry.init no se llama — cero llamadas de red, cero ruido en
// desarrollo local (mismo patron que el frontend, ver sentry.server.config.ts).
// Debe importarse antes que cualquier otro modulo (ver primera linea de main.ts)
// para que Sentry pueda instrumentar automaticamente el resto de la app.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
