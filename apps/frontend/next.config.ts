import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
};

// No agregar aqui ninguna opcion de output file tracing (ej. outputFileTracingRoot):
// un intento anterior de setearla en este archivo rompio el build en Vercel (ENOENT
// en .next/package.json durante el empaquetado del output). withSentryConfig no la
// toca por si solo, y hay que mantenerlo asi.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
});
