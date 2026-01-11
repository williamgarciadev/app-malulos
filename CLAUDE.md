# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**Malulos POS** - Sistema de Punto de Venta (POS) para restaurante de comidas rápidas con arquitectura cliente-servidor. Backend con PostgreSQL para soportar múltiples dispositivos (meseros, cocina, caja) simultáneamente.

## Comandos de Desarrollo

### Setup Inicial

```bash
# 1. Instalar PostgreSQL localmente
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt install postgresql

# 2. Crear base de datos
createdb malulos_pos

# 3. Configurar variables de entorno
cd server
cp .env.example .env
# Editar .env y configurar DATABASE_URL con tus credenciales
# Ejemplo: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/malulos_pos

# 4. Instalar dependencias del frontend
cd ..
npm install

# 5. Instalar dependencias del backend
cd server && npm install && cd ..

# 6. Ejecutar seed de datos iniciales (IMPORTANTE: ejecutar primero)
cd server && npm run seed && cd ..
```

### Desarrollo

```bash
# Opción 1: Frontend + Backend simultáneamente (RECOMENDADO)
npm run dev:all

# Opción 2: Solo frontend (requiere backend corriendo por separado)
npm run dev

# Opción 3: Solo backend
npm run dev:server
```

### Producción

```bash
# Build del frontend
npm run build

# Iniciar backend en producción
cd server && npm start
```

### Otros Comandos

```bash
# Preview del build
npm run preview

# Linting
npm run lint

# Ejecutar seed de datos iniciales (solo si la BD está vacía)
cd server && npm run seed

# Verificar datos en la base de datos (útil para debugging)
cd server && npm run check
```

### Variables de Entorno

**Frontend** (opcional, en raíz del proyecto):
```bash
# Crear archivo .env en la raíz (opcional)
VITE_API_URL=http://localhost:3000/api
```
**Nota**: Si no se define `VITE_API_URL`, el frontend automáticamente construye la URL del backend usando `window.location.hostname:3000/api`, lo cual permite acceso desde cualquier IP en la red local sin configuración adicional.

**Backend** (`server/.env`, **REQUERIDO**):
```bash
DATABASE_URL=postgresql://usuario:password@localhost:5432/malulos_pos
PORT=3000
TELEGRAM_BOT_TOKEN=tu_token_aqui  # Opcional, solo si usas el bot de Telegram
```

### Acceso desde Otros Dispositivos

El servidor de desarrollo está configurado para escuchar en todas las interfaces de red (`host: '0.0.0.0'`), lo que permite acceso desde:

- **Localhost**: http://localhost:5174
- **Red Local**: http://[TU_IP_LOCAL]:5174

**Para encontrar tu IP local**:
- Windows: `ipconfig` (buscar "Dirección IPv4")
- Linux/Mac: `ifconfig` o `ip addr`

**Ejemplo**: Si tu IP local es `192.168.1.100`, accede desde otro dispositivo en la misma red usando `http://192.168.1.100:5174`

**Nota de Seguridad**: Esta configuración es para desarrollo. En producción, implementa autenticación y HTTPS apropiados.

## Stack Tecnológico

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Estado Global**: Zustand (para UI state local)
- **Ruteo**: React Router v7
- **UI**: CSS Modules + Lucide React (iconos)
- **PWA**: vite-plugin-pwa + Workbox (modo offline opcional)
- **PDF**: jsPDF + jspdf-autotable (generación de tickets)
- **Gráficos**: Recharts
- **HTTP Client**: Fetch API nativa

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL (pg) - base de datos relacional robusta
- **ORM**: Queries SQL directo con pg (sin ORM pesado)
- **CORS**: Habilitado para múltiples dispositivos

### Arquitectura
```
┌─────────────────┐      HTTP REST      ┌──────────────┐
│  React Frontend │◄──────────────────►│ Express API  │
│  (Múltiples     │   JSON (Port 3000) │              │
│   Dispositivos) │                     │              │
└─────────────────┘                     └───────┬──────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │  PostgreSQL  │
                                        │ malulos_pos  │
                                        └──────────────┘
```

**Puertos**:
- Frontend: `5174` (Vite dev server)
- Backend API: `3000` (Express)

## Arquitectura de la Aplicación

### Flujo de Autenticación y Sesión de Caja

La aplicación tiene un flujo de autenticación de dos niveles obligatorios:

1. **Login de Usuario** (`/login`) - Autenticación por PIN
2. **Apertura de Caja** (`/cash`) - Sesión de caja requerida para operaciones

**Guards y Protección de Rutas**:
- `ProtectedRoute`: Verifica autenticación de usuario, redirige a `/login` si no está autenticado
- `CashGuard`: Verifica que exista una sesión de caja abierta, redirige a `/cash` si no hay sesión activa
- Las rutas protegidas pueden requerir permisos específicos basados en el rol del usuario

