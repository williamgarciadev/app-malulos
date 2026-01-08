import { pool } from '../config/database.js';
import { Customer } from './Customer.js';

// Modelo de Categorías
export class Category {
    static async getAll() {
        const res = await pool.query(`
            SELECT
                id,
                name,
                icon,
                "order" AS "order",
                isActive AS "isActive"
            FROM categories
            WHERE isActive = 1
            ORDER BY "order"
        `);
        return res.rows;
    }

    static async create(data) {
        const res = await pool.query(
            'INSERT INTO categories (name, icon, "order", isActive) VALUES ($1, $2, $3, $4) RETURNING *',
            [data.name, data.icon, data.order, data.isActive ? 1 : 0]
        );
        return res.rows[0];
    }

    static async update(id, data) {
        const res = await pool.query(
            'UPDATE categories SET name = $1, icon = $2, "order" = $3, isActive = $4 WHERE id = $5 RETURNING *',
            [data.name, data.icon, data.order, data.isActive ? 1 : 0, id]
        );
        return res.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM categories WHERE id = $1', [id]);
        return true;
    }
}

// Modelo de Mesas
export class RestaurantTable {
    static async getAll() {
        const res = await pool.query(`
            SELECT
                id,
                number,
                name,
                status,
                capacity,
                currentOrderId AS "currentOrderId",
                positionX AS "positionX",
                positionY AS "positionY"
            FROM restaurantTables
            ORDER BY number
        `);
        return res.rows;
    }

    static async getById(id) {
        const res = await pool.query(`
            SELECT
                id,
                number,
                name,
                status,
                capacity,
                currentOrderId AS "currentOrderId",
                positionX AS "positionX",
                positionY AS "positionY"
            FROM restaurantTables
            WHERE id = $1
        `, [id]);
        return res.rows[0];
    }

    static async create(data) {
        const res = await pool.query(`
            INSERT INTO restaurantTables (number, name, status, capacity, currentOrderId, positionX, positionY)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [
            data.number,
            data.name,
            data.status || 'available',
            data.capacity,
            data.currentOrderId || null,
            data.positionX || 0,
            data.positionY || 0
        ]);
        return res.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        Object.keys(data).forEach(key => {
            if (key !== 'id' && data[key] !== undefined) {
                fields.push(`${key} = $${i}`);
                values.push(data[key]);
                i++;
            }
        });

        values.push(id);
        const res = await pool.query(`UPDATE restaurantTables SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
        return res.rows[0];
    }
}

// Modelo de Usuarios
export class User {
    static async getAll() {
        const res = await pool.query(`
            SELECT
                id,
                name,
                pin,
                role,
                isActive AS "isActive",
                createdAt AS "createdAt"
            FROM users
            WHERE isActive = 1
        `);
        return res.rows;
    }

    static async getById(id) {
        const res = await pool.query(`
            SELECT
                id,
                name,
                pin,
                role,
                isActive AS "isActive",
                createdAt AS "createdAt"
            FROM users
            WHERE id = $1
        `, [id]);
        return res.rows[0];
    }

    static async getByPin(pin) {
        const res = await pool.query(`
            SELECT
                id,
                name,
                pin,
                role,
                isActive AS "isActive",
                createdAt AS "createdAt"
            FROM users
            WHERE pin = $1 AND isActive = 1
        `, [pin]);
        return res.rows[0];
    }

    static async create(data) {
        const res = await pool.query(`
            INSERT INTO users (name, pin, role, isactive)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [data.name, data.pin, data.role, data.isActive ? 1 : 0]);
        return res.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && data[key] !== undefined) {
                // Convertir isActive a isactive para PostgreSQL
                const colName = key === 'isActive' ? 'isactive' : key;
                fields.push(`${colName} = $${i}`);
                if (key === 'isActive') values.push(data[key] ? 1 : 0);
                else values.push(data[key]);
                i++;
            }
        });

        values.push(id);
        const res = await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
        return res.rows[0];
    }
}

// Modelo de Sesiones de Caja
export class CashSession {
    static async getActive() {
        const res = await pool.query(`
            SELECT
                id,
                userId AS "userId",
                userName AS "userName",
                openedAt AS "openedAt",
                closedAt AS "closedAt",
                openingAmount AS "openingAmount",
                expectedAmount AS "expectedAmount",
                actualAmount AS "actualAmount",
                difference,
                cashSales AS "cashSales",
                cardSales AS "cardSales",
                transferSales AS "transferSales",
                nequiSales AS "nequiSales",
                davipplataSales AS "davipplataSales",
                totalSales AS "totalSales",
                ordersCount AS "ordersCount",
                notes,
                status
            FROM cashSessions
            WHERE status = 'open'
            LIMIT 1
        `);
        return res.rows[0];
    }

    static async getById(id) {
        const res = await pool.query(`
            SELECT
                id,
                userId AS "userId",
                userName AS "userName",
                openedAt AS "openedAt",
                closedAt AS "closedAt",
                openingAmount AS "openingAmount",
                expectedAmount AS "expectedAmount",
                actualAmount AS "actualAmount",
                difference,
                cashSales AS "cashSales",
                cardSales AS "cardSales",
                transferSales AS "transferSales",
                nequiSales AS "nequiSales",
                davipplataSales AS "davipplataSales",
                totalSales AS "totalSales",
                ordersCount AS "ordersCount",
                notes,
                status
            FROM cashSessions
            WHERE id = $1
        `, [id]);
        return res.rows[0];
    }

    static async create(data) {
        const res = await pool.query(`
            INSERT INTO cashSessions (userId, userName, openingAmount, cashSales, cardSales, transferSales, nequiSales, davipplataSales, totalSales, ordersCount, status)
            VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0, 'open') RETURNING *
        `, [data.userId, data.userName, data.openingAmount]);
        return res.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'openedAt' && data[key] !== undefined) {
                fields.push(`${key} = $${i}`);
                values.push(data[key]);
                i++;
            }
        });

        values.push(id);
        const res = await pool.query(`UPDATE cashSessions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
        return res.rows[0];
    }

    static async close(id, data) {
        const session = await this.getById(id);
        const expectedAmount = session.openingAmount + session.cashSales;
        const difference = data.actualAmount - expectedAmount;

        const res = await pool.query(`
            UPDATE cashSessions
            SET closedAt = CURRENT_TIMESTAMP, actualAmount = $1, expectedAmount = $2, difference = $3, notes = $4, status = 'closed'
            WHERE id = $5 RETURNING *
        `, [data.actualAmount, expectedAmount, difference, data.notes || null, id]);

        return res.rows[0];
    }
}

// Modelo de Configuración
export class Config {
    static async get() {
        const res = await pool.query('SELECT * FROM config LIMIT 1');
        return res.rows[0];
    }

    static async update(data) {
        await pool.query(`
            UPDATE config
            SET businessName = $1, taxRate = $2, currency = $3, currencySymbol = $4, printReceipt = $5, soundEnabled = $6
            WHERE id = 1
        `, [data.businessName, data.taxRate, data.currency, data.currencySymbol, data.printReceipt ? 1 : 0, data.soundEnabled ? 1 : 0]);
                return this.get();
            }
        }
        
        export {
            Customer
        };
        