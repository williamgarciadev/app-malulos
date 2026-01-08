# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.1] - 2026-01-07

### Agregado
- Estado `on_the_way` para pedidos de delivery y notificacion al cliente por Telegram al cambiar estado.

### Cambiado
- `/telegram-orders` ahora usa vista tipo lista para manejar muchos pedidos con badges de metodo de pago.
- Reportes incluyen pedidos Telegram pagados usando fecha `completedAt`/`confirmedAt`/`createdAt`.
- Cocina muestra pedidos Telegram solo con pago confirmado o contraentrega.

### Corregido
- Etiquetas de metodo de pago en Reportes para Nequi y DaviPlata.
- Etiquetas y tooltips de graficos visibles en light/dark.
- Pedidos Telegram ya no muestran "Mesa null" en reportes.
- Caja simplificada sin bloque de Telegram y textos de metodos de pago sin caracteres dañados.

## [1.0.0] - 2026-01-07

### 🚀 Migración a PostgreSQL

Migración completa de SQLite a PostgreSQL para desarrollo local y producción.

### Agregado

#### Backend

- **`.env.example`**: Template de configuración con DATABASE_URL y instrucciones de setup
- **`src/scripts/seed.js`**: Script de seed para insertar datos iniciales
  - 6 categorías de productos
  - 4 productos de ejemplo (Hamburguesa, Papas, Coca-Cola, Combo)
  - 6 mesas del restaurante
  - 3 usuarios (Admin, Cajero, Mesero)
  - Configuración inicial del negocio
- **`src/scripts/check-data.js`**: Verificador de datos en base de datos
- **Endpoint**: `PUT /api/customers/:id` para actualizar clientes
- **Scripts npm**:
  - `npm run seed`: Ejecutar seed de datos
  - `npm run check`: Verificar datos en BD

#### Documentación

- **`MIGRATION.md`**: Documentación completa de la migración
  - Objetivos y cambios técnicos
  - Schema de PostgreSQL
  - Problemas encontrados y soluciones
  - Guía de setup para nuevos desarrolladores
  - Métricas de éxito y próximos pasos
- **`TROUBLESHOOTING.md`**: Guía de resolución de problemas
  - 8 categorías de problemas comunes
  - Soluciones paso a paso con ejemplos
  - Checklist de debugging
- **`TESTING.md`**: Guía de testing y validación
- **`server/README.md`**: Documentación completa del backend
  - Instalación de PostgreSQL por OS
  - API endpoints documentados
  - Troubleshooting específico

### Cambiado

#### Backend - Database Layer

- **`src/config/database.js`**:
  - Auto-detección de SSL (localhost vs. producción)
  - Mensajes de log mejorados con indicador de entorno
- **`src/models/Product.js`**:
  - Mapeo de campos a camelCase usando `AS "camelCase"`
  - Filtrado por `isActive = 1` en `getAll()`
  - Aplicado en: `getAll()`, `getById()`, `getByCategory()`, `create()`, `update()`
- **`src/models/Order.js`**:
  - Constante `ORDER_SELECT_FIELDS` para reutilizar mapeo
  - Aplicado en todos los métodos
- **`src/models/index.js`**:
  - Mapeo camelCase en: `Category`, `RestaurantTable`, `User`, `CashSession`
- **`src/models/Customer.js`**:
  - Constante `CUSTOMER_SELECT_FIELDS`
  - Mapeo camelCase en todos los métodos

#### Backend - Scripts

- **`src/scripts/seed.js`**:
  - Uso de `ON CONFLICT (pin) DO NOTHING` para evitar duplicados
  - Verificación de configuración existente antes de insertar
  - Mensajes de log mejorados

#### Frontend

- **`src/pages/Kitchen.tsx`**:
  - Keys únicas en listas: `` key={`${order.id}-${item.id}-${index}`} ``
  - Eliminado warning de React

#### Documentación

- **`CLAUDE.md`**:
  - Sección "Setup Inicial" actualizada con PostgreSQL
  - Stack tecnológico corregido (PostgreSQL en lugar de SQLite)
  - Comandos actualizados (`seed` en lugar de `init-db`)
  - Diagrama de arquitectura actualizado
  - Todas las referencias a SQLite reemplazadas
- **`server/package.json`**:
  - Script `init-db` reemplazado por `seed` y `check`

### Eliminado

- **`src/config/initDb.js`**: Script obsoleto de SQLite
- **Dependencia implícita**: `better-sqlite3` (ya no es necesario)

### Corregido

#### Bugs de Compatibilidad

- **Productos no se mostraban en `/menu`**: Campos lowercase → camelCase
- **Mesas no aparecían**: Mismo problema de mapeo de campos
- **Error SSL en desarrollo**: Auto-detección implementada
- **Error 404 en edición de clientes**: Endpoint `PUT /api/customers/:id` agregado
- **Warning de React keys**: Keys únicas en `Kitchen.tsx`
- **Seed fallaba con usuario duplicado**: `ON CONFLICT DO NOTHING`

#### Compatibilidad PostgreSQL

- **INTEGER → SERIAL**: Auto-incrementales
- **TEXT → JSONB**: Campos JSON nativos
- **Campos lowercase**: Mapeo explícito a camelCase
- **TIMESTAMP**: Uso de tipo nativo de PostgreSQL

### Seguridad

- Variables sensibles movidas a `.env` (no commiteadas)
- `.env.example` provisto como template

---

## [0.9.0] - 2026-01-06 (Anterior a migración)

### Estado Inicial

- Backend con SQLite (`better-sqlite3`)
- Base de datos en archivo `server/malulos.db`
- Sin auto-detección de SSL
- Script `initDb.js` para inicializar BD
- Sin mapeo de campos (lowercase directo)

---

## Tipos de Cambios

- **Agregado**: para funcionalidad nueva.
- **Cambiado**: para cambios en funcionalidad existente.
- **Deprecado**: para funcionalidad que será removida.
- **Eliminado**: para funcionalidad removida.
- **Corregido**: para corrección de bugs.
- **Seguridad**: para vulnerabilidades.

---

## Versionado

Este proyecto usa [Semantic Versioning](https://semver.org/lang/es/):

- **MAJOR** (1.x.x): Cambios incompatibles en API
- **MINOR** (x.1.x): Funcionalidad agregada compatible
- **PATCH** (x.x.1): Correcciones de bugs compatibles

---

## Enlaces

- [Repositorio](https://github.com/usuario/malulos-pos)
- [Issues](https://github.com/usuario/malulos-pos/issues)
- [Documentación](./MIGRATION.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**Mantenido por**: Equipo Malulos POS
**Última actualización**: 2026-01-07
