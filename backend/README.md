# Backend FITZONE

API REST con NestJS 11, TypeScript, Prisma 6 y PostgreSQL/Supabase.
El frontend Next.js está en ../frontend y consume el prefijo /api/v1.

## Arquitectura

- src/main.ts: arranque HTTP, CORS con credenciales y validación global de DTO.
- src/modules/auth: login con bcrypt, JWT HS256 y cookie fitzone_session HttpOnly.
- src/modules/users: listado paginado, consulta, registro, edición y eliminación.
- src/modules/memberships: listado, registro, edición y clasificación de vencimientos.
- src/modules/payments: listado y registro; valida la relación usuario/membresía.
- src/modules/plans: consulta de planes.
- src/modules/dashboard: resumen administrativo de solo lectura (estadísticas, ingresos por mes y listas breves).
- src/prisma: conexión y desconexión de Prisma durante el ciclo de vida de NestJS.

Prisma mapea los modelos a usuarios, planes, membresias, pagos y administradores.
Las migraciones existentes están en prisma/migrations. La compilación no aplica
migraciones ni ejecuta semillas.

## Configuración local

Requiere Node.js compatible con las dependencias instaladas (verificado con Node 22).
Configura backend/.env localmente sin publicar sus valores:

| Variable | Uso |
| --- | --- |
| DATABASE_URL | Conexión PostgreSQL utilizada por Prisma Client |
| DIRECT_URL | Conexión directa declarada en el esquema Prisma |
| JWT_SECRET | Secreto aleatorio obligatorio de al menos 32 bytes |
| PORT | Puerto HTTP; predeterminado 3001 |
| CORS_ORIGIN | Orígenes separados por coma; por defecto localhost y 127.0.0.1 en puerto 3000 |
| NODE_ENV | En producción activa Secure en la cookie y requiere HTTPS |

.env y .env.* están excluidos mediante .gitignore; .env.example es la excepción
destinada a documentación. No colocar secretos en variables NEXT_PUBLIC_*.
El frontend requiere NEXT_PUBLIC_API_BASE_URL con el prefijo /api/v1.
En local, usar el mismo nombre de host en ambos servicios (por ejemplo, localhost)
para que la cookie SameSite=Lax se envíe correctamente.

## Comandos

Desde C:\FITZONE\backend, en PowerShell:

```powershell
npm.cmd run build
npm.cmd run start:prod
```

Para desarrollo: npm.cmd run start:dev.
El build regenera dist y los artefactos de TypeScript. No ejecutar simultáneamente
un build y un proceso que dependa del contenido anterior de dist.

Comprobaciones sin cambios en la base de datos:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
.\node_modules\.bin\prisma.cmd validate
npm.cmd ls --depth=0
```

## Autenticación

- POST /api/v1/auth/login: público; valida correo/contraseña contra un administrador
  existente y establece una cookie HttpOnly, SameSite=Lax, con duración de una hora.
  El JWT no se devuelve en el cuerpo de la respuesta.
- GET /api/v1/auth/session: privado; verifica firma, expiración, emisor y audiencia.
- POST /api/v1/auth/logout: público e idempotente; únicamente elimina la cookie,
  incluso si el JWT ha expirado. No habilita acceso a datos administrativos.
- El guard global protege usuarios, membresías, pagos, planes y dashboard.
- El frontend envía credenciales y redirige al login ante HTTP 401 de la API privada.

El logout elimina la cookie del navegador; no hay una lista de revocación de JWT
en el servidor. El despliegue debe conservar la configuración de cookies y
orígenes coherente con los dominios utilizados.

## Dashboard administrativo

GET /api/v1/dashboard requiere la cookie de sesión existente y responde con Cache-Control: no-store.
No hay acceso directo de Next.js a Supabase. El frontend utiliza authFetch con credentials: include.

El resumen calcula el total de usuarios, membresías activas, próximas y vencidas, ingresos totales
y del mes, una serie de 12 meses (incluyendo ceros), seis vencimientos próximos, cuatro usuarios
por nombre y los cuatro pagos más recientes. Los importes se devuelven como cadenas decimales.
Dos consultas: detección de la columna de fecha de registro y un único SELECT agregado; las cifras
y listas de ese SELECT comparten la misma instantánea de PostgreSQL. No ejecuta migraciones ni escrituras.

Reglas: ACTIVE con vencimiento a más de cinco días = activa; vencimiento entre ahora y ahora+5 días,
inclusive = próxima; anterior a ahora = vencida. CANCELLED queda excluida de las tres cantidades.
Se conservan las reglas del módulo de membresías, incluida la clasificación separada de próximas.
Los límites mensuales y la agrupación de pagos usan America/Bogota. La comparación, cuando hay
pagos e ingresos positivos del mes anterior, enfrenta el mes en curso con el mes anterior completo;
la interfaz lo indica expresamente. Sin base de comparación devuelve null.

El esquema actual no registra la fecha de alta de los usuarios. newUsersThisMonth devuelve null y
la interfaz muestra No disponible. No debe deducirse esa fecha de UUID ni de membresías/pagos.
La propuesta propuestas/dashboard/fecha-alta-usuarios.sql está fuera de las migraciones y NO se
ha aplicado: requiere autorización expresa. De aplicarse, los registros históricos quedarían NULL
y solo las futuras inserciones recibirían fecha real; la documentación de Prisma deberá actualizarse
junto con la migración autorizada. El endpoint admite esa columna opcional sin exigirla al esquema actual.

El dashboard consulta al montar, al recuperar foco/visibilidad, cada minuto y tras eventos de operaciones
administrativas exitosas. El reloj de Colombia evita diferencias de hidratación y cambia al pasar medianoche.
Las validaciones nuevas están en ../evidencias/dashboard; las evidencias académicas históricas se conservan.

## Estado y pendientes

Los módulos de gestión, la sesión JWT y el dashboard están conectados a la API real.
El administrador ya existe; no ejecutar create-admin.js para esta corrección.
El dato de altas mensuales requiere la autorización descrita arriba. No ejecutar migraciones,
semillas ni modificaciones de registros sin autorización específica. El entorno E23 se conserva aparte.
