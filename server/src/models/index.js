import { db } from '../config/database.js';

// Modelo de Categorías
export class Category {
    static getAll() {
        return db.prepare('SELECT * FROM categories WHERE isActive = 1 ORDER BY "order"').all();
    }

    static create(data) {
        const stmt = db.prepare('INSERT INTO categories (name, icon, "order", isActive) VALUES (?, ?, ?, ?)');
        const result = stmt.run(data.name, data.icon, data.order, data.isActive ? 1 : 0);
        return db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    }

    static update(id, data) {
        db.prepare('UPDATE categories SET name = ?, icon = ?, "order" = ?, isActive = ? WHERE id = ?')
            .run(data.name, data.icon, data.order, data.isActive ? 1 : 0, id);
        return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    }

    static delete(id) {
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        return true;
    }
}

// Modelo de Mesas
export class RestaurantTable {
    static getAll() {
        return db.prepare('SELECT * FROM restaurantTables ORDER BY number').all();
    }

    static getById(id) {
        return db.prepare('SELECT * FROM restaurantTables WHERE id = ?').get(id);
    }

    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO restaurantTables (number, name, status, capacity, currentOrderId, positionX, positionY)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            data.number,
            data.name,
            data.status || 'available',
            data.capacity,
            data.currentOrderId || null,
            data.positionX || 0,
            data.positionY || 0
        );
        return this.getById(result.lastInsertRowid);
    }

    static update(id, data) {
        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (key !== 'id' && data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });

        values.push(id);
        db.prepare(`UPDATE restaurantTables SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getById(id);
    }
}

// Modelo de Usuarios
export class User {
    static getAll() {
        return db.prepare('SELECT * FROM users WHERE isActive = 1').all();
    }

    static getById(id) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    static getByPin(pin) {
        return db.prepare('SELECT * FROM users WHERE pin = ? AND isActive = 1').get(pin);
    }

    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO users (name, pin, role, isActive, createdAt)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(data.name, data.pin, data.role, data.isActive ? 1 : 0, new Date().toISOString());
        return this.getById(result.lastInsertRowid);
    }

    static update(id, data) {
        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && data[key] !== undefined) {
                if (key === 'isActive') {
                    fields.push(`${key} = ?`);
                    values.push(data[key] ? 1 : 0);
                } else {
                    fields.push(`${key} = ?`);
                    values.push(data[key]);
                }
            }
        });

        values.push(id);
        db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getById(id);
    }
}

// Modelo de Sesiones de Caja
export class CashSession {
    static getActive() {
        return db.prepare("SELECT * FROM cashSessions WHERE status = 'open' LIMIT 1").get();
    }

    static getById(id) {
        return db.prepare('SELECT * FROM cashSessions WHERE id = ?').get(id);
    }

    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO cashSessions (userId, userName, openedAt, openingAmount, cashSales, cardSales, totalSales, ordersCount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            data.userId,
            data.userName,
            new Date().toISOString(),
            data.openingAmount,
            0, 0, 0, 0,
            'open'
        );
        return this.getById(result.lastInsertRowid);
    }

    static update(id, data) {
        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'openedAt' && data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });

        values.push(id);
        db.prepare(`UPDATE cashSessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getById(id);
    }

    static close(id, data) {
        const session = this.getById(id);
        const expectedAmount = session.openingAmount + session.cashSales;
        const difference = data.actualAmount - expectedAmount;

        db.prepare(`
            UPDATE cashSessions
            SET closedAt = ?, actualAmount = ?, expectedAmount = ?, difference = ?, notes = ?, status = 'closed'
            WHERE id = ?
        `).run(new Date().toISOString(), data.actualAmount, expectedAmount, difference, data.notes || null, id);

        return this.getById(id);
    }
}

// Modelo de Configuración
export class Config {
    static get() {
        return db.prepare('SELECT * FROM config LIMIT 1').get();
    }

    static update(data) {
        db.prepare(`
            UPDATE config
            SET businessName = ?, taxRate = ?, currency = ?, currencySymbol = ?, printReceipt = ?, soundEnabled = ?
            WHERE id = 1
        `).run(data.businessName, data.taxRate, data.currency, data.currencySymbol, data.printReceipt ? 1 : 0, data.soundEnabled ? 1 : 0);
        return this.get();
    }
}
