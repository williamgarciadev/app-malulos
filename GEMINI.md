**Malulos POS** is a Point of Sale system for fast-food restaurants. It uses a React frontend and an Express.js backend with PostgreSQL, supporting multiple devices (waiters, kitchen, cashier).

## Tech stack
- Frontend: React 18 + TypeScript + Vite (port 5174)
- Backend: Node.js + Express.js (port 3000)
- Database: PostgreSQL (via `pg`)

## Quick start

```bash
npm install
cd server
npm install
cd ..
```

Create `server/.env`:

```bash
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/malulos_pos
PORT=3000
```

Seed and run:

```bash
npm run seed
npm run dev:all
```

Open:
- http://localhost:5174
- http://localhost:3000/api/health

## Notes
- Data lives in PostgreSQL only.
- Configure frontend API base with `VITE_API_URL=http://localhost:3000/api` if needed.
