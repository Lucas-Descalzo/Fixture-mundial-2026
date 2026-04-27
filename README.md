# Fixture Mundial 2026

Aplicacion web interactiva para armar predicciones del Mundial 2026, crear grupos de amigos, guardar fixtures y comparar rankings cuando se cargan resultados reales.

Proyecto hecho por Lucas Descalzo.

## Funcionalidades

- Fixture interactivo del Mundial 2026 con 12 grupos, mejores terceros y cuadro final.
- Bracket visual responsive desde 16avos hasta la final.
- Fechas, sedes y metadata oficial de cada partido eliminatorio.
- Tabla general publica para predicciones individuales.
- Grupos compartidos por link con nombre, apellido y clave de edicion.
- Fecha limite por grupo en horario Argentina.
- Ranking opcional por puntos para grupos.
- Panel admin protegido por clave.
- Carga manual de resultados reales para calcular puntajes.
- Exportacion del cuadro final como imagen PNG.
- Vercel Analytics integrado.

## Sistema de puntos

El ranking compara cada prediccion contra el fixture real cargado desde el panel admin.

- Fase de grupos: +1 por cada equipo clasificado acertado y +2 extra si tambien acerto la posicion exacta.
- Eliminatorias por supervivencia: 16avos +1, octavos +2, cuartos +3, semifinales +5 y finalistas +7 por equipo acertado.
- Bonus finales: final exacta +3, campeon +10 y tercer puesto +3.

## Stack

- Next.js App Router
- TypeScript
- React
- Neon Postgres
- Vercel
- Vercel Analytics
- Motion
- html-to-image
- Vitest

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Crear `.env.local` con:

```bash
DATABASE_URL="postgres://..."
ADMIN_PASSWORD="tu-clave-admin"
```

Levantar el servidor:

```bash
npm run dev
```

Abrir:

```txt
http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```

## Base de datos

El esquema principal esta en:

```txt
db/groups-schema.sql
```

La app tambien tiene inicializacion defensiva en runtime para crear o actualizar tablas necesarias si la base ya existe.

## Rutas principales

- `/`: fixture individual.
- `/tabla-general`: predicciones publicas y ranking general.
- `/grupos/nuevo`: crear grupo compartido.
- `/grupos/[slug]`: participar o ver grupo.
- `/admin`: panel privado para grupos, fixtures y resultados reales.

## Deploy

El proyecto esta preparado para Vercel.

```bash
npx vercel --prod
```

Variables requeridas en Vercel:

- `DATABASE_URL`
- `ADMIN_PASSWORD`

## Notas

Los assets de banderas y branding estan en `public/`. La app no guarda claves de participantes en texto plano; se almacenan con hash y salt.
