# 🔧 Troubleshooting Guide - Malulos POS

Guía de resolución de problemas para Malulos POS con PostgreSQL.

---

## 📋 Índice de Problemas

1. [SSL Connections](#1-ssl-connections)
2. [Productos no se muestran](#2-productos-no-se-muestran)
3. [Mesas no aparecen](#3-mesas-no-aparecen)
4. [Errores de Seed](#4-errores-de-seed)
5. [Errores 404 en API](#5-errores-404-en-api)
6. [Warnings de React](#6-warnings-de-react)
7. [Conexión a PostgreSQL](#7-conexión-a-postgresql)
8. [Problemas de TypeScript](#8-problemas-de-typescript)

---

## 1. SSL Connections

### ❌ Error

```
Error: The server does not support SSL connections
    at D:\...\node_modules\pg-pool\index.js:45:11
```

### 🔍 Causa

PostgreSQL local no tiene SSL habilitado por defecto. El código intentaba usar SSL siempre.

### ✅ Solución

El código ahora auto-detecta si está en localhost y desactiva SSL automáticamente.

**Verificar configuración**:

```javascript
// server/src/config/database.js líneas 10-23
const isLocalhost = connectionString.includes('localhost') ||
                    connectionString.includes('127.0.0.1');

const poolConfig = { connectionString };

if (!isLocalhost) {
    poolConfig.ssl = { rejectUnauthorized: false };
}
```

**Verificar `.env`**:
```env
# ✅ Correcto (localhost detectado, SSL OFF)
DATABASE_URL=postgresql://postgres:password@localhost:5432/malulos_pos

# ✅ Correcto (127.0.0.1 detectado, SSL OFF)
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/malulos_pos

# ✅ Correcto (producción, SSL ON)
DATABASE_URL=postgresql://user:pass@malulos.render.com:5432/db
```

### 🧪 Testing

```bash
# Debería conectar sin errores
npm run seed

# Salida esperada:
# 🐘 Conector PostgreSQL preparado (desarrollo local).
```

---

## 2. Productos no se muestran

### ❌ Síntoma

- `/menu` muestra pantalla vacía
- `http://localhost:3000/api/products` devuelve JSON
- Console del navegador: sin errores

### 🔍 Causa

PostgreSQL devuelve campos en **lowercase** (`categoryid`, `baseprice`), pero el frontend TypeScript espera **camelCase** (`categoryId`, `basePrice`).

**Ejemplo del problema**:

```json
// ❌ Lo que devolvía PostgreSQL:
{
  "id": 1,
  "categoryid": 1,          // lowercase
  "baseprice": 15000,       // lowercase
  "iscombo": 0,             // lowercase
  "createdat": "2026-01-07T..." // lowercase
}

// ✅ Lo que espera TypeScript:
{
  "id": 1,
  "categoryId": 1,          // camelCase
  "basePrice": 15000,       // camelCase
  "isCombo": 0,             // camelCase
  "createdAt": "2026-01-07T..." // camelCase
}
```

### ✅ Solución

Mapeo explícito en queries SQL usando `AS "camelCase"`:

```javascript
// server/src/models/Product.js
static async getAll() {
    const res = await pool.query(`
        SELECT
            id,
            categoryId AS "categoryId",      -- ✅ Mapeo explícito
            name,
            basePrice AS "basePrice",        -- ✅ Mapeo explícito
            isCombo AS "isCombo",            -- ✅ Mapeo explícito
            createdAt AS "createdAt"         -- ✅ Mapeo explícito
        FROM products
        WHERE isActive = 1
    `);
    return res.rows;
}
```

**Archivos corregidos**:
- ✅ `server/src/models/Product.js`
- ✅ `server/src/models/Order.js`
- ✅ `server/src/models/index.js` (Category, RestaurantTable, User, CashSession)
- ✅ `server/src/models/Customer.js`

### 🧪 Testing

```bash
# 1. Reiniciar backend
cd server
npm run dev

# 2. Probar endpoint
curl http://localhost:3000/api/products

# 3. Verificar respuesta (debe tener camelCase):
# {
#   "id": 1,
#   "categoryId": 1,     ✅
#   "basePrice": 15000   ✅
# }

# 4. Abrir frontend
http://localhost:5174/menu

# Debería mostrar 4 productos
```

---

## 3. Mesas no aparecen

### ❌ Síntoma

- Home/Tables muestra "No hay mesas disponibles"
- `http://localhost:3000/api/tables` devuelve `[]`

### 🔍 Causa

El seed no se ejecutó correctamente o la base de datos está vacía.

### ✅ Solución

**Paso 1: Verificar datos**

```bash
cd server
npm run check
```

**Salida esperada**:
```
📋 MESAS:
   Total: 6 mesas
   - Mesa 1: available (capacidad: 4)
   - Mesa 2: available (capacidad: 4)
   ...
```

**Si muestra "Total: 0 mesas":**

```bash
# Ejecutar seed
npm run seed

# Salida esperada:
# 📦 Insertando mesas...
# ✅ 6 mesas insertadas
```

**Paso 2: Verificar mapeo de campos**

```bash
# Probar endpoint
curl http://localhost:3000/api/tables

# Verificar que tenga camelCase:
# [{
#   "id": 1,
#   "currentOrderId": null,  ✅ camelCase
#   "positionX": 0,          ✅ camelCase
#   "positionY": 0           ✅ camelCase
# }]
```

**Paso 3: Verificar frontend**

```bash
# Abrir en navegador
http://localhost:5174/

# Debería mostrar 6 mesas
```

---

## 4. Errores de Seed

### ❌ Error: "llave duplicada viola restricción de unicidad «users_pin_key»"

```
error: llave duplicada viola restricción de unicidad «users_pin_key»
detail: 'Ya existe la llave (pin)=(1234).'
```

### 🔍 Causa

El usuario Admin se crea en `initSchema()` al arrancar el servidor. Luego `seed.js` intenta crearlo nuevamente.

### ✅ Solución

El seed ahora usa `ON CONFLICT (pin) DO NOTHING`:

```javascript
// server/src/scripts/seed.js líneas 152-158
const result = await pool.query(
    'INSERT INTO users (name, pin, role, isActive) VALUES ($1, $2, $3, $4) ON CONFLICT (pin) DO NOTHING',
    user
);
```

**Resultado**: El seed puede ejecutarse múltiples veces sin error.

### 🧪 Testing

```bash
# Ejecutar seed múltiples veces
npm run seed
npm run seed
npm run seed

# Todas deberían completar sin error
# La primera inserta datos
# Las siguientes: "ℹ️  Usuarios ya existían..."
```

---

### ❌ Error: "La base de datos ya contiene datos. Saltando seed."

```
🌱 Iniciando proceso de seed...
ℹ️  La base de datos ya contiene datos. Saltando seed.
```

### 🔍 Causa

El seed verifica si hay categorías antes de insertar. Si encuentra datos, no hace nada.

### ✅ Solución Opción 1: Limpiar BD

```bash
# CUIDADO: Esto borra TODOS los datos
psql -U postgres -d malulos_pos -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Luego ejecutar seed
npm run seed
```

### ✅ Solución Opción 2: Verificar datos existentes

```bash
# Verificar qué datos hay
npm run check

# Si ya hay 6 mesas, 6 categorías, 4 productos → está correcto
# No necesitas volver a ejecutar seed
```

---

## 5. Errores 404 en API

### ❌ Error: PUT /api/customers/1 404 (Not Found)

```
PUT http://localhost:3000/api/customers/1 404 (Not Found)
API Error en /customers/1: Error: Error 404: Not Found
```

### 🔍 Causa

El endpoint `PUT /api/customers/:id` no existía en el backend.

### ✅ Solución

Endpoint agregado en `server/src/index.js` líneas 231-238:

```javascript
app.put('/api/customers/:id', async (req, res) => {
    try {
        const customer = await Customer.update(req.params.id, req.body);
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### 🧪 Testing

```bash
# Reiniciar backend
cd server
npm run dev

# Probar endpoint
curl -X PUT http://localhost:3000/api/customers/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Cliente Test","phone":"555-1234","address":"Calle Test"}'

# Debería devolver el cliente actualizado (200 OK)
```

---

## 6. Warnings de React

### ❌ Warning: "Each child in a list should have a unique key prop"

```
Warning: Each child in a list should have a unique "key" prop.
Check the render method of `Kitchen`.
    at li
    at Kitchen
```

### 🔍 Causa

Los items de órdenes usaban `key={item.id}` que podría no ser único entre diferentes órdenes.

```tsx
// ❌ Problema
{order.items.map(item => (
    <li key={item.id} className={styles.item}>
        {/* item.id podría repetirse en diferentes órdenes */}
    </li>
))}
```

### ✅ Solución

Usar clave compuesta que incluye el ID de la orden:

```tsx
// ✅ Solución (src/pages/Kitchen.tsx)
{order.items.map((item, index) => (
    <li key={`${order.id}-${item.id}-${index}`} className={styles.item}>
        {/* Garantiza unicidad */}
    </li>
))}
```

### 🧪 Testing

```bash
# Recargar frontend
# F5 en http://localhost:5174/kitchen

# Abrir DevTools (F12) → Console
# No debería haber warnings
```

---

## 7. Conexión a PostgreSQL

### ❌ Error: ECONNREFUSED

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### 🔍 Causa

PostgreSQL no está corriendo.

### ✅ Solución por OS

**Windows**:
```bash
# Verificar si está corriendo
net start | findstr postgresql

# Si no está, iniciar:
net start postgresql-x64-14
```

**macOS**:
```bash
# Verificar estado
brew services list | grep postgresql

# Si no está corriendo:
brew services start postgresql
```

**Linux**:
```bash
# Verificar estado
sudo systemctl status postgresql

# Si no está corriendo:
sudo systemctl start postgresql
```

### 🧪 Testing

```bash
# Intentar conectar
psql -U postgres

# Si conecta, PostgreSQL está corriendo
# Salir con \q
```

---

### ❌ Error: "La variable de entorno DATABASE_URL es obligatoria"

```
❌ ERROR: La variable de entorno DATABASE_URL es obligatoria.
```

### 🔍 Causa

El archivo `.env` no existe o no tiene la variable `DATABASE_URL`.

### ✅ Solución

```bash
cd server

# Crear .env desde template
cp .env.example .env

# Editar .env y configurar DATABASE_URL
# DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/malulos_pos
```

### 🧪 Testing

```bash
# Verificar que .env existe
ls -la .env

# Verificar contenido
cat .env

# Debe tener DATABASE_URL configurado
```

---

### ❌ Error: database "malulos_pos" does not exist

```
error: database "malulos_pos" does not exist
```

### 🔍 Causa

La base de datos PostgreSQL no fue creada.

### ✅ Solución

```bash
# Crear base de datos
createdb malulos_pos

# O desde psql:
psql -U postgres
CREATE DATABASE malulos_pos;
\q
```

### 🧪 Testing

```bash
# Listar bases de datos
psql -U postgres -l | grep malulos_pos

# Debería aparecer malulos_pos
```

---

## 8. Problemas de TypeScript

### ❌ Error: Property 'categoryId' does not exist on type 'Product'

```typescript
Property 'categoryId' does not exist on type 'Product'.
Did you mean 'categoryid'?
```

### 🔍 Causa

El backend devolvía campos en lowercase, pero los tipos TypeScript esperaban camelCase.

### ✅ Solución

Ya corregido en modelos del backend (ver Problema #2).

**Verificar tipos en frontend**:

```typescript
// src/types/index.ts
export interface Product {
    id?: number
    categoryId: number        // ✅ camelCase
    basePrice: number         // ✅ camelCase
    isCombo: boolean          // ✅ camelCase
    comboItems: ComboItem[]   // ✅ camelCase
    createdAt: Date           // ✅ camelCase
}
```

### 🧪 Testing

```bash
# Verificar que no hay errores de TypeScript
npm run build

# No debería haber errores
```

---

## 🆘 Guía Rápida de Diagnóstico

### 1. Backend no arranca

```bash
cd server

# Verificar PostgreSQL
psql -U postgres -c "SELECT version();"

# Verificar .env
cat .env | grep DATABASE_URL

# Reiniciar backend con logs
npm run dev
```

---

### 2. Frontend no carga datos

```bash
# Verificar backend está corriendo
curl http://localhost:3000/api/health

# Verificar productos
curl http://localhost:3000/api/products

# Ver errores en consola del navegador
# F12 → Console → Network
```

---

### 3. Datos no aparecen

```bash
cd server

# Verificar datos en BD
npm run check

# Si no hay datos:
npm run seed

# Reiniciar backend
npm run dev
```

---

## 📞 Checklist de Debugging

Cuando algo falle, ejecuta en este orden:

- [ ] ¿PostgreSQL está corriendo? (`psql -U postgres`)
- [ ] ¿Existe la base de datos? (`psql -U postgres -l`)
- [ ] ¿Existe `.env`? (`cat server/.env`)
- [ ] ¿DATABASE_URL está configurado? (`grep DATABASE_URL server/.env`)
- [ ] ¿Hay datos en la BD? (`cd server && npm run check`)
- [ ] ¿Backend está corriendo? (`curl http://localhost:3000/api/health`)
- [ ] ¿Frontend está corriendo? (abrir `http://localhost:5174`)
- [ ] ¿Hay errores en consola? (F12 → Console)
- [ ] ¿Reiniciaste backend después de cambios? (`Ctrl+C` y `npm run dev`)

---

## 🔗 Enlaces Útiles

- **Documentación PostgreSQL**: https://www.postgresql.org/docs/
- **pg (node-postgres)**: https://node-postgres.com/
- **Express.js**: https://expressjs.com/
- **React DevTools**: https://react.dev/learn/react-developer-tools

---

## 📝 Reportar Nuevos Problemas

Si encuentras un problema no documentado aquí:

1. Anota el **error exacto** (mensaje completo)
2. Captura el **contexto** (qué estabas haciendo)
3. Incluye **logs relevantes** (backend y/o frontend)
4. Menciona **pasos para reproducir**
5. Comparte **tu configuración** (.env sin credenciales)

---

**Última actualización**: 2026-01-07
