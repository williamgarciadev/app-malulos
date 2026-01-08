# ⚡ Referencia Rápida - Malulos POS

Comandos y soluciones más usadas en un solo lugar.

---

## 🚀 Comandos Esenciales

### Setup Inicial (Primera Vez)

```bash
# 1. Crear base de datos PostgreSQL
createdb malulos_pos

# 2. Configurar backend
cd server
cp .env.example .env
# Editar .env: DATABASE_URL=postgresql://postgres:password@localhost:5432/malulos_pos

# 3. Instalar dependencias
npm install

# 4. Seed de datos iniciales
npm run seed

# 5. Instalar frontend
cd ..
npm install
```

---

### Desarrollo Diario

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev

# Abrir navegador
http://localhost:5174
```

---

### Comandos Útiles

```bash
# Verificar datos en BD
cd server && npm run check

# Re-ejecutar seed
npm run seed

# Build para producción
npm run build

# Limpiar BD y re-seed
psql -U postgres -d malulos_pos -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run seed
```

---

## 🔐 Usuarios por Defecto

| Usuario | PIN | Rol | Permisos |
|---------|-----|-----|----------|
| **Admin** | `1234` | admin | ✅ Acceso total |
| **Cajero** | `2222` | cashier | ✅ Pedidos + Caja |
| **Mesero** | `3333` | waiter | ⚠️ Solo pedidos |

---

## 🌐 URLs Importantes

### Frontend
- **Home**: http://localhost:5174/
- **Login**: http://localhost:5174/login
- **Caja**: http://localhost:5174/cash
- **Cocina**: http://localhost:5174/kitchen
- **Menú**: http://localhost:5174/menu
- **Reportes**: http://localhost:5174/reports

### Backend API
- **Health**: http://localhost:3000/api/health
- **Productos**: http://localhost:3000/api/products
- **Mesas**: http://localhost:3000/api/tables
- **Pedidos**: http://localhost:3000/api/orders
- **Usuarios**: http://localhost:3000/api/users

---

## 🐛 Soluciones Rápidas

### Backend no arranca

```bash
# ¿PostgreSQL está corriendo?
psql -U postgres -c "SELECT version();"

# ¿Existe .env?
cat server/.env

# ¿DATABASE_URL está configurado?
grep DATABASE_URL server/.env
```

---

### Productos no se muestran

```bash
# 1. Verificar que hay datos
cd server && npm run check

# 2. Si no hay datos:
npm run seed

# 3. Reiniciar backend
npm run dev

# 4. Verificar endpoint
curl http://localhost:3000/api/products
```

---

### Error SSL

**Problema**: `Error: The server does not support SSL connections`

**Solución**: Verificar que `.env` use `localhost`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/malulos_pos
```

El código auto-detecta localhost y desactiva SSL.

---

### Error 404 en API

**Reiniciar backend** después de agregar/modificar endpoints:

```bash
# Ctrl + C para detener
cd server
npm run dev
```

---

## 📊 Datos de Seed

Después de ejecutar `npm run seed`:

- **6 categorías**: Hamburguesas, Papas, Bebidas, Perros, Postres, Combos
- **4 productos**: Hamburguesa Clásica, Papas Francesas, Coca-Cola, Combo Clásico
- **6 mesas**: Mesa 1-6 (capacidades: 4, 4, 2, 6, 4, 4)
- **3 usuarios**: Admin (1234), Cajero (2222), Mesero (3333)
- **1 config**: Negocio "Malulos", moneda COP ($)

---

## 🔧 Variables de Entorno

### `server/.env`

```env
# REQUERIDO
DATABASE_URL=postgresql://postgres:password@localhost:5432/malulos_pos

# OPCIONAL
PORT=3000
TELEGRAM_BOT_TOKEN=
```

**Importante**:
- ✅ Usar `localhost` para desarrollo local (SSL OFF)
- ✅ Usar dominio remoto para producción (SSL ON)

---

## 🗂️ Archivos Clave

### Backend
- `server/src/config/database.js` - Conexión PostgreSQL
- `server/src/models/*.js` - Modelos de datos
- `server/src/scripts/seed.js` - Datos iniciales
- `server/src/index.js` - API REST endpoints

### Frontend
- `src/pages/*.tsx` - Páginas principales
- `src/stores/*.ts` - Zustand stores (auth, cash, cart)
- `src/services/api.ts` - Cliente HTTP
- `src/types/index.ts` - Tipos TypeScript

### Documentación
- `README.md` - Inicio
- `MIGRATION.md` - Migración PostgreSQL
- `TROUBLESHOOTING.md` - Problemas y soluciones
- `TESTING.md` - Guía de testing
- `CHANGELOG.md` - Historial de cambios

---

## 🧪 Testing Rápido

