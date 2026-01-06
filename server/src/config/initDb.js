import { db } from './database.js';

console.log('🔧 Inicializando esquema de base de datos...');

// Crear tablas
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
    sizes TEXT, -- JSON array
    modifierGroups TEXT, -- JSON array
    isCombo INTEGER NOT NULL DEFAULT 0,
    comboItems TEXT, -- JSON array
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
    positionY INTEGER NOT NULL,
    FOREIGN KEY (currentOrderId) REFERENCES orders(id) ON DELETE SET NULL
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
    items TEXT NOT NULL, -- JSON array
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
    FOREIGN KEY (tableId) REFERENCES restaurantTables(id) ON DELETE SET NULL,
    FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
);

-- Clientes
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
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

-- Movimientos de caja
CREATE TABLE IF NOT EXISTS cashMovements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in', 'out')),
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    userId INTEGER NOT NULL,
    userName TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (sessionId) REFERENCES cashSessions(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tableId ON orders(tableId);
CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt);
CREATE INDEX IF NOT EXISTS idx_cashSessions_status ON cashSessions(status);
CREATE INDEX IF NOT EXISTS idx_cashMovements_sessionId ON cashMovements(sessionId);
`;

// Ejecutar schema
db.exec(schema);

console.log('✅ Esquema de base de datos creado exitosamente');

// Datos iniciales (seed)
const seedData = () => {
    console.log('🌱 Insertando datos iniciales...');

    // Verificar si ya hay datos
    const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    if (categoriesCount.count > 0) {
        console.log('ℹ️  La base de datos ya contiene datos. Saltando seed.');
        return;
    }

    // Insertar categorías
    const insertCategory = db.prepare(`
        INSERT INTO categories (name, icon, "order", isActive)
        VALUES (?, ?, ?, ?)
    `);

    const categories = [
        ['Hamburguesas', '🍔', 1, 1],
        ['Papas', '🍟', 2, 1],
        ['Bebidas', '🥤', 3, 1],
        ['Perros Calientes', '🌭', 4, 1],
        ['Postres', '🍦', 5, 1],
        ['Combos', '🍱', 6, 1]
    ];

    const categoryIds = categories.map(cat => insertCategory.run(...cat).lastInsertRowid);

    // Insertar productos
    const insertProduct = db.prepare(`
        INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run(
        categoryIds[0], // Hamburguesas
        'Hamburguesa Clásica',
        'Carne 150g, queso, lechuga, tomate',
        15000,
        JSON.stringify([
            { name: 'Sencilla', priceModifier: 0 },
            { name: 'Doble', priceModifier: 5000 }
        ]),
        JSON.stringify([
            {
                name: 'Adiciones',
                minSelect: 0,
                maxSelect: 3,
                modifiers: [
                    { id: '1', name: 'Tocineta', priceModifier: 3000, isDefault: false },
                    { id: '2', name: 'Huevo', priceModifier: 2000, isDefault: false },
                    { id: '3', name: 'Pepinillos', priceModifier: 1000, isDefault: false }
                ]
            }
        ]),
        0,
        JSON.stringify([]),
        1,
        new Date().toISOString()
    );

    insertProduct.run(
        categoryIds[1], // Papas
        'Papas Francesas',
        'Papas fritas crocantes',
        8000,
        JSON.stringify([
            { name: 'Medianas', priceModifier: 0 },
            { name: 'Grandes', priceModifier: 3000 }
        ]),
        JSON.stringify([]),
        0,
        JSON.stringify([]),
        1,
        new Date().toISOString()
    );

    insertProduct.run(
        categoryIds[2], // Bebidas
        'Coca-Cola',
        '350ml fría',
        5000,
        JSON.stringify([]),
        JSON.stringify([]),
        0,
        JSON.stringify([]),
        1,
        new Date().toISOString()
    );

    insertProduct.run(
        categoryIds[5], // Combos
        'Combo Clásico',
        'Hamburguesa + Papas + Bebida',
        22000,
        JSON.stringify([]),
        JSON.stringify([]),
        1,
        JSON.stringify([
            { categoryId: categoryIds[0], name: 'Hamburguesa', required: true },
            { categoryId: categoryIds[1], name: 'Acompañamiento', required: true },
            { categoryId: categoryIds[2], name: 'Bebida', required: true }
        ]),
        1,
        new Date().toISOString()
    );

    // Insertar mesas
    const insertTable = db.prepare(`
        INSERT INTO restaurantTables (number, name, status, capacity, positionX, positionY)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 6; i++) {
        const capacity = i === 4 ? 6 : (i === 3 ? 2 : 4);
        const x = (i - 1) % 3;
        const y = Math.floor((i - 1) / 3);
        insertTable.run(i, `Mesa ${i}`, 'available', capacity, x, y);
    }

    // Insertar configuración
    db.prepare(`
        INSERT INTO config (businessName, taxRate, currency, currencySymbol, printReceipt, soundEnabled)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run('Malulos', 0, 'COP', '$', 0, 1);

    // Insertar usuarios
    const insertUser = db.prepare(`
        INSERT INTO users (name, pin, role, isActive, createdAt)
        VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run('Admin', '1234', 'admin', 1, new Date().toISOString());
    insertUser.run('Cajero', '2222', 'cashier', 1, new Date().toISOString());
    insertUser.run('Mesero', '3333', 'waiter', 1, new Date().toISOString());

    console.log('✅ Datos iniciales insertados exitosamente');
};

seedData();

console.log('🎉 Base de datos inicializada y lista para usar');
process.exit(0);
