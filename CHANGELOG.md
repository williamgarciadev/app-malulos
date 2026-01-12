# Changelog

## Tags estables

- `stable-2026-01-11`: version estable previa.
- `stable-2026-01-12`: version estable actual.

## 2026-01-11

### Backend
- PostgreSQL como base de datos principal.
- Seeds en `server/src/scripts/seed.js`.
- Health check `GET /api/health`.

### Frontend
- API base configurable con `VITE_API_URL`.

### Scripts
- `seed` y `check` disponibles en root y server.

## 2026-01-12

### Delivery
- Flujo POS completo: datos obligatorios (nombre/telefono/direccion) y metodo de pago desde `/orders?type=delivery`.
- Barra de entrega colapsable con resumen y alerta visual cuando faltan datos.
- Delivery UI con filtros, buscador, tiempo por pedido, acciones rapidas (copiar direccion, ruta, mapa) y modal de confirmacion mejorado.
- Entregas pasan por estado "Listo" antes de "En ruta".

### Cocina
- Delivery ya no se marca automaticamente "En ruta" al marcar como listo.
- Semaforo SLA y filtros (mesa/para llevar/domicilio/telegram) disponibles.

### Telegram
- Sesion de caja se carga al abrir para habilitar confirmacion de pagos.
- Contraentrega permitida en cocina si el pedido es cash o trae etiqueta de contraentrega.

### Clientes
- Acciones rapidas (llamar/whatsapp/mapa), historial rapido, etiquetas Telegram.
- Filtros (telegram, con pedidos, sin direccion) y vista compacta.

### Datos/Tipos
- `guestCount` en ordenes y tickets de cocina.
- `telegramId` en tipo de cliente.
