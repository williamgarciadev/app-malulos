import 'dotenv/config';
import { pool } from '../config/database.js';

const verifyNames = async () => {
    try {
        const result = await pool.query(`
            SELECT id, name, baseprice
            FROM products
            WHERE name LIKE '%Brisket%' OR name LIKE '%Mixto%' OR name LIKE '%Pollo%'
            ORDER BY id
            LIMIT 15
        `);

        console.log('\n📊 Productos en la BD:\n');
        console.log('ID | Nombre | Precio');
        console.log('---+--------+-------');
        result.rows.forEach(row => {
            console.log(`${row.id} | ${row.name} | $${row.baseprice}`);
        });
        console.log('\n');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
};

verifyNames();
