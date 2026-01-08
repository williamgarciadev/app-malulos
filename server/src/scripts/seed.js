import 'dotenv/config';
import { pool } from '../config/database.js';

console.log('🌱 Iniciando proceso de seed...\n');

const seedDatabase = async () => {
    try {
        // Verificar si ya hay datos
        const categoriesCheck = await pool.query('SELECT COUNT(*) FROM categories');
        if (parseInt(categoriesCheck.rows[0].count) > 0) {
            console.log('ℹ️  La base de datos ya contiene datos. Saltando seed.');
            return;
        }

        console.log('📦 Insertando categorías...');
        const categoryInserts = [
            ['Hamburguesas', '🍔', 1, 1],
            ['Papas', '🍟', 2, 1],
            ['Bebidas', '🥤', 3, 1],
            ['Perros Calientes', '🌭', 4, 1],
            ['Postres', '🍦', 5, 1],
            ['Combos', '🍱', 6, 1]
        ];

        const categoryIds = [];
        for (const cat of categoryInserts) {
            const result = await pool.query(
                'INSERT INTO categories (name, icon, "order", isActive) VALUES ($1, $2, $3, $4) RETURNING id',
                cat
            );
            categoryIds.push(result.rows[0].id);
        }
        console.log(`✅ ${categoryIds.length} categorías insertadas`);

        console.log('📦 Insertando productos...');

        // Hamburguesa Clásica
        await pool.query(`
            INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            categoryIds[0], // Hamburguesas
            'Hamburguesa Clásica',
            'Carne 150g, queso, lechuga, tomate',
            15000,
            JSON.stringify([
                { name: 'Sencilla', priceModifier: 0 },
                { name: 'Doble', priceModifier: 5000 }
            ]),
            JSON.stringify([
                {
                    name: 'Adiciones',
                    minSelect: 0,
                    maxSelect: 3,
                    modifiers: [
                        { id: '1', name: 'Tocineta', priceModifier: 3000, isDefault: false },
                        { id: '2', name: 'Huevo', priceModifier: 2000, isDefault: false },
                        { id: '3', name: 'Pepinillos', priceModifier: 1000, isDefault: false }
                    ]
                }
            ]),
            0,
            JSON.stringify([]),
            1
        ]);

        // Papas Francesas
        await pool.query(`
            INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            categoryIds[1], // Papas
            'Papas Francesas',
            'Papas fritas crocantes',
            8000,
            JSON.stringify([
                { name: 'Medianas', priceModifier: 0 },
                { name: 'Grandes', priceModifier: 3000 }
            ]),
            JSON.stringify([]),
            0,
            JSON.stringify([]),
            1
        ]);

        // Coca-Cola
        await pool.query(`
            INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            categoryIds[2], // Bebidas
            'Coca-Cola',
            '350ml fría',
            5000,
            JSON.stringify([]),
            JSON.stringify([]),
            0,
            JSON.stringify([]),
            1
        ]);

        // Combo Clásico
        await pool.query(`
            INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            categoryIds[5], // Combos
            'Combo Clásico',
            'Hamburguesa + Papas + Bebida',
            22000,
            JSON.stringify([]),
            JSON.stringify([]),
            1,
            JSON.stringify([
                { categoryId: categoryIds[0], name: 'Hamburguesa', required: true },
                { categoryId: categoryIds[1], name: 'Acompañamiento', required: true },
                { categoryId: categoryIds[2], name: 'Bebida', required: true }
            ]),
            1
        ]);
        console.log('✅ 4 productos insertados');

        console.log('📦 Insertando mesas...');
        for (let i = 1; i <= 6; i++) {
            const capacity = i === 4 ? 6 : (i === 3 ? 2 : 4);
            const x = (i - 1) % 3;
            const y = Math.floor((i - 1) / 3);
            await pool.query(
                'INSERT INTO restaurantTables (number, name, status, capacity, positionX, positionY) VALUES ($1, $2, $3, $4, $5, $6)',
                [i, `Mesa ${i}`, 'available', capacity, x, y]
            );
        }
        console.log('✅ 6 mesas insertadas');

        console.log('📦 Verificando configuración...');
        const configCheck = await pool.query('SELECT COUNT(*) FROM config');
        if (parseInt(configCheck.rows[0].count) === 0) {
            await pool.query(
                'INSERT INTO config (businessName, taxRate, currency, currencySymbol, printReceipt, soundEnabled) VALUES ($1, $2, $3, $4, $5, $6)',
                ['Malulos', 0, 'COP', '$', 0, 1]
            );
            console.log('✅ Configuración insertada');
        } else {
            console.log('ℹ️  Configuración ya existe');
        }

        console.log('📦 Insertando usuarios...');

        // Usar ON CONFLICT para evitar duplicados
        const users = [
            ['Admin', '1234', 'admin', 1],
            ['Cajero', '2222', 'cashier', 1],
            ['Mesero', '3333', 'waiter', 1]
        ];

        let insertedCount = 0;
        for (const user of users) {
            const result = await pool.query(
                'INSERT INTO users (name, pin, role, isActive) VALUES ($1, $2, $3, $4) ON CONFLICT (pin) DO NOTHING',
                user
            );
            if (result.rowCount > 0) insertedCount++;
        }

        if (insertedCount > 0) {
            console.log(`✅ ${insertedCount} usuarios insertados`);
        } else {
            console.log('ℹ️  Usuarios ya existían en la base de datos');
        }

        console.log('\n🎉 Seed completado exitosamente!');
        console.log('\n📋 Usuarios disponibles:');
        console.log('   - Admin: PIN 1234 (acceso total)');
        console.log('   - Cajero: PIN 2222 (operaciones de caja)');
        console.log('   - Mesero: PIN 3333 (solo tomar pedidos)');

    } catch (error) {
        console.error('❌ Error durante el seed:', error);
        throw error;
    } finally {
        await pool.end();
    }
};

seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
