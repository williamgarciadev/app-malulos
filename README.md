# Malulos POS

Sistema POS cliente-servidor para restaurante. Frontend React + Vite y backend Express con PostgreSQL.

## Requisitos

- Node.js 18+
- PostgreSQL 12+

## Estructura del proyecto

- `src/`: frontend React + TypeScript
- `server/`: backend Express + PostgreSQL
- `public/`: assets
- `docs/`: capturas

## Instalacion paso a paso

### 1) Instalar dependencias

```bash
npm install
cd server
npm install
cd ..
```

### 2) Configurar PostgreSQL

Crear una base de datos (ej: `malulos_pos`) y configurar `server/.env`:

```bash
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/malulos_pos
PORT=3000
```

### 3) Cargar datos iniciales

```bash
npm run seed
```

Crea categorias, productos, mesas y usuarios por defecto.

### 4) Levantar el sistema

```bash
npm run dev:all
```

- Frontend: http://localhost:5174
- API: http://localhost:3000/api

### 5) Verificacion rapida

- http://localhost:3000/api/health
- Login con PIN `1234`

## Configuracion del frontend

Si necesitas apuntar a otra IP:

```env
VITE_API_URL=http://192.168.1.100:3000/api
```

## Scripts principales

- `npm run dev:all`: frontend + backend
- `npm run seed`: carga datos iniciales en PostgreSQL
- `npm run check`: validacion basica
- `npm run lint`: lint

## Documentacion

- `INSTALL.md`: instalacion detallada
- `MIGRATION.md`: detalles de PostgreSQL
- `TESTING.md`: pruebas manuales
- `TROUBLESHOOTING.md`: resolucion de problemas
- `QUICK_REFERENCE.md`: comandos rapidos

## Flujo recomendado (Delivery POS)

1) Ir a `/orders?type=delivery` o usar "Nuevo Domicilio".
2) Completar datos obligatorios: nombre, telefono, direccion y metodo de pago.
3) Agregar productos y enviar a cocina.
4) En Cocina: "Comenzar a Preparar" y luego "Marcar como Listo".
5) En Delivery: el pedido aparece en "Listos para Recoger".
6) Repartidor inicia entrega -> pasa a "En Ruta".
7) Al entregar, usar "Confirmar entrega".

## Tags estables

- `stable-2026-01-11`: version estable previa.
- `stable-2026-01-12`: version estable actual.

## Mejoras recientes (POS)

- Delivery: flujo completo desde `/orders?type=delivery` con datos obligatorios (nombre/telefono/direccion) y metodo de pago.
- Delivery UI: filtros, buscador, semaforo de tiempo, acciones rapidas (copiar direccion, ruta, mapa) y modal de confirmacion mejorado.
- Cocina: delivery ya no salta directo a "En ruta"; queda en "Listo" para que el repartidor lo inicie.
- Telegram: sesion de caja se carga al abrir la pantalla para confirmar pagos sin bloqueo.
- Clientes: acciones rapidas (llamar/whatsapp/mapa), historial rapido, etiquetas Telegram, filtros y vista compacta.
