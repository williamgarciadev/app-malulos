import { pool } from '../config/database.js';

export class Order {
    static async getAll() {
        const res = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
        return res.rows;
    }

    static async getById(id) {
        const res = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        return res.rows[0];
    }

    static async getByStatus(status) {
        const res = await pool.query('SELECT * FROM orders WHERE status = $1 ORDER BY createdAt DESC', [status]);
        return res.rows;
    }

    static async getCompletedByDateRange(startDate, endDate) {
        let query = "SELECT * FROM orders WHERE status = 'completed'";
        const params = [];
        let i = 1;

        if (startDate) {
            query += ` AND completedAt >= $${i}`;
            params.push(startDate);
            i++;
        }

        if (endDate) {
            query += ` AND completedAt <= $${i}`;
            params.push(endDate);
            i++;
        }

        query += " ORDER BY completedAt DESC";
        const res = await pool.query(query, params);
        return res.rows;
    }

    static async getActiveOrders() {
        const res = await pool.query(`
            SELECT * FROM orders
            WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')
            ORDER BY createdAt DESC
        `);
        return res.rows;
    }

    static async getByTable(tableId) {
        const res = await pool.query(`
            SELECT * FROM orders
            WHERE tableId = $1 AND status IN ('pending', 'confirmed', 'preparing', 'ready')
            ORDER BY createdAt DESC
            LIMIT 1
        `, [tableId]);
        return res.rows[0];
    }

    static async create(data) {
        // Generar número de orden secuencial diario
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const countRes = await pool.query('SELECT COUNT(*) as count FROM orders WHERE createdAt >= $1', [today.toISOString()]);
        const nextNumber = parseInt(countRes.rows[0].count) + 1;
        const orderNumber = `#${String(nextNumber).padStart(3, '0')}`;

        const res = await pool.query(`
            INSERT INTO orders (
                orderNumber, type, tableId, tableName, customerId, customerName,
                customerPhone, customerAddress, items, subtotal, discount, tax, total,
                status, paymentStatus, paymentMethod, paidAmount, notes, origin
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `, [
            orderNumber,
            data.type,
            data.tableId || null,
            data.tableName || null,
            data.customerId || null,
            data.customerName || null,
            data.customerPhone || null,
            data.customerAddress || null,
            JSON.stringify(data.items || []),
            data.subtotal,
            data.discount || 0,
            data.tax || 0,
            data.total,
            data.status || 'pending',
            data.paymentStatus || 'pending',
            data.paymentMethod || null,
            data.paidAmount || 0,
            data.notes || null,
            data.origin || 'pos'
        ]);

        return res.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        Object.keys(data).forEach(key => {
            if (!['id', 'createdAt'].includes(key) && data[key] !== undefined) {
                fields.push(`${key} = $${i}`);
                if (key === 'items') {
                    values.push(JSON.stringify(data[key]));
                } else {
                    values.push(data[key]);
                }
                i++;
            }
        });

        values.push(id);
        const res = await pool.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
        return res.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM orders WHERE id = $1', [id]);
        return true;
    }
}