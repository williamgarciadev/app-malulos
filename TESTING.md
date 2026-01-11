# Testing manual (PostgreSQL)

## Pre-requisitos

- PostgreSQL activo
- `server/.env` configurado
- Backend y frontend levantados

## Smoke test completo

1) Login con PIN `1234`.
2) Abrir caja con base inicial.
3) Crear pedido (mesa o para llevar).
4) Enviar a cocina y marcar `ready`.
5) Completar pago.
6) Verificar que Reportes refleje la venta.

## Delivery

1) Crear pedido tipo delivery con cliente y direccion.
2) Cocina -> marcar `ready`.
3) Delivery -> iniciar entrega (on_the_way).
4) Confirmar entrega (completed).

## Verificaciones rapidas

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/orders?active=true`
