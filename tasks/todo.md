# Plan de Migración: Dexie a API REST (Cliente-Servidor)

El objetivo es centralizar la lógica de negocio y persistencia en el backend (SQLite) para permitir funcionalidad multi-dispositivo real.

## 📋 Tareas de Migración

### 1. Configuración Base API
- [ ] **Crear cliente HTTP:** Crear `src/services/api.ts` para manejar `fetch`, timeouts y URL base (`VITE_API_URL`).
- [ ] **Definir endpoints:** Crear funciones para mapear todos los endpoints del backend (`products`, `categories`, `tables`, `orders`, `users`, `cash-sessions`, `config`).

### 2. Migración de Autenticación (AuthStore)
- [ ] **Login contra API:** Modificar `authStore.ts` para usar `/api/users/login` en lugar de `db.users`.
- [ ] **Persistencia:** Asegurar que el token/usuario se guarde en `localStorage` (como ya hace, verificar seguridad).

### 3. Migración de Caja (CashStore)
- [ ] **Estado Remoto:** `cashStore.ts` no debe solo guardar en memoria local. Debe consultar `/api/cash-sessions/active` al iniciar.
- [ ] **Apertura/Cierre:** Conectar métodos `openSession` y `closeSession` a la API.

### 4. Gestión de Datos Maestros (Productos/Categorías/Mesas)
- [ ] **Hook de Carga:** Crear hooks o servicios para cargar Productos, Categorías y Mesas desde la API al iniciar la app.
- [ ] **Eliminar Dexie Seed:** Dejar de depender de `seedDatabase()` en el frontend.

### 5. Gestión de Pedidos (Orders & Cart)
- [ ] **Crear Pedido:** `cartStore.ts` o `ticketService.ts` deben enviar `POST /api/orders` al confirmar.
- [ ] **Sincronización:** Las vistas de Cocina y Mesas deben hacer polling (o usar WebSocket futuro) a `/api/orders` para ver cambios de otros dispositivos.

### 6. Limpieza
- [ ] **Eliminar Dexie:** Remover `src/db/database.ts` y desinstalar `dexie`, `dexie-react-hooks`.

## 🔄 Verificación

- Login funciona con PIN del backend.

- Mesero crea pedido en Tablet -> Cocina lo ve en Monitor -> Caja lo cobra en PC.



### 7. Optimización y Mejora de Reportes



- [x] **Backend: Filtrado por fecha:** Modificar `Order.getByStatus` o crear `Order.getCompletedByDateRange` para filtrar en la DB.



- [x] **API Client:** Actualizar `ordersApi.getAll` para soportar parámetros de fecha (`startDate`, `endDate`).



- [x] **Frontend: Refactorizar Reports.tsx:** Usar la API optimizada y mejorar la visualización de datos.



- [x] **Métricas Adicionales:** Añadir reportes de ventas por categoría y por método de pago.



- [ ] **Exportación:** (Opcional) Añadir botón para descargar reporte en PDF o Excel.




