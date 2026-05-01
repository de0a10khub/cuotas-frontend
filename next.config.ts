import type { NextConfig } from 'next';
import path from 'path';

// Backend al que el frontend hace fetch (configurable via env, default Render prod).
// Se incluye en CSP connect-src para que las peticiones XHR no se bloqueen.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://cuotas-backend.onrender.com';

// Content-Security-Policy.
// - script-src incluye 'unsafe-inline' y 'unsafe-eval' porque Next.js
//   inyecta scripts inline para hidratación; sin esos flags se rompe la app.
//   (Para subir a strict-CSP con nonces hace falta middleware específico —
//   tarea futura.) Aun sin nonces, esta CSP bloquea CARGA de scripts externos
//   no listados → mitigación grande contra dependencias npm comprometidas.
// - style-src 'unsafe-inline' lo necesitan Tailwind/shadcn (inline styles
//   generados por className/cn).
// - frame-ancestors 'none' bloquea clickjacking (web no se puede embeber
//   en iframe externo).
// - connect-src restringido a self + API → si un script intenta exfiltrar
//   datos a otro dominio, el browser lo bloquea.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${API_ORIGIN}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  // Anti-clickjacking (legacy, complementa frame-ancestors).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Browser no debe inferir MIME types — bloquea ejecución de archivos
  // subidos como JS si el server los marca como otra cosa.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Al hacer click en links externos solo se manda origen, no la URL completa.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restringe APIs sensibles del browser que la web no usa.
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
      'autoplay=()',
      'fullscreen=(self)',
    ].join(', '),
  },
  // HSTS — Vercel ya la setea pero la reforzamos.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Aísla el contexto del browser entre tabs/ventanas (anti-Spectre).
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // CSP final.
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Headers de seguridad aplicados a todas las rutas.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // /cobros se fusionó en la home (/). Mantenemos redirect permanente
  // por si quedan bookmarks o enlaces antiguos en emails/docs.
  async redirects() {
    return [
      {
        source: '/cobros',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // No exponer source maps en producción — limitan la info que un atacante
  // puede sacar leyendo el bundle minificado.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
