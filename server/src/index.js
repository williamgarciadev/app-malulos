import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSchema, pool } from './config/database.js';
import { Category, RestaurantTable, User, CashSession, Config } from './models/index.js';
import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { Customer } from './models/Customer.js';
import { initTelegramBot, notifyTelegramCustomer } from './services/telegramBot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del Frontend
const frontendPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendPath));

// ===== PRODUCTOS =====
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.getAll();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.getById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.update(req.params.id, req.body);
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CATEGORÍAS =====
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.getAll();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== MESAS =====
app.get('/api/tables', async (req, res) => {
    try {
        const tables = await RestaurantTable.getAll();
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tables/:id', async (req, res) => {
    try {
        const table = await RestaurantTable.getById(req.params.id);
        if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
        res.json(table);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tables/:id', async (req, res) => {
    try {
        const table = await RestaurantTable.update(req.params.id, req.body);
        res.json(table);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== PEDIDOS =====
app.get('/api/orders', async (req, res) => {
    try {
        const { status, active, tableId, startDate, endDate } = req.query;
        let orders;
        if (active) orders = await Order.getActiveOrders();
        else if (status === 'completed' && (startDate || endDate)) orders = await Order.getCompletedByDateRange(startDate, endDate);
        else if (status) orders = await Order.getByStatus(status);
        else if (tableId) {
            const order = await Order.getByTable(tableId);
            orders = order ? [order] : [];
        } else orders = await Order.getAll();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const order = await Order.create(req.body);
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const existingOrder = await Order.getById(req.params.id);
        const order = await Order.update(req.params.id, req.body);

        if (existingOrder && order && order.origin === 'telegram' && existingOrder.status !== order.status) {
            const customer = order.customerId ? await Customer.getById(order.customerId) : null;
            if (customer?.telegramId) {
                const statusMessages = {
                    confirmed: `✅ Tu pago fue confirmado para el pedido ${order.orderNumber}.`,
                    preparing: `👨‍🍳 Tu pedido ${order.orderNumber} está en preparación.`,
                    ready: `📦 Tu pedido ${order.orderNumber} esta listo para salir.`,
                    on_the_way: `🛵 Tu pedido ${order.orderNumber} va en camino.`,
                    delivered: `✅ Tu pedido ${order.orderNumber} fue entregado.`,
                    cancelled: `❌ Tu pedido ${order.orderNumber} fue cancelado.`
                };
                const message = statusMessages[order.status];
                if (message) {
                    await notifyTelegramCustomer(customer.telegramId, message);
                }
            }
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status es requerido' });
        }

        const existingOrder = await Order.getById(req.params.id);
        const order = await Order.update(req.params.id, { status });

        if (existingOrder && order && order.origin === 'telegram' && existingOrder.status !== order.status) {
            const customer = order.customerId ? await Customer.getById(order.customerId) : null;
            if (customer?.telegramId) {
                const statusMessages = {
                    confirmed: `✅ Tu pago fue confirmado para el pedido ${order.orderNumber}.`,
                    preparing: `👨‍🍳 Tu pedido ${order.orderNumber} está en preparación.`,
                    ready: `📦 Tu pedido ${order.orderNumber} esta listo para salir.`,
                    on_the_way: `🛵 Tu pedido ${order.orderNumber} va en camino.`,
                    delivered: `✅ Tu pedido ${order.orderNumber} fue entregado.`,
                    cancelled: `❌ Tu pedido ${order.orderNumber} fue cancelado.`
                };
                const message = statusMessages[order.status];
                if (message) {
                    await notifyTelegramCustomer(customer.telegramId, message);
                }
            }
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== USUARIOS =====
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.getAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { pin } = req.body;
        console.log(`🔐 Intento de login con PIN recibido`);

        // Debug: ver todos los usuarios primero
        const allUsers = await pool.query('SELECT id, name, pin, role, isactive FROM users');
        console.log(`📋 DEBUG - Usuarios en BD:`, JSON.stringify(allUsers.rows));

        // Intentar buscar sin filtro de isactive
        const rawQuery = await pool.query('SELECT * FROM users WHERE pin = $1', [pin]);
        console.log(`🔍 DEBUG - Query sin filtro isactive:`, JSON.stringify(rawQuery.rows));

        const user = await User.getByPin(pin);
        console.log(`🔍 DEBUG - getByPin result:`, user ? JSON.stringify(user) : 'null');

        if (!user) {
            console.log(`❌ Login fallido - PIN no encontrado o usuario inactivo`);
            return res.status(401).json({ error: 'PIN incorrecto' });
        }

        console.log(`✅ Login exitoso: ${user.name} (${user.role})`);
        res.json(user);
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== SESIONES DE CAJA =====
app.get('/api/cash-sessions/active', async (req, res) => {
    try {
        const session = await CashSession.getActive();
        res.json(session || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cash-sessions', async (req, res) => {
    try {
        const session = await CashSession.create(req.body);
        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/cash-sessions/:id', async (req, res) => {
    try {
        const session = await CashSession.update(req.params.id, req.body);
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cash-sessions/:id/close', async (req, res) => {
    try {
        const session = await CashSession.close(req.params.id, req.body);
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CLIENTES =====
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.getAll();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        res.status(201).json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const customer = await Customer.update(req.params.id, req.body);
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CONFIGURACIÓN =====
app.get('/api/config', async (req, res) => {
    try {
        const config = await Config.get();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Malulos POS API running on PostgreSQL' });
});

// Debug endpoint - ver estado de usuarios (sin exponer PINs)
app.get('/api/debug/users', async (req, res) => {
    try {
        const users = await User.getAll();
        res.json({
            count: users.length,
            users: users.map(u => ({ id: u.id, name: u.name, role: u.role, isactive: u.isactive }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Iniciar servidor tras sincronizar esquema
const startServer = async () => {
    await initSchema();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor API corriendo en http://0.0.0.0:${PORT}`);
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (BOT_TOKEN) initTelegramBot(BOT_TOKEN);
    });
};

startServer();
