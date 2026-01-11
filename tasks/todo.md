# Plan de Migración: Dexie a API REST (Cliente-Servidor)

El objetivo es centralizar la lógica de negocio y persistencia en el backend (SQLite) para permitir funcionalidad multi-dispositivo real.

## 📋 Tareas Completadas

### 1. Configuración Base API
- [x] **Crear cliente HTTP:** Crear `src/services/api.ts` para manejar `fetch`, timeouts y URL base (`VITE_API_URL`).
- [x] **Definir endpoints:** Crear funciones para mapear todos los endpoints del backend (`products`, `categories`, `tables`, `orders`, `users`, `cash-sessions`, `config`).

### 2. Migración de Autenticación (AuthStore)
- [x] **Login contra API:** Modificar `authStore.ts` para usar `/api/users/login` en lugar de `db.users`.
- [x] **Persistencia:** Asegurar que el token/usuario se guarde en `localStorage` (como ya hace, verificar seguridad).

### 3. Migración de Caja (CashStore)
- [x] **Estado Remoto:** `cashStore.ts` no debe solo guardar en memoria local. Debe consultar `/api/cash-sessions/active` al iniciar.
- [x] **Apertura/Cierre:** Conectar métodos `openSession` y `closeSession` a la API.

### 4. Gestión de Datos Maestros (Productos/Categorías/Mesas)
- [x] **Hook de Carga:** Crear hooks o servicios para cargar Productos, Categorías y Mesas desde la API al iniciar la app.
- [x] **Eliminar Dexie Seed:** Dejar de depender de `seedDatabase()` en el frontend.

### 5. Gestión de Pedidos (Orders & Cart)
- [x] **Crear Pedido:** `cartStore.ts` o `ticketService.ts` deben enviar `POST /api/orders` al confirmar.
- [x] **Sincronización:** Las vistas de Cocina y Mesas deben hacer polling (o usar WebSocket futuro) a `/api/orders` para ver cambios de otros dispositivos.

### 6. Limpieza
- [ ] **Eliminar Dexie:** Remover `src/db/database.ts` y desinstalar `dexie`, `dexie-react-hooks`.

## 🚀 Nuevas Funcionalidades

### 8. Bot de Pedidos (Telegram)
- [x] **Estructura base:** Crear `server/src/services/telegramBot.js`.
- [x] **Gestión de Pedidos:** Integrar checkout con la tabla `orders` del sistema.
- [x] **Notificaciones:** Confirmar al usuario cuando su pedido cambie de estado.
- [x] **Vista en POS:** Página `/telegram-orders` para gestionar estos pedidos.

### 9. Módulo de Delivery (Repartidores)
- [ ] **Backend & Tipos:**
    - Agregar rol `delivery` a `UserRole` y permisos.
    - Agregar usuario Repartidor en `seed.js` (PIN 4444).
- [ ] **Frontend - Página Delivery:**
    - Crear `src/pages/Delivery.tsx`.
    - Listar pedidos `ready` (tipo delivery).
    - Acciones: "Tomar pedido" (pasa a `on_the_way`), "Confirmar Entrega".
    - Mostrar datos de cliente (Dirección, Teléfono con link a WhatsApp).
- [ ] **Integración UI:**
    - Agregar ruta `/delivery` en `App.tsx`.
    - Agregar ícono en Sidebar (visible solo para admin/delivery).