import * as Sentry from '@sentry/nextjs';

// Sin NEXT_PUBLIC_SENTRY_DSN, Sentry.init no envia nada a ningun lado — desarrollo
// local no necesita una cuenta de Sentry.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
