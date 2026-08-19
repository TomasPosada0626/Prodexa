import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Cierra los hallazgos reales del scan OWASP ZAP baseline contra produccion
  // (docs/security/zap-baseline-scan.md, item 1.7 de roadmap-calidad-90.md):
  // el backend ya los tenia via helmet(), el frontend en Vercel no.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

// No agregar aqui ninguna opcion de output file tracing (ej. outputFileTracingRoot):
// un intento anterior de setearla en este archivo rompio el build en Vercel (ENOENT
// en .next/package.json durante el empaquetado del output). withSentryConfig no la
// toca por si solo, y hay que mantenerlo asi.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
});
