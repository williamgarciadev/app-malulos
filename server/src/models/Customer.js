import { pool } from '../config/database.js';

export class Customer {
    static async getAll() {
        const res = await pool.query('SELECT * FROM customers ORDER BY name ASC');
        return res.rows;
    }

    static async getById(id) {
        const res = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
        return res.rows[0];
    }

    static async getByPhone(phone) {
        const res = await pool.query('SELECT * FROM customers WHERE phone = $1', [phone]);
        return res.rows[0];
    }

    static async getByTelegramId(telegramId) {
        const res = await pool.query('SELECT * FROM customers WHERE telegramId = $1', [telegramId]);
        return res.rows[0];
    }

    static async create(data) {
        const res = await pool.query(`
            INSERT INTO customers (name, phone, address, notes, telegramId)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            data.name,
            data.phone,
            data.address || '',
            data.notes || null,
            data.telegramId || null
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
                values.push(data[key]);
                i++;
            }
        });

        values.push(id);
        const res = await pool.query(`UPDATE customers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
        return res.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM customers WHERE id = $1', [id]);
        return true;
    }
}