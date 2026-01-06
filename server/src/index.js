import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { Category, RestaurantTable, User, CashSession, Config } from './models/index.js';
import { Customer } from './models/Customer.js';
import { initTelegramBot } from './services/telegramBot.js';
import { Customer as CustomerModel } from './models/Customer.js'; // Importar modelo separado

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar Bot de Telegram (usar token de variable de entorno o pasar directamente)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
initTelegramBot(BOT_TOKEN);

// Middleware
app.use(cors());
app.use(express.json());

// ===== PRODUCTOS =====
app.get('/api/products', (req, res) => {
    try {
        const products = Product.getAll();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', (req, res) => {
    try {
        const product = Product.getById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/category/:categoryId', (req, res) => {
    try {
        const products = Product.getByCategory(req.params.categoryId);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', (req, res) => {
    try {
        const product = Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', (req, res) => {
    try {
        const product = Product.update(req.params.id, req.body);
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        Product.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CATEGORÍAS =====
app.get('/api/categories', (req, res) => {
    try {
        const categories = Category.getAll();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories', (req, res) => {
    try {
        const category = Category.create(req.body);
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/categories/:id', (req, res) => {
    try {
        const category = Category.update(req.params.id, req.body);
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categories/:id', (req, res) => {
    try {
        Category.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== MESAS =====
app.get('/api/tables', (req, res) => {
    try {
        const tables = RestaurantTable.getAll();
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tables/:id', (req, res) => {
    try {
        const table = RestaurantTable.getById(req.params.id);
        if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
        res.json(table);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tables', (req, res) => {
    try {
        const table = RestaurantTable.create(req.body);
        res.status(201).json(table);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tables/:id', (req, res) => {
    try {
        const table = RestaurantTable.update(req.params.id, req.body);
        res.json(table);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== PEDIDOS =====
app.get('/api/orders', (req, res) => {
    try {
        const { status, active, tableId, startDate, endDate } = req.query;

        let orders;
        if (active) {
            orders = Order.getActiveOrders();
        } else if (status === 'completed' && (startDate || endDate)) {
            orders = Order.getCompletedByDateRange(startDate, endDate);
        } else if (status) {
            orders = Order.getByStatus(status);
        } else if (tableId) {
            const order = Order.getByTable(tableId);
            orders = order ? [order] : [];
        } else {
            orders = Order.getAll();
        }

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/:id', (req, res) => {
    try {
        const order = Order.getById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', (req, res) => {
    try {
        const order = Order.create(req.body);
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/orders/:id', (req, res) => {
    try {
        const order = Order.update(req.params.id, req.body);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/orders/:id', (req, res) => {
    try {
        Order.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== USUARIOS =====
app.get('/api/users', (req, res) => {
    try {
        const users = User.getAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/login', (req, res) => {
    try {
        const { pin } = req.body;
        const user = User.getByPin(pin);
        if (!user) return res.status(401).json({ error: 'PIN incorrecto' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', (req, res) => {
    try {
        const user = User.create(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', (req, res) => {
    try {
        const user = User.update(req.params.id, req.body);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== SESIONES DE CAJA =====
app.get('/api/cash-sessions/active', (req, res) => {
    try {
        const session = CashSession.getActive();
        res.json(session || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cash-sessions/:id', (req, res) => {
    try {
        const session = CashSession.getById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cash-sessions', (req, res) => {
    try {
        const session = CashSession.create(req.body);
        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/cash-sessions/:id', (req, res) => {
    try {
        const session = CashSession.update(req.params.id, req.body);
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cash-sessions/:id/close', (req, res) => {
    try {
        const session = CashSession.close(req.params.id, req.body);
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CLIENTES =====
app.get('/api/customers', (req, res) => {
    try {
        const customers = Customer.getAll();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/customers/:id', (req, res) => {
    try {
        const customer = Customer.getById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', (req, res) => {
    try {
        const customer = Customer.create(req.body);
        res.status(201).json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/customers/:id', (req, res) => {
    try {
        const customer = Customer.update(req.params.id, req.body);
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/customers/:id', (req, res) => {
    try {
        Customer.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CONFIGURACIÓN =====
app.get('/api/config', (req, res) => {
    try {
        const config = Config.get();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/config', (req, res) => {
    try {
        const config = Config.update(req.body);
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Malulos POS API running' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor API corriendo en http://0.0.0.0:${PORT}`);
    console.log(`🌐 Accesible desde la red local en http://[TU_IP]:${PORT}`);
});
