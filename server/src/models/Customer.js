import { db } from '../config/database.js';

export class Customer {
    static getAll() {
        const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
        return customers.map(this.parseCustomer);
    }

    static getById(id) {
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        return customer ? this.parseCustomer(customer) : null;
    }

    static getByPhone(phone) {
        const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
        return customer ? this.parseCustomer(customer) : null;
    }

    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO customers (name, phone, address, notes, createdAt)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            data.name,
            data.phone,
            data.address || '',
            data.notes || null,
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
                values.push(data[key]);
            }
        });

        values.push(id);

        const stmt = db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`);
        stmt.run(...values);

        return this.getById(id);
    }

    static delete(id) {
        db.prepare('DELETE FROM customers WHERE id = ?').run(id);
        return true;
    }

    static parseCustomer(customer) {
        return {
            ...customer,
            createdAt: new Date(customer.createdAt),
            lastOrderAt: customer.lastOrderAt ? new Date(customer.lastOrderAt) : undefined
        };
    }
}