### Verificar Backend

```bash
# 1. Health check
curl http://localhost:3000/api/health
# Esperado: {"status":"ok","message":"Malulos POS API running on PostgreSQL"}

# 2. Productos (debe tener camelCase)
curl http://localhost:3000/api/products
# Esperado: [{"id":1,"categoryId":1,"basePrice":15000,...}]

# 3. Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}'
# Esperado: {"id":1,"name":"Admin","role":"admin",...}
```

### Verificar Frontend

```bash
# 1. Abrir navegador
http://localhost:5174

# 2. Login con PIN 1234

# 3. Debe redirigir a /cash (apertura de caja)

# 4. Abrir caja con monto inicial (ej: 50000)

# 5. Debe redirigir a Home (selector de mesas)
```

---

## 📈 Métricas de Éxito

| Indicador | Esperado | Comando |
|-----------|----------|---------|
| PostgreSQL corriendo | ✅ | `psql -U postgres -c "SELECT 1"` |
| BD creada | ✅ malulos_pos | `psql -U postgres -l \| grep malulos` |
| Datos insertados | 6 mesas, 4 productos | `cd server && npm run check` |
| Backend arranca | <2 seg | `npm run dev` |
| Health check | 200 OK | `curl localhost:3000/api/health` |
| Frontend carga | <1 seg | Abrir http://localhost:5174 |
| Login funciona | PIN 1234 OK | Probar en /login |

---

## 🔍 Checklist de Debugging

Cuando algo falle, ejecutar en orden:

- [ ] 1. PostgreSQL está corriendo
- [ ] 2. Base de datos `malulos_pos` existe
- [ ] 3. Archivo `server/.env` existe
- [ ] 4. `DATABASE_URL` configurado en .env
- [ ] 5. Datos en BD (`npm run check` muestra datos)
- [ ] 6. Backend corriendo (puerto 3000)
- [ ] 7. Frontend corriendo (puerto 5174)
- [ ] 8. Sin errores en consola del navegador (F12)
- [ ] 9. Backend reiniciado después de cambios
- [ ] 10. Frontend recargado (F5)

---

## 🔗 Enlaces Directos

- **Instalar PostgreSQL**: https://www.postgresql.org/download/
- **Documentación pg**: https://node-postgres.com/
- **React DevTools**: https://react.dev/learn/react-developer-tools
- **PostgreSQL GUI**: https://www.pgadmin.org/ o https://dbeaver.io/

---

## 💡 Tips Pro

### Desarrollo

```bash
# Ver logs de PostgreSQL
# Windows: Event Viewer → Windows Logs → Application
# Mac: ~/Library/Application Support/Postgres/var-XX/
# Linux: /var/log/postgresql/

# Conectar directamente a BD
psql -U postgres -d malulos_pos

# Listar todas las tablas
\dt

# Ver datos de una tabla
SELECT * FROM products LIMIT 5;

# Salir de psql
\q
```

### Productividad

```bash
# Alias útiles (agregar a ~/.bashrc o ~/.zshrc)
alias malulos-backend="cd ~/malulos-pos/server && npm run dev"
alias malulos-frontend="cd ~/malulos-pos && npm run dev"
alias malulos-check="cd ~/malulos-pos/server && npm run check"
alias malulos-seed="cd ~/malulos-pos/server && npm run seed"
```

### Performance

```bash
# Verificar queries lentas en PostgreSQL
psql -U postgres -d malulos_pos -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"
```

---

## 🆘 Ayuda Rápida

| Problema | Ver |
|----------|-----|
| SSL error | [TROUBLESHOOTING.md#1](./TROUBLESHOOTING.md#1-ssl-connections) |
| Productos no aparecen | [TROUBLESHOOTING.md#2](./TROUBLESHOOTING.md#2-productos-no-se-muestran) |
| Mesas vacías | [TROUBLESHOOTING.md#3](./TROUBLESHOOTING.md#3-mesas-no-aparecen) |
| Error 404 | [TROUBLESHOOTING.md#5](./TROUBLESHOOTING.md#5-errores-404-en-api) |
| PostgreSQL no conecta | [TROUBLESHOOTING.md#7](./TROUBLESHOOTING.md#7-conexión-a-postgresql) |

---

## 📞 Soporte

**¿No encuentras la respuesta?**

1. Revisar [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) completo
2. Consultar [MIGRATION.md](./MIGRATION.md) para contexto
3. Verificar [CHANGELOG.md](./CHANGELOG.md) por cambios recientes
4. Crear issue en GitHub con:
   - Error exacto
   - Pasos para reproducir
   - Salida de `npm run check`
   - Tu configuración (.env sin credenciales)

---

**Última actualización**: 2026-01-07
**Versión**: 1.0.0
