import pkg from 'pg';
const { Pool } = pkg;

// Render proporciona DATABASE_URL automáticamente
// En local, puedes usar una cadena como 'postgresql://usuario:password@localhost:5432/malulos'
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false // Requerido para Render/Supabase
    }
});

// Helper para query simplificado
export const query = (text, params) => pool.query(text, params);

console.log('🐘 Conexión a PostgreSQL configurada.');

/**
 * ESQUEMA AUTOMÁTICO (PostgreSQL)
 */
export const initSchema = async () => {
    const schema = `
    -- Categorías
    CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1
    );

    -- Productos
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        categoryId INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        basePrice REAL NOT NULL,
        image TEXT,
        sizes JSONB,
        modifierGroups JSONB,
        isCombo INTEGER NOT NULL DEFAULT 0,
        comboItems JSONB,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Mesas
    CREATE TABLE IF NOT EXISTS restaurantTables (
        id SERIAL PRIMARY KEY,
        number INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('available', 'occupied', 'paying', 'reserved')),
        capacity INTEGER NOT NULL,
        currentOrderId INTEGER,
        positionX INTEGER NOT NULL,
        positionY INTEGER NOT NULL
    );

    -- Clientes
    CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        notes TEXT,
        telegramId TEXT UNIQUE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lastOrderAt TIMESTAMP
    );

    -- Pedidos
    CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        orderNumber TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK(type IN ('dine-in', 'takeout', 'delivery')),
        tableId INTEGER REFERENCES restaurantTables(id) ON DELETE SET NULL,
        tableName TEXT,
        customerId INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        customerName TEXT,
        customerPhone TEXT,
        customerAddress TEXT,
        items JSONB NOT NULL,
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
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        confirmedAt TIMESTAMP,
        readyAt TIMESTAMP,
        completedAt TIMESTAMP
    );

    -- Configuración
    CREATE TABLE IF NOT EXISTS config (
        id SERIAL PRIMARY KEY,
        businessName TEXT NOT NULL,
        taxRate REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'COP',
        currencySymbol TEXT NOT NULL DEFAULT '$',
        printReceipt INTEGER NOT NULL DEFAULT 0,
        soundEnabled INTEGER NOT NULL DEFAULT 1
    );

    -- Usuarios
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        pin TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'waiter')),
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Sesiones de caja
    CREATE TABLE IF NOT EXISTS cashSessions (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        userName TEXT NOT NULL,
        openedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closedAt TIMESTAMP,
        openingAmount REAL NOT NULL,
        expectedAmount REAL,
        actualAmount REAL,
        difference REAL,
        cashSales REAL NOT NULL DEFAULT 0,
        cardSales REAL NOT NULL DEFAULT 0,
        totalSales REAL NOT NULL DEFAULT 0,
        ordersCount INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        status TEXT NOT NULL CHECK(status IN ('open', 'closed'))
    );

    -- Movimientos de caja
    CREATE TABLE IF NOT EXISTS cashMovements (
        id SERIAL PRIMARY KEY,
        sessionId INTEGER NOT NULL REFERENCES cashSessions(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('in', 'out')),
        amount REAL NOT NULL,
        reason TEXT NOT NULL,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        userName TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_customers_telegramId ON customers(telegramId);
    `;

    try {
        await query(schema);
        console.log('✅ Esquema de PostgreSQL sincronizado.');
        
        // Insertar configuración inicial si no existe
        const configCheck = await query('SELECT count(*) FROM config');
        if (parseInt(configCheck.rows[0].count) === 0) {
            await query(`INSERT INTO config (businessName) VALUES ('Malulos')`);
            console.log('🌱 Configuración base creada.');
        }

        // Insertar usuario admin si no existe
        const userCheck = await query('SELECT count(*) FROM users');
        if (parseInt(userCheck.rows[0].count) === 0) {
            await query(`INSERT INTO users (name, pin, role) VALUES ('Admin', '1234', 'admin')`);
            console.log('🌱 Usuario Admin (1234) creado.');
        }

    } catch (err) {
        console.error('❌ Error inicializando esquema:', err);
    }
};
