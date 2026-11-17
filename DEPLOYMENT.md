# Despliegue público de FITZONE

## Arquitectura preparada

- Vercel publica `frontend` como aplicación Next.js.
- Render publica `backend` como API NestJS.
- Next.js proxya `/api/v1/*` hacia `API_UPSTREAM_URL`; el navegador conserva el origen de Vercel y envía la cookie HttpOnly con `SameSite=Lax`.
- El proxy apunta a `http://localhost:3001` por omisión para desarrollo local. El `.env.local` existente no se modifica.
- Render no ejecuta migraciones ni semillas. `prisma generate` solo genera el cliente para compilar.

## Variables privadas

Configura estas variables en los paneles de los proveedores; nunca las subas a Git:

**Render (servicio `backend`):**

- `NODE_ENV=production`
- `DATABASE_URL`: URL PostgreSQL de Supabase para la aplicación. Usa el pooler recomendado por Supabase si la conexión es serverless/limitada.
- `DIRECT_URL`: URL de conexión directa de Supabase, según el formato requerido por el esquema Prisma.
- `JWT_SECRET`: valor aleatorio de al menos 32 bytes. Genera uno nuevo para producción; no reutilices el secreto local.
- `CORS_ORIGIN`: origen exacto de la aplicación Vercel, por ejemplo `https://fitzone-tuusuario.vercel.app` (sin barra final).

**Vercel (Production y Preview si se usan):**

- `NEXT_PUBLIC_API_BASE_URL=/api/v1`
- `API_UPSTREAM_URL=https://<nombre-del-servicio>.onrender.com` (sin `/api/v1` al final).

No configures secretos de Supabase ni `JWT_SECRET` en Vercel o en variables `NEXT_PUBLIC_*`.

## Pasos para publicar

1. Comprueba localmente que `.env`, `.env.local`, `node_modules`, `dist` y los archivos temporales no aparezcan en `git status` como archivos para publicar.
2. Crea un repositorio **privado** en GitHub y conecta `C:\FITZONE`. Revisa el listado del primer commit y confirma que no incluya `.env`, credenciales, logs ni datos personales de pruebas.
3. En Render, crea un Web Service desde el repositorio y aplica el blueprint raíz `render.yaml` (usa `backend` como Root Directory). Deja Auto Deploy desactivado hasta terminar la revisión. Carga las cuatro variables privadas de la sección anterior.
4. Espera el build de Render y copia el dominio HTTPS `*.onrender.com` del servicio.
5. En Vercel, importa el mismo repositorio y establece `frontend` como Root Directory. Configura `NEXT_PUBLIC_API_BASE_URL=/api/v1` y `API_UPSTREAM_URL` con el dominio Render HTTPS. Inicia el despliegue.
6. Copia el dominio Vercel HTTPS y actualiza `CORS_ORIGIN` en Render con ese origen exacto. Reinicia/redeploya el backend si el panel lo requiere.
7. Verifica que abra la página, que `/api/v1/auth/session` responda `401` sin autenticación (ruta privada alcanzable y sin escritura), y luego realiza manualmente registro/login/panel desde otro navegador o teléfono.

El plan gratuito de Render suspende servicios inactivos, por lo que la primera petición puede tardar. Vercel Hobby y Render Free tienen límites que sus proveedores pueden cambiar. La URL de Vercel se mantiene estable mientras se conserve el proyecto; no se ha creado todavía ningún servicio ni dominio.

## Local

El proxy local apunta a `localhost:3001` de forma predeterminada y el backend conserva los orígenes locales. El `.env.local` existente puede seguir usando su URL directa `http://localhost:3001/api/v1`; para probar el proxy local, usa `/api/v1` como `NEXT_PUBLIC_API_BASE_URL`.

Comandos de validación (sin migraciones ni escrituras de base de datos):

```powershell
cd frontend
npm.cmd run lint
npm.cmd test
npx.cmd tsc --noEmit --incremental false
npm.cmd run build

cd ..\backend
npx.cmd tsc --noEmit --incremental false
npx.cmd prisma validate
npm.cmd run build
```