**Jerarquía de Rutas** (ver `App.tsx:20-78`):
```
/login (público)
/ (ProtectedRoute)
  ├── <CashGuard> (requiere sesión de caja abierta)
  │   ├── / (Home - selector de mesas)
  │   ├── /tables (vista de mesas)
  │   ├── /orders (gestión de pedidos)
  │   └── /orders/:tableId (gestión de pedidos por mesa)
  ├── /kitchen (cocina - sin CashGuard)
  ├── /customers (gestión de clientes - sin CashGuard)
  ├── /telegram-orders (pedidos de Telegram - requiere permission: canManageCash)
  ├── /cash (gestión de caja - requiere permission: canManageCash)
  ├── /menu (gestión de menú - requiere permission: canManageMenu)
  ├── /reports (reportes - requiere permission: canViewReports)
  ├── /users (gestión de usuarios - requiere permission: canManageUsers)
  └── /manage-tables (configuración de mesas - requiere permission: canManageMenu)
```

### Sistema de Roles y Permisos

Definido en `src/types/index.ts:186-221`:

**Roles**: `admin`, `cashier`, `waiter`

**Permisos por Rol**:
- **admin**: Acceso total (todos los permisos)
  - `canTakeOrders`, `canProcessPayments`, `canManageCash`, `canManageMenu`, `canViewReports`, `canManageUsers`
- **cashier**: Puede tomar pedidos, procesar pagos, gestionar caja
  - `canTakeOrders`, `canProcessPayments`, `canManageCash`
- **waiter**: Solo puede tomar pedidos (no puede cobrar ni gestionar caja)
  - `canTakeOrders`

### Base de Datos PostgreSQL

**Nombre de BD**: `malulos_pos` (configurable en `.env`)

**Schema** (`server/src/config/database.js`):
```typescript
Tablas principales:
- categories: Categorías de productos (hamburguesas, bebidas, etc.)
- products: Productos con precios, tamaños, modificadores y combos
- restaurantTables: Mesas del restaurante con estado y posición
- orders: Pedidos con items, pagos, estados y origen (POS/Telegram)
- customers: Clientes con teléfono, dirección y telegramId
- config: Configuración global de la aplicación
- users: Usuarios del sistema con PIN y roles
- cashSessions: Sesiones de caja (apertura/cierre)
- cashMovements: Movimientos de efectivo (entradas/salidas)
```

**Relaciones importantes**:
- `products.categoryId` → `categories.id` (CASCADE)
- `orders.tableId` → `restaurantTables.id` (SET NULL)
- `orders.customerId` → `customers.id` (SET NULL)
- `restaurantTables.currentOrderId` → `orders.id` (referencia inversa)
- `cashMovements.sessionId` → `cashSessions.id` (CASCADE)

**Seed Data**: Ejecutar `npm run seed` desde el directorio `server/` para insertar datos de ejemplo (ver `server/src/scripts/seed.js`).

**Usuarios por defecto**:
- Admin: PIN `1234` (acceso total)
- Cajero: PIN `2222` (operaciones de caja)
- Mesero: PIN `3333` (solo tomar pedidos)

### Sistema de Clientes

**Gestión de Clientes** (`/customers`):
- Registro de clientes con nombre, teléfono, dirección y notas
- Historial de pedidos por cliente
- Vinculación con Telegram mediante `telegramId`
- Tracking de `lastOrderAt` para identificar clientes frecuentes

**Campos de Cliente**:
- `name`: Nombre completo
- `phone`: Teléfono de contacto
- `address`: Dirección de entrega (para delivery)
- `notes`: Notas adicionales (preferencias, referencias)
- `telegramId`: ID único de Telegram (si usa el bot)
- `createdAt`: Fecha de registro
- `lastOrderAt`: Fecha del último pedido

### Integración con Telegram Bot

El sistema incluye integración con Telegram para recibir pedidos de clientes:

**Variables de Entorno** (`server/.env`):
- `TELEGRAM_BOT_TOKEN`: Token del bot de Telegram (obtener en @BotFather)

**Funcionalidad**:
- Los clientes pueden hacer pedidos a través del bot de Telegram
- Los pedidos llegan a la vista `/telegram-orders` en el POS
- Se vinculan automáticamente con clientes existentes mediante `telegramId`
- Notificaciones automáticas a clientes sobre el estado de sus pedidos

**Flujo de Pedidos por Telegram**:
1. Cliente inicia conversación con el bot de Telegram
2. Bot muestra menú de productos disponibles
3. Cliente selecciona productos y confirma pedido
4. Pedido aparece en `/telegram-orders` con `origin: 'telegram'`
5. Personal procesa pedido y actualiza estado
6. Cliente recibe notificaciones automáticas del estado

### State Management (Zustand)

**Stores globales** (`src/stores/`):

1. **authStore** - Autenticación y permisos de usuario
   - Persiste en localStorage (`malulos-auth`)
   - Métodos: `login()`, `logout()`, `hasPermission()`

2. **cashStore** - Gestión de sesiones de caja
   - NO persiste (estado volátil)
   - Métodos: `checkActiveSession()`, `openSession()`, `closeSession()`, `addMovement()`

3. **cartStore** - Carrito de compras actual
   - Métodos: `addItem()`, `updateQuantity()`, `clearCart()`

4. **themeStore** - Gestión de tema visual (claro/oscuro)
   - Persiste en localStorage (`malulos-theme`)
   - Métodos: `toggleTheme()`, `setTheme()`

