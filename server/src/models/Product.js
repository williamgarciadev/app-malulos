import { db } from '../config/database.js';

export class Product {
    static getAll() {
        const products = db.prepare('SELECT * FROM products WHERE isActive = 1').all();
        return products.map(this.parseProduct);
    }

    static getById(id) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        return product ? this.parseProduct(product) : null;
    }

    static getByCategory(categoryId) {
        const products = db.prepare('SELECT * FROM products WHERE categoryId = ? AND isActive = 1').all(categoryId);
        return products.map(this.parseProduct);
    }

    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            data.categoryId,
            data.name,
            data.description,
            data.basePrice,
            JSON.stringify(data.sizes || []),
            JSON.stringify(data.modifierGroups || []),
            data.isCombo ? 1 : 0,
            JSON.stringify(data.comboItems || []),
            data.isActive ? 1 : 0,
            new Date().toISOString()
        );

        return this.getById(result.lastInsertRowid);
    }

    static update(id, data) {
        const stmt = db.prepare(`
            UPDATE products
            SET categoryId = ?, name = ?, description = ?, basePrice = ?,
                sizes = ?, modifierGroups = ?, isCombo = ?, comboItems = ?, isActive = ?
            WHERE id = ?
        `);

        stmt.run(
            data.categoryId,
            data.name,
            data.description,
            data.basePrice,
            JSON.stringify(data.sizes || []),
            JSON.stringify(data.modifierGroups || []),
            data.isCombo ? 1 : 0,
            JSON.stringify(data.comboItems || []),
            data.isActive ? 1 : 0,
            id
        );

        return this.getById(id);
    }

    static delete(id) {
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        return true;
    }

    // Helper para parsear JSON fields
    static parseProduct(product) {
        return {
            ...product,
            sizes: JSON.parse(product.sizes || '[]'),
            modifierGroups: JSON.parse(product.modifierGroups || '[]'),
            comboItems: JSON.parse(product.comboItems || '[]'),
            isCombo: Boolean(product.isCombo),
            isActive: Boolean(product.isActive),
            createdAt: new Date(product.createdAt)
        };
    }
}
