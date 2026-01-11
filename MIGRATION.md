# PostgreSQL (Backend)

## Configuracion

`server/.env`:

```bash
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/malulos_pos
PORT=3000
```

## Scripts utiles

- `npm run seed`: carga datos iniciales.
- `npm run check`: validacion basica.

## Endpoints de verificacion

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/products`

## Notas tecnicas

- Campos complejos se guardan como JSONB.
- El backend mapea columnas a camelCase.
