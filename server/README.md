# Malulos POS - Backend API

Backend con SQLite para el sistema POS Malulos.

## 🚀 Instalación

```bash
cd server
npm install
```

## 📦 Inicializar Base de Datos

```bash
npm run init-db
```

Esto creará:
- Base de datos SQLite (`malulos.db`)
- Esquema completo de tablas
- Datos iniciales (categorías, productos, mesas, usuarios)

## 🔧 Desarrollo

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000` con hot-reload automático.

## 🌐 Producción

```bash
npm start
```

## 📡 API Endpoints

### Productos
- `GET /api/products` - Listar todos los productos
- `GET /api/products/:id` - Obtener producto por ID
- `GET /api/products/category/:categoryId` - Productos por categoría
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Categorías
- `GET /api/categories` - Listar categorías
- `POST /api/categories` - Crear categoría
- `PUT /api/categories/:id` - Actualizar categoría
- `DELETE /api/categories/:id` - Eliminar categoría

### Mesas
- `GET /api/tables` - Listar todas las mesas
- `GET /api/tables/:id` - Obtener mesa por ID
- `PUT /api/tables/:id` - Actualizar estado de mesa

### Pedidos
- `GET /api/orders` - Listar todos los pedidos
- `GET /api/orders?active=true` - Pedidos activos
- `GET /api/orders?status=completed` - Pedidos por estado
- `GET /api/orders?tableId=1` - Pedido actual de mesa
- `GET /api/orders/:id` - Obtener pedido por ID
- `POST /api/orders` - Crear pedido
- `PUT /api/orders/:id` - Actualizar pedido
- `DELETE /api/orders/:id` - Eliminar pedido

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users/login` - Login con PIN
- `POST /api/users` - Crear usuario

### Caja
- `GET /api/cash-sessions/active` - Sesión activa
- `GET /api/cash-sessions/:id` - Obtener sesión
- `POST /api/cash-sessions` - Abrir sesión
- `PUT /api/cash-sessions/:id` - Actualizar sesión
- `POST /api/cash-sessions/:id/close` - Cerrar sesión

### Configuración
- `GET /api/config` - Obtener configuración
- `PUT /api/config` - Actualizar configuración

### Health Check
- `GET /api/health` - Estado del servidor

## 🗄️ Estructura de Base de Datos

```
categories        - Categorías de productos
products          - Productos del menú
restaurantTables  - Mesas del restaurante
orders            - Pedidos
customers         - Clientes (para delivery)
users             - Usuarios del sistema
cashSessions      - Sesiones de caja
cashMovements     - Movimientos de caja
config            - Configuración global
```

## 👥 Usuarios Predeterminados

- **Admin**: PIN `1234` (acceso completo)
- **Cajero**: PIN `2222` (caja y pedidos)
- **Mesero**: PIN `3333` (solo pedidos)

## 🔒 CORS

El servidor está configurado con CORS habilitado para aceptar peticiones desde cualquier origen durante desarrollo.

Para producción, configura orígenes específicos en `src/index.js`.

## 📝 Notas

- La base de datos SQLite se crea automáticamente en `server/malulos.db`
- Los campos JSON (items, sizes, modifierGroups, etc.) se serializan automáticamente
- El servidor escucha en `0.0.0.0` para permitir acceso desde la red local
