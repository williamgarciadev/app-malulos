# Malulos POS

Sistema POS cliente-servidor para restaurante. Frontend React + Vite y backend Express con PostgreSQL.

## Requisitos

- Node.js 18+
- PostgreSQL 12+

## Estructura del proyecto

- `src/`: frontend React + TypeScript
- `server/`: backend Express + PostgreSQL
- `public/`: assets
- `docs/`: capturas

## Instalacion paso a paso

### 1) Instalar dependencias

```bash
npm install
cd server
npm install
cd ..
```

### 2) Configurar PostgreSQL

Crear una base de datos (ej: `malulos_pos`) y configurar `server/.env`:

```bash
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/malulos_pos
PORT=3000
```

### 3) Cargar datos iniciales

```bash
npm run seed
```

Crea categorias, productos, mesas y usuarios por defecto.

### 4) Levantar el sistema

```bash
npm run dev:all
```

- Frontend: http://localhost:5174
- API: http://localhost:3000/api

### 5) Verificacion rapida

- http://localhost:3000/api/health
- Login con PIN `1234`

## Configuracion del frontend

Si necesitas apuntar a otra IP:

```env
VITE_API_URL=http://192.168.1.100:3000/api
```

## Scripts principales

- `npm run dev:all`: frontend + backend
- `npm run seed`: carga datos iniciales en PostgreSQL
- `npm run check`: validacion basica
- `npm run lint`: lint

## Documentacion

- `INSTALL.md`: instalacion detallada
- `MIGRATION.md`: detalles de PostgreSQL
- `TESTING.md`: pruebas manuales
- `TROUBLESHOOTING.md`: resolucion de problemas
- `QUICK_REFERENCE.md`: comandos rapidos
