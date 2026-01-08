import 'dotenv/config';
import { pool } from '../config/database.js';

console.log('🔍 Verificando datos en la base de datos...\n');

const checkData = async () => {
    try {
        // Verificar mesas
        const tables = await pool.query('SELECT * FROM restaurantTables ORDER BY number');
        console.log('📋 MESAS:');
        console.log(`   Total: ${tables.rows.length} mesas`);
        if (tables.rows.length > 0) {
            tables.rows.forEach(t => {
                console.log(`   - ${t.name}: ${t.status} (capacidad: ${t.capacity})`);
            });
        } else {
            console.log('   ⚠️  No hay mesas en la base de datos');
        }
        console.log('');

        // Verificar categorías
        const categories = await pool.query('SELECT * FROM categories ORDER BY "order"');
        console.log('📦 CATEGORÍAS:');
        console.log(`   Total: ${categories.rows.length} categorías`);
        if (categories.rows.length > 0) {
            categories.rows.forEach(c => {
                console.log(`   - ${c.icon} ${c.name}`);
            });
        } else {
            console.log('   ⚠️  No hay categorías en la base de datos');
        }
        console.log('');

        // Verificar productos
        const products = await pool.query('SELECT * FROM products');
        console.log('🍔 PRODUCTOS:');
        console.log(`   Total: ${products.rows.length} productos`);
        if (products.rows.length > 0) {
            products.rows.forEach(p => {
                console.log(`   - ${p.name} ($${p.baseprice})`);
            });
        } else {
            console.log('   ⚠️  No hay productos en la base de datos');
        }
        console.log('');

        // Verificar usuarios
        const users = await pool.query('SELECT * FROM users');
        console.log('👥 USUARIOS:');
        console.log(`   Total: ${users.rows.length} usuarios`);
        if (users.rows.length > 0) {
            users.rows.forEach(u => {
                console.log(`   - ${u.name} (PIN: ${u.pin}, Rol: ${u.role})`);
            });
        } else {
            console.log('   ⚠️  No hay usuarios en la base de datos');
        }
        console.log('');

        // Verificar configuración
        const config = await pool.query('SELECT * FROM config LIMIT 1');
        console.log('⚙️  CONFIGURACIÓN:');
        if (config.rows.length > 0) {
            console.log(`   - Negocio: ${config.rows[0].businessname}`);
            console.log(`   - Moneda: ${config.rows[0].currencysymbol} (${config.rows[0].currency})`);
        } else {
            console.log('   ⚠️  No hay configuración en la base de datos');
        }

        console.log('\n✅ Verificación completada');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        await pool.end();
    }
};

checkData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
