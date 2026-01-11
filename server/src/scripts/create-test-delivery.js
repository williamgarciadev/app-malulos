import 'dotenv/config';
import { pool } from '../config/database.js';

const createTestDeliveryOrder = async () => {
    try {
        console.log('📦 Creando pedido de prueba Delivery...');

        // 1. Verificar/Crear Cliente
        let customerId;
        const customerRes = await pool.query("SELECT id FROM customers LIMIT 1");
        if (customerRes.rows.length > 0) {
            customerId = customerRes.rows[0].id;
        } else {
            const newCustomer = await pool.query(
                "INSERT INTO customers (name, phone, address) VALUES ($1, $2, $3) RETURNING id",
                ['Cliente Prueba', '3001234567', 'Calle Falsa 123']
            );
            customerId = newCustomer.rows[0].id;
        }

        // 2. Crear Orden
        const orderRes = await pool.query(`
            INSERT INTO orders (
                "orderNumber", type, status, "paymentStatus", "paymentMethod", 
                "customerId", subtotal, tax, total, "createdAt", "confirmedAt"
            ) VALUES (
                'DEL-001', 'delivery', 'ready', 'pending', 'cash',
                $1, 20000, 0, 20000, NOW(), NOW()
            ) RETURNING id
        `, [customerId]);
        
        const orderId = orderRes.rows[0].id;

        // 3. Agregar Items (Hamburguesa)
        const productRes = await pool.query("SELECT id, name, \"basePrice\" FROM products LIMIT 1");
        const product = productRes.rows[0];

        await pool.query(`
            INSERT INTO "orderItems" (
                "orderId", "productId", "productName", quantity, "unitPrice", "totalPrice", status
            ) VALUES (
                $1, $2, $3, 1, $4, $4, 'ready'
            )
        `, [orderId, product.id, product.name, product.basePrice]);

        console.log(`✅ Pedido Delivery creado con ID: ${orderId} (Estado: ready)`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
};

createTestDeliveryOrder();