### Sistema de Productos y Precios

Los productos soportan configuración avanzada:

- **Tamaños** (`ProductSize`): Modificadores de precio (ej: Sencilla, Doble)
- **Modificadores** (`Modifier`): Extras opcionales con precio adicional (ej: Tocineta, Huevo)
- **Grupos de Modificadores** (`ModifierGroup`): Grupos con restricciones min/max de selección
- **Combos** (`isCombo: true`): Productos que permiten seleccionar items de diferentes categorías
- **ComboSelections**: Items seleccionados dentro de un combo

**Cálculo de Precio** (ver `cartStore.ts`):
```
precioFinal = basePrice + selectedSize.priceModifier + sum(selectedModifiers.priceModifier)
```

### Flujo de Pedidos

**Tipos de Pedido**:
- `dine-in`: Para consumir en el restaurante (asociado a mesa)
- `takeout`: Para llevar
- `delivery`: Entrega a domicilio (requiere datos de cliente)

**Origen del Pedido** (`origin`):
- `pos`: Creado desde el sistema POS (default)
- `telegram`: Creado a través del bot de Telegram

**Estados del Pedido**: `pending` → `confirmed` → `preparing` → `ready` → `delivered` → `completed`

**Estados de Pago**: `pending` → `partial` → `paid`

**Flujo Completo**:
1. **Creación**: Se crea orden desde Home, Tables o Telegram (asociada a mesa, para llevar o delivery)
2. **Confirmación**: El pedido es confirmado por el mesero o automáticamente (Telegram)
3. **Cocina**: Vista Kitchen muestra pedidos `confirmed` y `preparing`
4. **Preparación**: Cocina actualiza estado a `preparing` → `ready`
5. **Entrega**: Mesero marca como `delivered` (dine-in) o `on_the_way` (delivery)
6. **Pago**: Modal de pago permite métodos: `cash`, `card`, `transfer`, `nequi`, `daviplata`, `mixed`
7. **Completado**: Pedido marcado como `completed` tras pago
8. **Ticket**: Se genera PDF del ticket tras completar pago (ver `ticketService.ts`)

### Path Alias

Configurado en `vite.config.ts:60-64` y `tsconfig.app.json:24-29`:
```typescript
import { db } from '@/db/database'
import type { User } from '@/types'
```

## Consideraciones Importantes

### Persistencia Centralizada
- **Toda la data está en PostgreSQL (Backend)** - No hay base de datos local en el navegador.
- El frontend consume la API REST de forma exclusiva.
- Polling implementado en vistas críticas (Mesas, Cocina, Home) para sincronización.
- PostgreSQL ofrece mejor rendimiento, concurrencia y escalabilidad que SQLite.

### Sincronización Multi-Dispositivo
El sistema soporta múltiples dispositivos simultáneos mediante:

**Polling Automático**: Las vistas críticas actualizan datos automáticamente cada pocos segundos:
- `/kitchen`: Actualiza lista de pedidos activos
- `/tables`: Sincroniza estados de mesas
- `/` (Home): Actualiza disponibilidad de mesas

**Concurrencia**: PostgreSQL maneja múltiples conexiones simultáneas de:
- Meseros (tablets/móviles) - toman pedidos
- Cocina (pantalla fija) - ven pedidos en tiempo real
- Caja (terminal POS) - procesan pagos y reportes

**Recomendación**: Para implementar sincronización en tiempo real más eficiente, considera usar WebSockets o Server-Sent Events (SSE) en el futuro.

### Gestión de Caja Obligatoria
- **Antes de tomar pedidos**, debe haber una sesión de caja abierta
- `CashGuard` bloquea acceso a Home/Tables/Orders si no hay caja abierta
- Solo usuarios con permiso `canManageCash` pueden abrir/cerrar caja

### Cálculo de Ventas
- Las ventas se registran al completar un pedido (`paymentStatus: 'paid'`)
- El `cashStore` actualiza contadores de la sesión activa
- El cierre de caja calcula diferencia entre efectivo esperado vs. contado

### Testing/Desarrollo
Para probar el flujo completo:
1. Login con PIN (usar `1234` para admin)
2. Ir a `/cash` y abrir caja con monto inicial
3. Navegar a Home para seleccionar mesa y crear pedidos

## Estructura de Componentes

```
src/
├── components/
│   ├── auth/          # PinPad, ProtectedRoute
│   ├── cash/          # CashGuard
│   ├── layout/        # Layout principal con navegación
│   └── payment/       # PaymentModal para procesar pagos
├── pages/             # Páginas principales (Home, Orders, Kitchen, etc.)
├── stores/            # Zustand stores (auth, cash, cart)
├── services/          # API y ticketService
└── types/             # index.ts (todos los tipos TypeScript)
```

## Convenciones de Código

- **CSS Modules**: Cada componente/página tiene su `.module.css` correspondiente
- **TypeScript Estricto**: `strict: true`, sin `any` implícitos
- **Tipos Centralizados**: Todos los tipos en `src/types/index.ts`
- **Path Alias**: Usar `@/*` para imports desde `src/`
