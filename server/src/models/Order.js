import { db } from '../config/database.js';

export class Order {
    static getAll() {
        const orders = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
        return orders.map(this.parseOrder);
    }

    static getById(id) {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        return order ? this.parseOrder(order) : null;
    }

    static getByStatus(status) {
        const orders = db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY createdAt DESC').all(status);
        return orders.map(this.parseOrder);
    }

    static getCompletedByDateRange(startDate, endDate) {
        let query = "SELECT * FROM orders WHERE status = 'completed'";
        const params = [];

        if (startDate) {
            query += " AND completedAt >= ?";
            params.push(startDate);
        }

        if (endDate) {
            query += " AND completedAt <= ?";
            params.push(endDate);
        }

        query += " ORDER BY completedAt DESC";

        const orders = db.prepare(query).all(...params);
        return orders.map(this.parseOrder);
    }

    static getActiveOrders() {
        const orders = db.prepare(`
            SELECT * FROM orders
            WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')
            ORDER BY createdAt DESC
        `).all();
        return orders.map(this.parseOrder);
    }

    static getByTable(tableId) {
        const order = db.prepare(`
            SELECT * FROM orders
            WHERE tableId = ? AND status IN ('pending', 'confirmed', 'preparing', 'ready')
            ORDER BY createdAt DESC
            LIMIT 1
        `).get(tableId);
        return order ? this.parseOrder(order) : null;
    }

    static create(data) {
        // Generar número de orden secuencial diario
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        const countStmt = db.prepare('SELECT COUNT(*) as count FROM orders WHERE createdAt >= ?');
        const { count } = countStmt.get(todayIso);
        
        const nextNumber = count + 1;
        const orderNumber = `#${String(nextNumber).padStart(3, '0')}`;

        const stmt = db.prepare(`
            INSERT INTO orders (
                orderNumber, type, tableId, tableName, customerId, customerName,
                customerPhone, customerAddress, items, subtotal, discount, tax, total,
                status, paymentStatus, paymentMethod, paidAmount, notes, origin, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
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
            data.origin || 'pos',
            new Date().toISOString()
        );

        return this.getById(result.lastInsertRowid);
    }

    static update(id, data) {
        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && data[key] !== undefined) {
                fields.push(`${key} = ?`);
                if (key === 'items') {
                    values.push(JSON.stringify(data[key]));
                } else {
                    values.push(data[key]);
                }
            }
        });

        values.push(id);

        const stmt = db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);

        return this.getById(id);
    }

    static delete(id) {
        db.prepare('DELETE FROM orders WHERE id = ?').run(id);
        return true;
    }

    static parseOrder(order) {
        return {
            ...order,
            items: JSON.parse(order.items || '[]'),
            createdAt: new Date(order.createdAt),
            confirmedAt: order.confirmedAt ? new Date(order.confirmedAt) : undefined,
            readyAt: order.readyAt ? new Date(order.readyAt) : undefined,
            completedAt: order.completedAt ? new Date(order.completedAt) : undefined
        };
    }
}
