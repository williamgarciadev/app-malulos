import { pool } from '../config/database.js';

export class Product {
    static async getAll() {
        const res = await pool.query(`
            SELECT
                id,
                categoryId AS "categoryId",
                name,
                description,
                basePrice AS "basePrice",
                image,
                sizes,
                modifierGroups AS "modifierGroups",
                isCombo AS "isCombo",
                comboItems AS "comboItems",
                isActive AS "isActive",
                createdAt AS "createdAt"
            FROM products
            WHERE isActive = 1
            ORDER BY name ASC
        `);
        return res.rows;
    }

    static async getById(id) {
        const res = await pool.query(`
            SELECT
                id,
                categoryId AS "categoryId",
                name,
                description,
                basePrice AS "basePrice",
                image,
                sizes,
                modifierGroups AS "modifierGroups",
                isCombo AS "isCombo",
                comboItems AS "comboItems",
                isActive AS "isActive",
                createdAt AS "createdAt"
            FROM products
            WHERE id = $1
        `, [id]);
        return res.rows[0];
    }

    static async getByCategory(categoryId) {
        const res = await pool.query(`
            SELECT
                id,
                categoryId AS "categoryId",
                name,
                description,
                basePrice AS "basePrice",
                image,
                sizes,
                modifierGroups AS "modifierGroups",
                isCombo AS "isCombo",
                comboItems AS "comboItems",
                isActive AS "isActive",
                createdAt AS "createdAt"
            FROM products
            WHERE categoryId = $1 AND isActive = 1
        `, [categoryId]);
        return res.rows;
    }

    static async create(data) {
        const res = await pool.query(`
            INSERT INTO products (
                categoryId, name, description, basePrice, image,
                sizes, modifierGroups, isCombo, comboItems, isActive
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING
                id,
                categoryId AS "categoryId",
                name,
                description,
                basePrice AS "basePrice",
                image,
                sizes,
                modifierGroups AS "modifierGroups",
                isCombo AS "isCombo",
                comboItems AS "comboItems",
                isActive AS "isActive",
                createdAt AS "createdAt"
        `, [
            data.categoryId,
            data.name,
            data.description,
            data.basePrice,
            data.image || null,
            JSON.stringify(data.sizes || []),
            JSON.stringify(data.modifierGroups || []),
            data.isCombo ? 1 : 0,
            JSON.stringify(data.comboItems || []),
            data.isActive ? 1 : 0
        ]);
        return res.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && data[key] !== undefined) {
                fields.push(`${key} = $${i}`);
                if (['sizes', 'modifierGroups', 'comboItems'].includes(key)) {
                    values.push(JSON.stringify(data[key]));
                } else if (key === 'isActive' || key === 'isCombo') {
                    values.push(data[key] ? 1 : 0);
                } else {
                    values.push(data[key]);
                }
                i++;
            }
        });

        values.push(id);
        const res = await pool.query(`
            UPDATE products SET ${fields.join(', ')}
            WHERE id = $${i}
            RETURNING
                id,
                categoryId AS "categoryId",
                name,
                description,
                basePrice AS "basePrice",
                image,
                sizes,
                modifierGroups AS "modifierGroups",
                isCombo AS "isCombo",
                comboItems AS "comboItems",
                isActive AS "isActive",
                createdAt AS "createdAt"
        `, values);
        return res.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        return true;
    }
}