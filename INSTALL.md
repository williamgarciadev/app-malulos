# Instalacion detallada (PostgreSQL)

## 1. Requisitos previos

- Node.js 18+
- PostgreSQL 12+
- Acceso a terminal

## 2. Clonar y dependencias

```bash
npm install
cd server
npm install
cd ..
```

## 3. Configurar PostgreSQL

### 3.1 Crear base de datos

Ejemplo con psql:

```bash
psql -U postgres
CREATE DATABASE malulos_pos;
\q
```

### 3.2 Configurar variables de entorno

Crear `server/.env`:

```bash
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/malulos_pos
PORT=3000
```

## 4. Cargar datos iniciales

```bash
npm run seed
```

Usuarios por defecto:
- Admin: PIN `1234`
- Cajero: PIN `2222`
- Mesero: PIN `3333`
- Repartidor: PIN `4444`

## 5. Levantar la aplicacion

```bash
npm run dev:all
```

- Backend API: http://localhost:3000/api
- Frontend: http://localhost:5174

## 6. Acceso desde otros dispositivos

1) Conectate a la misma red WiFi.
2) Abre `http://[TU_IP]:5174`.
3) Backend en `http://[TU_IP]:3000/api`.

Opcional, crear `.env` en la raiz:

```env
VITE_API_URL=http://[TU_IP]:3000/api
```

## 7. Firewall (Windows)

```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5174
New-NetFirewallRule -DisplayName "Malulos POS API" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

## 8. Troubleshooting rapido

- `DATABASE_URL` invalida: revisar `server/.env`.
- PostgreSQL detenido: iniciar servicio.
- Puerto 3000 ocupado: cambiar `PORT`.
