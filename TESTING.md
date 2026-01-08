# 🧪 Guía de Testing - Malulos POS con PostgreSQL

Esta guía te ayudará a validar que la migración a PostgreSQL funciona correctamente.

## ✅ Checklist de Validación

### 1. Verificar Instalación de PostgreSQL

```bash
# Verificar versión instalada
psql --version

# Debería mostrar algo como:
# psql (PostgreSQL) 14.x
```

**Si no está instalado**, seguir las instrucciones en `server/README.md`.

---

### 2. Crear Base de Datos

```bash
# Opción 1: Desde línea de comandos
createdb malulos_pos

# Opción 2: Desde psql
psql -U postgres
CREATE DATABASE malulos_pos;
\q
```

**Verificar creación**:
```bash
psql -U postgres -l | grep malulos_pos
```

---

### 3. Configurar Variables de Entorno

```bash
cd server

# Copiar template
cp .env.example .env

# Editar .env con tu editor favorito
# Asegurarte de configurar DATABASE_URL correctamente
```

**Ejemplo de `.env`**:
```env
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/malulos_pos
PORT=3000
```

---

### 4. Instalar Dependencias

```bash
# Desde el directorio server/
npm install

# Verificar que se instaló el paquete pg
npm list pg
# Debería mostrar: pg@8.16.3 o superior
```

---

### 5. Ejecutar Seed de Datos

```bash
# Desde el directorio server/
npm run seed
```

**Salida esperada**:
```
🌱 Iniciando proceso de seed...

📦 Insertando categorías...
✅ 6 categorías insertadas
📦 Insertando productos...
✅ 4 productos insertados
📦 Insertando mesas...
✅ 6 mesas insertadas
📦 Insertando configuración...
✅ Configuración insertada
📦 Insertando usuarios...
✅ 3 usuarios insertados

🎉 Seed completado exitosamente!

📋 Usuarios disponibles:
   - Admin: PIN 1234 (acceso total)
   - Cajero: PIN 2222 (operaciones de caja)
   - Mesero: PIN 3333 (solo tomar pedidos)
```

---

### 6. Verificar Datos en PostgreSQL

```bash
# Conectarse a la base de datos
psql -U postgres -d malulos_pos

# Dentro de psql, ejecutar:
\dt                          # Listar todas las tablas
SELECT COUNT(*) FROM categories;    # Debería devolver 6
SELECT COUNT(*) FROM products;      # Debería devolver 4
SELECT COUNT(*) FROM restaurantTables;  # Debería devolver 6
SELECT COUNT(*) FROM users;         # Debería devolver 3

# Ver usuarios creados
SELECT id, name, pin, role FROM users;

\q  # Salir de psql
```

**Salida esperada de usuarios**:
```
 id | name   | pin  | role
----+--------+------+---------
  1 | Admin  | 1234 | admin
  2 | Cajero | 2222 | cashier
  3 | Mesero | 3333 | waiter
```

---

### 7. Iniciar Servidor Backend

```bash
# Desde el directorio server/
npm run dev
```

**Salida esperada**:
```
⏳ Sincronizando tablas...
⏳ Sincronizando índices...
✅ Esquema base verificado.
🐘 Conector PostgreSQL preparado.
🚀 Servidor API corriendo en http://0.0.0.0:3000
```

---

### 8. Testing de API Endpoints

#### Health Check
```bash
curl http://localhost:3000/api/health
```

**Respuesta esperada**:
```json
{
  "status": "ok",
  "message": "Malulos POS API running on PostgreSQL"
}
```

#### Login de Usuario
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

**Respuesta esperada**:
```json
{
  "id": 1,
  "name": "Admin",
  "pin": "1234",
  "role": "admin",
  "isactive": 1,
  "createdat": "2024-01-07T..."
}
```

#### Listar Categorías
```bash
curl http://localhost:3000/api/categories
```

**Respuesta esperada**: Array con 6 categorías (Hamburguesas, Papas, Bebidas, etc.)

#### Listar Productos
```bash
curl http://localhost:3000/api/products
```

