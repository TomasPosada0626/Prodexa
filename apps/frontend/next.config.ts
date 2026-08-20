import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Derivado de NEXT_PUBLIC_API_URL (la misma variable que usa src/lib/api.ts) en vez de
// hardcodear el dominio, para que la CSP funcione igual en local y en produccion sin
// duplicar el origin del backend en dos lugares.
const backendOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1").origin;
  } catch {
    return "";
  }
})();

// Verificada en modo Report-Only el 2026-08-20 contra los flujos reales (registro, login,
// dashboard, crear formulacion, editor de texto enriquecido, configuracion, auditoria,
// reportes) -- 0 violaciones en consola, ver docs/security/zap-baseline-scan.md. No hace
// falta allowlist para Sentry gracias a tunnelRoute (ver withSentryConfig abajo) -- los
// eventos viajan same-origin.
//
// 'unsafe-eval' solo en development: React usa eval() en dev para reconstruir stack
// traces de Fast Refresh (confirmado con el enforcing real: sin esto, la consola tira
// "eval() is not supported... React requires eval() in development mode"). React mismo
// aclara que "nunca usa eval() en produccion", asi que ahi se queda fuera.
const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const contentSecurityPolicy = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${backendOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${backendOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

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
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
  // Los eventos van same-origin (/monitoring, proxeado por el propio Next.js) en vez de
  // directo al dominio de ingest de Sentry -- asi la CSP no necesita una excepcion para
  // Sentry en connect-src (y evita adivinar el host de ingest, que varia por region/DSN).
  tunnelRoute: "/monitoring",
});
