# 🚀 Instalación de Malulos POS con Backend SQLite

Guía completa para migrar y configurar el sistema POS con base de datos centralizada.

## 📋 Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Windows 11 (o cualquier OS moderno)

## 🔧 Instalación Paso a Paso

### 1. Instalar Dependencias

```bash
# Instalar dependencias del frontend
npm install

# Instalar dependencias del backend
cd server
npm install
cd ..

# Instalar concurrently (para ejecutar ambos servidores)
npm install
```

### 2. Inicializar Base de Datos SQLite

```bash
npm run init-db
```

Este comando:
- ✅ Crea el archivo `server/malulos.db`
- ✅ Crea todas las tablas necesarias
- ✅ Inserta datos iniciales (categorías, productos, mesas, usuarios)

**Usuarios creados automáticamente**:
- Admin: PIN `1234`
- Cajero: PIN `2222`
- Mesero: PIN `3333`

### 3. Iniciar la Aplicación

```bash
npm run dev:all
```

Esto iniciará:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5174

### 4. Verificar que Todo Funciona

1. Abre http://localhost:5174
2. Usa PIN `1234` para login como Admin
3. Verifica que puedas ver mesas, productos y menú

## 🌐 Acceso desde Múltiples Dispositivos

### Configuración de Red

El backend ya está configurado para aceptar conexiones desde cualquier dispositivo en tu red local.

**Encuentra tu IP local**:

```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

Busca tu IP local (ej: `192.168.1.100`)

### Acceder desde Otros Dispositivos

**Desde tablets/celulares de meseros, cocina, etc:**

1. Conéctate a la misma red WiFi
2. Abre el navegador
3. Ve a: `http://[TU_IP]:5174`

   Ejemplo: `http://192.168.1.100:5174`

**El backend debe ser accesible en**:
- `http://[TU_IP]:3000`

### Configurar el Frontend para Apuntar al Backend

Actualmente el frontend necesita saber dónde está el backend.

**Opción 1: Variable de Entorno** (Recomendado)

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://192.168.1.100:3000
```

**Opción 2: Hardcode en Desarrollo**

En `src/config/api.ts`, configura:

```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
```

## 🔐 Configuración de Firewall (Windows)

Si otros dispositivos no pueden conectarse:

```powershell
# Ejecutar como Administrador en PowerShell

# Permitir puerto del frontend
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5174

# Permitir puerto del backend
New-NetFirewallRule -DisplayName "Malulos POS API" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

## 📱 Configuración Multi-Dispositivo Típica

### Escenario Recomendado

```
┌─────────────────────────────────────────┐
│  PC Principal (Caja)                   │
│  - Ejecuta Backend (npm run dev:all)   │
│  - IP: 192.168.1.100                    │
│  - Acceso: http://localhost:5174        │
└─────────────────────────────────────────┘
              ↓ WiFi ↓
┌─────────────────────────────────────────┐
│  Tablet Mesero 1                        │
│  - Navegador web                        │
│  - Acceso: http://192.168.1.100:5174    │
└─────────────────────────────────────────┘
              ↓ WiFi ↓
┌─────────────────────────────────────────┐
│  Tablet Cocina                          │
│  - Navegador web                        │
│  - Acceso: http://192.168.1.100:5174    │
└─────────────────────────────────────────┘
```

## 🗄️ Backup de Base de Datos

La base de datos está en un solo archivo: `server/malulos.db`

**Para hacer backup**:

```bash
cp server/malulos.db server/malulos_backup_$(date +%Y%m%d).db
```

**Para restaurar**:

```bash
cp server/malulos_backup_20260105.db server/malulos.db
```

## 🔄 Migración de Datos de IndexedDB (Opcional)

Si ya tienes datos en IndexedDB y quieres migrarlos a SQLite:

1. Abre la app en el navegador con IndexedDB
2. Abre DevTools → Console
3. Ejecuta el script de exportación (se creará próximamente)
4. Importa los datos al backend SQLite

## 🚨 Troubleshooting

### Error: "Cannot connect to backend"

✅ Verifica que el backend esté corriendo en `http://localhost:3000`
✅ Prueba acceder a `http://localhost:3000/api/health`
✅ Revisa que no haya otro proceso usando el puerto 3000

### Error: "SQLITE_ERROR: no such table"

✅ Ejecuta `npm run init-db` para crear las tablas

### No puedo acceder desde otro dispositivo

✅ Verifica que ambos dispositivos estén en la misma red WiFi
✅ Desactiva temporalmente el firewall de Windows para probar
✅ Usa tu IP local, no localhost

### Los cambios no se reflejan en otros dispositivos

✅ Refresca la página (F5 o Ctrl+R)
✅ Verifica que todos apunten al mismo backend
✅ Revisa la consola del navegador para errores

## 📚 Próximos Pasos

Una vez instalado y funcionando:

1. ✅ Personaliza los productos en el menú
2. ✅ Ajusta la cantidad y nombres de las mesas
3. ✅ Crea usuarios adicionales si es necesario
4. ✅ Configura el nombre del negocio en Configuración
5. ✅ Prueba el flujo completo: login → abrir caja → tomar pedido → cocinar → pagar

## 🎉 ¡Listo!

Tu sistema POS está configurado y listo para soportar múltiples dispositivos simultáneamente.

Si tienes problemas, revisa:
- Los logs del backend en la terminal
- La consola del navegador (F12) en el frontend
- El archivo `server/README.md` para más detalles de la API
