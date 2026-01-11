# Malulos POS (PostgreSQL)

Backend en PostgreSQL para soportar multiples dispositivos. Frontend React + Vite.

## Setup rapido

1) Instalar PostgreSQL 12+.
2) Crear DB `malulos_pos`.
3) Configurar `server/.env`:

```bash
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/malulos_pos
PORT=3000
```

4) Cargar datos y levantar:

```bash
npm run seed
npm run dev:all
```

## URLs

- Frontend: http://localhost:5174
- API: http://localhost:3000/api

## Notas

- `VITE_API_URL` debe terminar en `/api`.
- Los datos viven en PostgreSQL.