**Respuesta esperada**: Array con 4 productos (Hamburguesa Clásica, Papas Francesas, etc.)

#### Listar Mesas
```bash
curl http://localhost:3000/api/tables
```

**Respuesta esperada**: Array con 6 mesas con estado `available`

---

### 9. Testing de Frontend

```bash
# Desde el directorio raíz del proyecto
npm run dev:all

# O en terminales separadas:
# Terminal 1 (backend):
cd server && npm run dev

# Terminal 2 (frontend):
npm run dev
```

**Acceder a la aplicación**:
- Navegador: `http://localhost:5174`
- Login con PIN: `1234` (Admin)

**Flujo de testing**:
1. ✅ Login exitoso con PIN 1234
2. ✅ Redirección a página de apertura de caja (`/cash`)
3. ✅ Abrir caja con monto inicial (ej: 50000)
4. ✅ Redirección a Home (selector de mesas)
5. ✅ Seleccionar una mesa
6. ✅ Agregar productos al pedido
7. ✅ Confirmar pedido
8. ✅ Verificar que aparece en vista de Cocina (`/kitchen`)
9. ✅ Procesar pago
10. ✅ Generar ticket PDF

---

## 🐛 Troubleshooting

### Error: "psql: command not found"
PostgreSQL no está instalado o no está en el PATH.

**Solución**:
- Windows: Agregar `C:\Program Files\PostgreSQL\XX\bin` al PATH
- Mac: `brew install postgresql`
- Linux: `sudo apt install postgresql`

---

### Error: "DATABASE_URL es obligatoria"
El archivo `.env` no existe o no tiene la variable configurada.

**Solución**:
```bash
cd server
cp .env.example .env
# Editar .env y configurar DATABASE_URL
```

---

### Error: "ECONNREFUSED" al conectar a PostgreSQL
PostgreSQL no está corriendo.

**Solución**:
- Windows: `net start postgresql-x64-14`
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

---

### Error: "relation 'categories' does not exist"
El schema no se inicializó correctamente.

**Solución**:
Verificar que el servidor se inició correctamente y ejecutó `initSchema()`. Revisar logs del servidor.

---

### Error: "The server does not support SSL connections"
El código detecta automáticamente si es localhost y desactiva SSL.

**Solución**:
Asegúrate de que tu `DATABASE_URL` en `.env` use `localhost` o `127.0.0.1`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/malulos_pos
```

Si el error persiste, verifica que el archivo `database.js` tenga la detección automática de SSL.

---

### Seed no inserta datos (dice "ya contiene datos")
Esto es normal si ya ejecutaste el seed anteriormente.

**Para limpiar y re-seed**:
```bash
# CUIDADO: Esto borra TODOS los datos
psql -U postgres -d malulos_pos -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Luego ejecutar seed nuevamente
npm run seed
```

---

## 📊 Métricas de Éxito

### Criterios de Validación Completa

- ✅ PostgreSQL instalado y corriendo
- ✅ Base de datos `malulos_pos` creada
- ✅ Seed ejecutado exitosamente (6 categorías, 4 productos, 6 mesas, 3 usuarios)
- ✅ Servidor backend arranca sin errores
- ✅ Health check responde correctamente
- ✅ Login de usuario funciona
- ✅ API endpoints devuelven datos esperados
- ✅ Frontend se conecta al backend
- ✅ Flujo completo de pedido funciona (crear → confirmar → pagar)

---

## 🎯 Próximos Pasos

Una vez validado que todo funciona:

1. **Configurar backup automático de PostgreSQL**
2. **Implementar migraciones con herramientas como `node-pg-migrate`**
3. **Configurar SSL para conexiones de producción**
4. **Optimizar índices basándose en queries frecuentes**
5. **Implementar monitoring con herramientas como `pg_stat_statements`**

---

## 📞 Soporte

Si encuentras problemas durante el testing:

1. Revisar logs del servidor (`npm run dev` muestra logs en tiempo real)
2. Verificar logs de PostgreSQL (ubicación varía según OS)
3. Consultar documentación en `server/README.md`
4. Verificar que todos los pasos de esta guía se completaron
