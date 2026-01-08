# 🍔 Malulos POS

Sistema de Punto de Venta (POS) para restaurante de comidas rápidas con arquitectura cliente-servidor.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./CHANGELOG.md)
[![Database](https://img.shields.io/badge/database-PostgreSQL-336791.svg)](https://www.postgresql.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18-61DAFB.svg)](https://reactjs.org/)

---

## 📋 Índice

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Instalación Rápida](#-instalación-rápida)
- [Uso](#-uso)
- [Documentación](#-documentación)
- [Troubleshooting](#-troubleshooting)
- [Licencia](#-licencia)

---

## ✨ Características

### Gestión de Pedidos
- 🍽️ Sistema de mesas con estados (disponible, ocupada, pagando, reservada)
- 📝 Creación de pedidos con productos personalizables
- 🔄 Estados de pedido (pendiente, confirmado, preparando, listo, completado)
- 👨‍🍳 Vista de cocina en tiempo real
- 🧾 Generación de tickets PDF

### Productos y Menú
- 📦 Categorías organizadas con iconos
- 🍔 Productos con múltiples tamaños
- ➕ Modificadores (extras) configurables
- 🍱 Soporte para combos
- 💰 Cálculo automático de precios

### Caja y Pagos
- 💵 Sesiones de caja (apertura/cierre)
- 💳 Múltiples métodos de pago (efectivo, tarjeta, transferencia, mixto)
- 📊 Reportes de ventas
- 💸 Movimientos de caja (entradas/salidas)
- 🧮 Cálculo automático de diferencias

### Usuarios y Seguridad
- 🔐 Autenticación por PIN (4 dígitos)
- 👥 3 roles: Admin, Cajero, Mesero
- 🛡️ Permisos granulares por rol
- 📱 Soporte multi-dispositivo (meseros, cocina, caja)

---

## 🛠️ Tecnologías

### Frontend
- **React 18** con TypeScript
- **Vite** como build tool
- **React Router v7** para navegación
- **Zustand** para state management
- **CSS Modules** para estilos
- **jsPDF** para generación de tickets

### Backend
- **Node.js 18+** con Express
- **PostgreSQL** como base de datos
- **pg (node-postgres)** para conexiones
- **CORS** habilitado para múltiples dispositivos

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

---

## 🚀 Instalación Rápida

### Requisitos Previos

- [Node.js](https://nodejs.org/) >= 18.0.0
- [PostgreSQL](https://www.postgresql.org/download/) >= 12

### Paso 1: Instalar PostgreSQL

**Windows**:
```bash
# Descargar desde: https://www.postgresql.org/download/windows/
```

**macOS**:
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Paso 2: Configurar Base de Datos

```bash
# Crear base de datos
createdb malulos_pos
```

### Paso 3: Instalar Proyecto

```bash
# Clonar repositorio
git clone https://github.com/usuario/malulos-pos.git
cd malulos-pos

# Backend: Configurar variables de entorno
cd server
cp .env.example .env
# Editar .env y configurar DATABASE_URL

# Instalar dependencias del backend
npm install

# Ejecutar seed (datos iniciales)
npm run seed

# Instalar dependencias del frontend
cd ..
npm install
```

### Paso 4: Iniciar Aplicación

**Terminal 1 - Backend**:
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend**:
```bash
npm run dev
```

Abre tu navegador en: `http://localhost:5174`

**Usuarios por defecto**:
- **Admin**: PIN `1234` (acceso total)
- **Cajero**: PIN `2222` (operaciones de caja)
- **Mesero**: PIN `3333` (solo tomar pedidos)

---

## 📖 Uso

### Flujo Básico

1. **Login**: Ingresa con PIN (ej: `1234` para Admin)
2. **Abrir Caja**: Ir a `/cash` y abrir sesión con monto inicial
3. **Crear Pedido**:
   - Seleccionar mesa desde Home
   - Agregar productos al carrito
   - Confirmar pedido
4. **Cocina**: Vista `/kitchen` muestra pedidos activos
5. **Pago**: Procesar pago y generar ticket
6. **Cerrar Caja**: Al final del día, cerrar sesión de caja

### Vistas Principales

- **`/`**: Home - Selector de mesas
- **`/orders/:tableId`**: Gestión de pedidos
- **`/kitchen`**: Vista de cocina en tiempo real
- **`/cash`**: Gestión de caja
- **`/menu`**: Administración de productos
- **`/reports`**: Reportes de ventas

---

## 📚 Documentación

### Guías Principales

- **[MIGRATION.md](./MIGRATION.md)**: Documentación completa de migración a PostgreSQL
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**: Resolución de problemas comunes
- **[TESTING.md](./TESTING.md)**: Guía de testing y validación
- **[CHANGELOG.md](./CHANGELOG.md)**: Historial de cambios
- **[server/README.md](./server/README.md)**: Documentación del backend
- **[CLAUDE.md](./CLAUDE.md)**: Arquitectura y convenciones (para desarrollo)

### Contenido Destacado

#### Para Desarrolladores

```bash
# Verificar datos en BD
cd server
npm run check

# Ejecutar seed de datos
npm run seed

# Iniciar con hot-reload
npm run dev
```

#### Para Producción

```bash
# Build del frontend
npm run build

# Iniciar backend
cd server
npm start
```

---

## 🐛 Troubleshooting

### Problemas Comunes

**1. Error de SSL**: Ver [TROUBLESHOOTING.md#1-ssl-connections](./TROUBLESHOOTING.md#1-ssl-connections)

**2. Productos no se muestran**: Ver [TROUBLESHOOTING.md#2-productos-no-se-muestran](./TROUBLESHOOTING.md#2-productos-no-se-muestran)

**3. PostgreSQL no conecta**: Ver [TROUBLESHOOTING.md#7-conexión-a-postgresql](./TROUBLESHOOTING.md#7-conexión-a-postgresql)

### Checklist Rápido

```bash
# 1. Verificar PostgreSQL
psql -U postgres -c "SELECT version();"

# 2. Verificar datos
cd server && npm run check

# 3. Verificar backend
curl http://localhost:3000/api/health

# 4. Ver logs de errores
# F12 en navegador → Console
```

Para más ayuda, consulta **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**.

---

## 🗂️ Estructura del Proyecto

```
malulos-pos/
├── src/                    # Frontend React + TypeScript
│   ├── components/         # Componentes reutilizables
│   ├── pages/             # Páginas principales
│   ├── services/          # API y servicios
│   ├── stores/            # Zustand stores
│   └── types/             # Tipos TypeScript
├── server/                # Backend Node.js + Express
│   ├── src/
│   │   ├── config/        # Configuración (database.js)
│   │   ├── models/        # Modelos de datos
│   │   └── scripts/       # Scripts (seed, check)
│   ├── .env.example       # Template de variables de entorno
│   └── package.json
├── public/                # Assets estáticos
├── MIGRATION.md           # Documentación de migración
├── TROUBLESHOOTING.md     # Guía de resolución de problemas
├── TESTING.md             # Guía de testing
├── CHANGELOG.md           # Historial de cambios
└── README.md              # Este archivo
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: Amazing feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Convenciones

- **Commits**: Usar formato `Add:`, `Fix:`, `Update:`, `Remove:`
- **Branches**: `feature/`, `bugfix/`, `hotfix/`
- **Código**: TypeScript estricto, CSS Modules, CLEAN CODE

---

## 📄 Licencia

MIT License - Ver [LICENSE](./LICENSE) para más detalles.

---

## 👥 Equipo

Desarrollado con ❤️ por el equipo Malulos POS

---

## 📞 Soporte

- **Documentación**: Ver carpeta `/docs` y archivos `.md` en raíz
- **Issues**: [GitHub Issues](https://github.com/usuario/malulos-pos/issues)
- **Email**: soporte@malulos.com

---

## 🎯 Roadmap

### v1.1.0 (Próximo)
- [ ] Migraciones de base de datos con `node-pg-migrate`
- [ ] Tests automatizados (Jest + React Testing Library)
- [ ] CI/CD con GitHub Actions

### v1.2.0 (Futuro)
- [ ] Reportes avanzados con gráficos
- [ ] Inventario de productos
- [ ] Notificaciones push

### v2.0.0 (Largo plazo)
- [ ] Aplicación móvil nativa
- [ ] Dashboard de analytics
- [ ] Integración con servicios de delivery

---

**¿Nuevo en el proyecto?** Comienza con [MIGRATION.md](./MIGRATION.md) para entender la arquitectura.

**¿Problemas?** Consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) primero.

**¿Listo para contribuir?** Lee [CLAUDE.md](./CLAUDE.md) para convenciones de código.

---

<p align="center">
  <strong>Malulos POS v1.0.0</strong> | PostgreSQL | React | Express
</p>
