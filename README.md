# cuotas-frontend

Frontend Next.js 16 del sistema de conciliación de pagos y mora.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui (Base UI)
- **Recharts** para gráficas
- **API:** Django DRF (repo `cuotas-django`) vía JWT

## Desarrollo local

```bash
npm install
cp .env.example .env.local  # apunta a tu backend Django
npm run dev
```

http://localhost:3000 → te redirige a `/login`

Credenciales dev (tras correr `seed_demo` en Django): `laura` / `PaquitoPueblos123`

## Páginas

- `/` Dashboard · `/board2` KPIs · `/datos` · `/riesgos` · `/operaciones`
- `/clientes` · `/cobros` · `/conciliacion`
- `/mora` · `/mora-stats` · `/recobros` · `/registro-acciones`
- `/empleados` · `/usuarios` · `/catalogo` · `/integraciones`

## Deploy en Vercel

1. https://vercel.com/new → Import repo `cuotas-frontend`
2. Environment variable:
   - `NEXT_PUBLIC_API_URL` → URL del backend Render
3. Deploy → te da `cuotas-frontend-xxx.vercel.app`
4. **Importante:** añade esa URL a `CORS_ALLOWED_ORIGINS` del backend
