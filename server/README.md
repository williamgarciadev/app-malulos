# Malulos POS - Backend API

Backend API para Malulos POS construido con Express.js y PostgreSQL.

## 📋 Requisitos Previos

- **Node.js 18+** - [Descargar](https://nodejs.org/)
- **PostgreSQL 12+** - [Descargar](https://www.postgresql.org/download/)

## 🚀 Instalación y Configuración

### 1. Instalar PostgreSQL

#### Windows
```bash
# Descargar desde: https://www.postgresql.org/download/windows/
# O usando Chocolatey:
choco install postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Crear Base de Datos

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Dentro de psql:
CREATE DATABASE malulos_pos;
\q

# O directamente desde la terminal:
createdb malulos_pos
```

### 3. Configurar Variables de Entorno

```bash
# Copiar el template
cp .env.example .env

# Editar .env y configurar:
# DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/malulos_pos
```

### 4. Instalar Dependencias

```bash
npm install
```

### 5. Ejecutar Seed de Datos Iniciales

```bash
npm run seed
```

Esto creará:
- 6 categorías de productos
- 4 productos de ejemplo
- 6 mesas
- 3 usuarios con PINs:
  - **Admin**: PIN `1234` (acceso total)
  - **Cajero**: PIN `2222` (operaciones de caja)
  - **Mesero**: PIN `3333` (solo tomar pedidos)

## 🔧 Desarrollo

### Iniciar servidor de desarrollo (con hot-reload)

```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

### Iniciar servidor de producción

```bash
npm start
```

## 📡 API Endpoints

### Productos
- `GET /api/products` - Listar todos los productos
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Categorías
- `GET /api/categories` - Listar categorías
- `POST /api/categories` - Crear categoría

### Mesas
- `GET /api/tables` - Listar mesas
- `PUT /api/tables/:id` - Actualizar mesa

### Pedidos
- `GET /api/orders` - Listar pedidos
  - Query params: `?status=confirmed`, `?active=true`, `?tableId=1`
- `POST /api/orders` - Crear pedido
- `PUT /api/orders/:id` - Actualizar pedido

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users/login` - Login con PIN

### Sesiones de Caja
- `GET /api/cash-sessions/active` - Obtener sesión activa
- `POST /api/cash-sessions` - Abrir sesión
- `PUT /api/cash-sessions/:id` - Actualizar sesión
- `POST /api/cash-sessions/:id/close` - Cerrar sesión

### Clientes
- `GET /api/customers` - Listar clientes
- `POST /api/customers` - Crear cliente

### Configuración
- `GET /api/config` - Obtener configuración
- `GET /api/health` - Health check

## 🗄️ Estructura de Base de Datos

### Tablas principales:
- `categories` - Categorías de productos
- `products` - Productos con precios, tamaños y modificadores (JSONB)
- `restaurantTables` - Mesas del restaurante
- `orders` - Pedidos con items (JSONB) y estados
- `customers` - Clientes para delivery
- `users` - Usuarios con PIN y roles
- `cashSessions` - Sesiones de caja
- `cashMovements` - Movimientos de efectivo
- `config` - Configuración global

### Tipos de datos especiales:
- **JSONB** para: `products.sizes`, `products.modifierGroups`, `orders.items`
- **SERIAL** para IDs auto-incrementales
- **TIMESTAMP** para fechas con zona horaria
- **CHECK constraints** para validar estados

## 🧪 Testing Manual

### 1. Verificar health check
```bash
curl http://localhost:3000/api/health
```

### 2. Probar login
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

### 3. Listar productos
```bash
curl http://localhost:3000/api/products
```

## 🔒 Seguridad

- CORS habilitado para desarrollo multi-dispositivo
- Autenticación por PIN (4 dígitos)
- Roles: `admin`, `cashier`, `waiter`
- Variables sensibles en `.env` (no commitear)

## 📝 Notas de Desarrollo

- El schema se inicializa automáticamente al iniciar el servidor (`initSchema()`)
- El seed solo se ejecuta si la BD está vacía
- Usar `pool.query()` para queries asíncronas
- JSONB permite almacenar estructuras complejas (tamaños, modificadores, items)
- Índices creados para optimizar queries frecuentes
- **SSL auto-detección**: SSL se desactiva automáticamente en localhost (desarrollo local) y se activa en producción

## 🐛 Troubleshooting

### Error: "La variable de entorno DATABASE_URL es obligatoria"
- Verificar que el archivo `.env` existe
- Verificar que `DATABASE_URL` está configurado correctamente

### Error de conexión a PostgreSQL
```bash
# Verificar que PostgreSQL está corriendo:
# Windows:
net start postgresql-x64-XX

# macOS:
brew services list

# Linux:
sudo systemctl status postgresql
```

### Seed no inserta datos
- Verificar que la BD `malulos_pos` existe
- Ejecutar: `psql -U postgres -d malulos_pos -c "SELECT COUNT(*) FROM categories;"`
- Si ya hay datos, el seed se salta automáticamente

### Puerto 3000 en uso
- Cambiar puerto en `.env`: `PORT=3001`
- O matar el proceso: `lsof -ti:3000 | xargs kill` (Mac/Linux)

## 📚 Recursos

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [pg (node-postgres)](https://node-postgres.com/)
- [Express.js Docs](https://expressjs.com/)
