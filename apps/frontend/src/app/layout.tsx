import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";
import { ThemeProvider } from "@/context/theme-context";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('prodexa-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

// Reemplaza Geist (la fuente por defecto de cualquier proyecto Next.js sin
// personalizar) por un par con punto de vista propio, pensado para el publico
// real: dueños de pymes de alimentos/cosmeticos evaluando software serio de
// costeo, no una app de consumo. IBM Plex Sans es tecnica y legible en tablas
// densas (Auditoria, Reportes); Space Grotesk le da caracter a los titulos sin
// perder seriedad; Space Mono comparte familia con Space Grotesk y refuerza
// que los numeros de costo son precisos, no una hoja de calculo.
const bodySans = IBM_Plex_Sans({
  variable: "--font-body-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const headingSans = Space_Grotesk({
  variable: "--font-heading-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const dataMono = Space_Mono({
  variable: "--font-data-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Prodexa",
  description: "Plataforma profesional de formulaciones, costos y simulacion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${bodySans.variable} ${headingSans.variable} ${dataMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets the .dark class before hydration to avoid a light-mode flash for users with a saved dark preference. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
