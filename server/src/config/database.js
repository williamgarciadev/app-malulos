import Database from 'better-sqlite3';
import { join } from 'path';

// En Render, usaremos una ruta persistente (/var/lib/data/malulos.db)
// En local, usaremos el valor por defecto
const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'malulos.db');
export const db = new Database(dbPath);

// Asegurar integridad referencial
db.pragma('foreign_keys = ON');

console.log(`✅ Base de datos SQLite conectada: ${dbPath}`);

/**
 * ESQUEMA AUTOMÁTICO
 * Esto asegura que si una tabla se borra, se recrea al reiniciar el servidor.
 */
const schema = `
-- Categorías
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    isActive INTEGER NOT NULL DEFAULT 1
);

-- Productos
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryId INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    basePrice REAL NOT NULL,
    image TEXT,
    sizes TEXT,
    modifierGroups TEXT,
    isCombo INTEGER NOT NULL DEFAULT 0,
    comboItems TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
);

-- Mesas
CREATE TABLE IF NOT EXISTS restaurantTables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('available', 'occupied', 'paying', 'reserved')),
    capacity INTEGER NOT NULL,
    currentOrderId INTEGER,
    positionX INTEGER NOT NULL,
    positionY INTEGER NOT NULL
);

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderNumber TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('dine-in', 'takeout', 'delivery')),
    tableId INTEGER,
    tableName TEXT,
    customerId INTEGER,
    customerName TEXT,
    customerPhone TEXT,
    customerAddress TEXT,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled')),
    paymentStatus TEXT NOT NULL CHECK(paymentStatus IN ('pending', 'partial', 'paid')),
    paymentMethod TEXT CHECK(paymentMethod IN ('cash', 'card', 'transfer', 'mixed')),
    paidAmount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    origin TEXT DEFAULT 'pos',
    createdAt TEXT NOT NULL,
    confirmedAt TEXT,
    readyAt TEXT,
    completedAt TEXT,
    FOREIGN KEY (tableId) REFERENCES restaurantTables(id) ON DELETE SET NULL
);

-- Clientes (IMPORTANTE: Verificación automática)
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    telegramId TEXT UNIQUE,
    createdAt TEXT NOT NULL,
    lastOrderAt TEXT
);

-- Configuración
CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    businessName TEXT NOT NULL,
    taxRate REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'COP',
    currencySymbol TEXT NOT NULL DEFAULT '$',
    printReceipt INTEGER NOT NULL DEFAULT 0,
    soundEnabled INTEGER NOT NULL DEFAULT 1
);

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pin TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'waiter')),
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL
);

-- Sesiones de caja
CREATE TABLE IF NOT EXISTS cashSessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    userName TEXT NOT NULL,
    openedAt TEXT NOT NULL,
    closedAt TEXT,
    openingAmount REAL NOT NULL,
    expectedAmount REAL,
    actualAmount REAL,
    difference REAL,
    cashSales REAL NOT NULL DEFAULT 0,
    cardSales REAL NOT NULL DEFAULT 0,
    totalSales REAL NOT NULL DEFAULT 0,
    ordersCount INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_customers_telegramId ON customers(telegramId);
`;

db.exec(schema);