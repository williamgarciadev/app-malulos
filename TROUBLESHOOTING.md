# Troubleshooting (PostgreSQL)

## 1) API no responde

- Verifica `npm run dev:server`.
- Abre `http://localhost:3000/api/health`.

## 2) Error DATABASE_URL

- Crea `server/.env` con credenciales correctas.

## 3) PostgreSQL no conecta

- Verifica que el servicio este corriendo.
- Prueba con `psql -U postgres`.

## 4) Frontend sin datos

- Verifica `VITE_API_URL` (debe terminar en `/api`).
- Revisa consola del navegador.

## 5) Seed falla

- Verifica permisos y conexion a la DB.
- Revisa errores en terminal.
