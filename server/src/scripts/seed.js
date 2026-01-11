import 'dotenv/config';
import { pool } from '../config/database.js';

console.log('🌱 Iniciando proceso de seed - Menú Malulos Ahumados...\n');

// ============================================
// FUNCIONES HELPER PARA MODIFICADORES COMUNES
// ============================================

const adicionalesPremium = () => ([
    {
        name: 'Adicionales Premium',
        minSelect: 0,
        maxSelect: 3,
        modifiers: [
            { id: 'tocineta', name: 'Tocineta', priceModifier: 3000, isDefault: false },
            { id: 'huevos', name: '2 Huevos de codorniz', priceModifier: 1000, isDefault: false },
            { id: 'queso', name: 'Queso', priceModifier: 2000, isDefault: false }
        ]
    }
]);

const adicionalesPremiumSinHuevos = () => ([
    {
        name: 'Adicionales Premium',
        minSelect: 0,
        maxSelect: 2,
        modifiers: [
            { id: 'tocineta', name: 'Tocineta', priceModifier: 3000, isDefault: false },
            { id: 'queso', name: 'Queso', priceModifier: 2000, isDefault: false }
        ]
    }
]);

const carneExtra100g = () => ([
    {
        name: 'Carne Extra 100g',
        minSelect: 0,
        maxSelect: 1,
        modifiers: [
            { id: 'brisket_100g', name: 'Brisket 100g', priceModifier: 12000, isDefault: false },
            { id: 'pulled_pork_100g', name: 'Pulled pork 100g', priceModifier: 10000, isDefault: false },
            { id: 'pollo_100g', name: 'Pollo 100g', priceModifier: 7000, isDefault: false }
        ]
    }
]);

// ============================================
// SEED PRINCIPAL
// ============================================

const seedDatabase = async () => {
    try {
        // Verificar si ya hay datos
        const categoriesCheck = await pool.query('SELECT COUNT(*) FROM categories');
        if (parseInt(categoriesCheck.rows[0].count) > 0) {
            console.log('ℹ️  La base de datos ya contiene datos. Saltando seed.');
            return;
        }

        // ==========================================
        // 1. INSERTAR CATEGORÍAS (8 categorías)
        // ==========================================
        console.log('📦 Insertando categorías...');
        const categoryInserts = [
            ['Chuzo Pan', '🥖', 1, 1],
            ['Hamburguesas', '🍔', 2, 1],
            ['Arepa', '🫓', 3, 1],
            ['Tacos', '🌮', 4, 1],
            ['Burritos', '🌯', 5, 1],
            ['Perrullos', '🌭', 6, 1],
            ['Adicionales', '➕', 7, 1],
            ['Bebidas', '🥤', 8, 1]
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

        // ==========================================
        // 2. INSERTAR PRODUCTOS
        // ==========================================
        console.log('📦 Insertando productos...');

        let productCount = 0;

        // ----- CATEGORÍA 1: CHUZO PAN (4 productos) -----
        const chuzoPanProducts = [
            {
                name: 'Chuzo Pan Pulled Pork',
                description: 'Pan artesanal tipo brioche con 110g de carne de cerdo ahumada, tocineta y salsa especial',
                basePrice: 19000
            },
            {
                name: 'Chuzo Pan Brisket',
                description: 'Pan artesanal tipo brioche con 110g de carne de res ahumada, tocineta y salsa especial',
                basePrice: 20000
            },
            {
                name: 'Chuzo Pan Mixto',
                description: 'Pan artesanal tipo brioche con 110g de carne mixta (res + cerdo) ahumada, tocineta y salsa especial',
                basePrice: 21000
            },
            {
                name: 'Chuzo Pan Pollo Mechado',
                description: 'Pan artesanal tipo brioche con 110g de pollo mechado ahumado, tocineta y salsa especial',
                basePrice: 18000
            }
        ];

        for (const product of chuzoPanProducts) {
            await pool.query(`
                INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                categoryIds[0],
                product.name,
                product.description,
                product.basePrice,
                JSON.stringify([]),
                JSON.stringify(adicionalesPremium()),
                0,
                JSON.stringify([]),
                1
            ]);
            productCount++;
        }

        // ----- CATEGORÍA 2: HAMBURGUESAS (5 productos) -----
        const hamburguesasProducts = [
            {
                name: 'Hamburguesa Pollo Mechado',
                description: '150g de pollo mechado ahumado, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 18000
            },
            {
                name: 'Hamburguesa Pulled Pork',
                description: '150g de cerdo ahumado, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 22000
            },
            {
                name: 'Hamburguesa Brisket',
                description: '150g de res ahumada, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 24000
            },
            {
                name: 'Hamburguesa Mixta',
                description: '150g de carne mixta (res + cerdo) ahumada, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 26000
            },
            {
                name: 'Hamburguesa Triple X',
                description: '150g de tres carnes (res, cerdo y pollo) ahumadas, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 30000
            }
        ];

        for (const product of hamburguesasProducts) {
            await pool.query(`
                INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                categoryIds[1],
                product.name,
                product.description,
                product.basePrice,
                JSON.stringify([]),
                JSON.stringify([...adicionalesPremium(), ...carneExtra100g()]),
                0,
                JSON.stringify([]),
                1
            ]);
            productCount++;
        }

        // ----- CATEGORÍA 3: AREPA (4 productos) -----
        const arepaProducts = [
            {
                name: 'Arepa Pollo',
                description: 'Arepa con pollo mechado ahumado',
                basePrice: 8000
            },
            {
                name: 'Arepa Brisket',
                description: 'Arepa con res ahumada',
                basePrice: 10000
            },
            {
                name: 'Arepa Pulled Pork',
                description: 'Arepa con cerdo ahumado',
                basePrice: 8000
            },
            {
                name: 'Arepa Mixta',
                description: 'Arepa con carne mixta (res + cerdo) ahumada',
                basePrice: 12000
            }
        ];

        for (const product of arepaProducts) {
            await pool.query(`
                INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                categoryIds[2],
                product.name,
                product.description,
                product.basePrice,
                JSON.stringify([]),
                JSON.stringify(adicionalesPremiumSinHuevos()),
                0,
                JSON.stringify([]),
                1
            ]);
            productCount++;
        }

        // ----- CATEGORÍA 4: TACOS (6 productos - individual + paquetes) -----
        const tacosProducts = [
            {
                name: 'Taco Brisket',
                description: 'Tortilla de finas hierbas, tomate, cebolla, queso mozarella, tocineta, 50gr de res ahumada y salsas de la casa',
                basePrice: 11000
            },
            {
                name: 'Paquete 3 Tacos Brisket',
                description: '3 tacos de res ahumada. Tortilla de finas hierbas, tomate, cebolla, queso mozarella, tocineta y salsas',
                basePrice: 30000
            },
            {
                name: 'Taco Pulled Pork',
                description: 'Tortilla de finas hierbas, tomate, cebolla, queso mozarella, tocineta, 50gr de cerdo ahumado y salsas de la casa',
                basePrice: 9000
            },
            {
                name: 'Paquete 3 Tacos Pulled Pork',
                description: '3 tacos de cerdo ahumado. Tortilla de finas hierbas, tomate, cebolla, queso mozarella, tocineta y salsas',
                basePrice: 25000
            },
            {
                name: 'Taco Mixto',
                description: 'Tortilla de finas hierbas, tomate, cebolla, queso mozarella, tocineta, 50gr de carne mixta (res + cerdo) y salsas',
                basePrice: 12000
            },
            {
                name: 'Paquete 3 Tacos Mixtos',
                description: '3 tacos de carne mixta. Tortilla de finas hierbas, tomate, cebolla, queso mozarella, tocineta y salsas',
                basePrice: 34000
            }
        ];

        for (const product of tacosProducts) {
            await pool.query(`
                INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                categoryIds[3],
                product.name,
                product.description,
                product.basePrice,
                JSON.stringify([]),
                JSON.stringify([]), // Sin modificadores
                0,
                JSON.stringify([]),
                1
            ]);
            productCount++;
        }

        // ----- CATEGORÍA 5: BURRITOS (4 productos) -----
        const burritosProducts = [
            {
                name: 'Burrito Brisket',
                description: '100g de res ahumada, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 18000
            },
            {
                name: 'Burrito Pulled Pork',
                description: '100g de cerdo ahumado, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 16000
            },
            {
                name: 'Burrito Mixto',
                description: '100g de carne mixta (res + cerdo) ahumada, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 20000
            },
            {
                name: 'Burrito Pollo Mechado',
                description: '100g de pollo mechado ahumado, queso mozarella, tocineta, vegetales y salsas de la casa',
                basePrice: 16000
            }
        ];

        for (const product of burritosProducts) {
            await pool.query(`
                INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                categoryIds[4],
                product.name,
                product.description,
                product.basePrice,
                JSON.stringify([]),
                JSON.stringify([...adicionalesPremiumSinHuevos(), ...carneExtra100g()]),
                0,
                JSON.stringify([]),
                1
            ]);
            productCount++;
        }

        // ----- CATEGORÍA 6: PERRULLOS (5 productos) -----
        const perrullosProducts = [
            {
                name: 'Perrullo Brisket',
                description: 'Pan brioche, salchicha ahumada, 40g de res ahumada, queso mozarella, tocineta y salsas de la casa',
                basePrice: 16000
            },
            {
                name: 'Perrullo Pulled Pork',
                description: 'Pan brioche, salchicha ahumada, 40g de cerdo ahumado, queso mozarella, tocineta y salsas de la casa',
                basePrice: 14000
            },
            {
                name: 'Perrullo Sencillo',
                description: 'Pan brioche con salchicha ahumada y salsas de la casa',
                basePrice: 10000
            },
            {
                name: 'Perrullo Pollo Mechado',
                description: 'Pan brioche, salchicha ahumada, 40g de pollo mechado, queso mozarella, tocineta y salsas de la casa',
                basePrice: 14000
            },
            {
                name: 'Perrullo Mixto',
                description: 'Pan brioche, salchicha ahumada, 40g de carne mixta (res + cerdo), queso mozarella, tocineta y salsas',
                basePrice: 18000
            }
        ];

        for (const product of perrullosProducts) {
            await pool.query(`
                INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                categoryIds[5],
                product.name,
                product.description,
                product.basePrice,
                JSON.stringify([]),
                JSON.stringify(adicionalesPremiumSinHuevos()),
                0,
                JSON.stringify([]),
                1
            ]);
            productCount++;
        }

        // ----- CATEGORÍA 7: ADICIONALES (10 productos) -----
        const adicionalesProducts = [
            { name: 'Tocineta', description: 'Tocineta ahumada', basePrice: 3000 },
            { name: '2 Huevos de Codorniz', description: '2 huevos de codorniz', basePrice: 1000 },
            { name: 'Queso', description: 'Porción de queso mozarella', basePrice: 2000 },
            { name: 'Brisket 100g', description: '100g de res ahumada', basePrice: 12000 },
            { name: 'Pulled Pork 100g', description: '100g de cerdo ahumado', basePrice: 10000 },
            { name: 'Pollo 100g', description: '100g de pollo mechado ahumado', basePrice: 7000 },
            { name: 'Papas Fritas', description: 'Porción de papas fritas', basePrice: 4000 },
            { name: 'Salchicha Ahumada', description: 'Salchicha ahumada individual', basePrice: 5000 },
            { name: 'Combo Papas y Gaseosa', description: 'Papas fritas + gaseosa', basePrice: 7000 },
            { name: 'Ensalada', description: 'Ensalada de tomate, cebolla y lechuga', basePrice: 3000 }
        ];

        for (const product of adicionalesProducts) {
            await pool.query(`
                INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                categoryIds[6],
                product.name,
                product.description,
                product.basePrice,
                JSON.stringify([]),
                JSON.stringify([]), // Sin modificadores
                0,
                JSON.stringify([]),
                1
            ]);
            productCount++;
        }

        // ----- CATEGORÍA 8: BEBIDAS (4 productos) -----
        const bebidasProducts = [
            { name: 'Coca Cola Pet 400ml', description: 'Coca Cola 400ml', basePrice: 4000 },
            { name: 'Jugo Hit 1.5L', description: 'Jugo Hit 1.5 litros', basePrice: 6000 },
            { name: 'Coca Cola 2L', description: 'Coca Cola 2 litros', basePrice: 8000 },
            { name: 'Coca Cola 1.5L', description: 'Coca Cola 1.5 litros', basePrice: 7000 }
        ];

        for (const product of bebidasProducts) {
            await pool.query(`
                INSERT INTO products (categoryId, name, description, basePrice, sizes, modifierGroups, isCombo, comboItems, isActive)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                categoryIds[7],
                product.name,
                product.description,
                product.basePrice,
                JSON.stringify([]),
                JSON.stringify([]), // Sin modificadores
                0,
                JSON.stringify([]),
                1
            ]);
            productCount++;
        }

        console.log(`✅ ${productCount} productos insertados`);

        // ==========================================
        // 3. INSERTAR MESAS
        // ==========================================
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

        // ==========================================
        // 4. VERIFICAR/INSERTAR CONFIGURACIÓN
        // ==========================================
        console.log('📦 Verificando configuración...');
        const configCheck = await pool.query('SELECT COUNT(*) FROM config');
        if (parseInt(configCheck.rows[0].count) === 0) {
            await pool.query(
                'INSERT INTO config (businessName, taxRate, currency, currencySymbol, printReceipt, soundEnabled) VALUES ($1, $2, $3, $4, $5, $6)',
                ['Malulos Ahumados', 0, 'USD', '$', 0, 1]
            );
            console.log('✅ Configuración insertada');
        } else {
            console.log('ℹ️  Configuración ya existe');
        }

        // ==========================================
        // 5. INSERTAR USUARIOS
        // ==========================================
        console.log('📦 Insertando usuarios...');

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

        // ==========================================
        // RESUMEN FINAL
        // ==========================================
        console.log('\n🎉 Seed completado exitosamente!');
        console.log('\n📊 Resumen:');
        console.log(`   - ${categoryIds.length} categorías creadas`);
        console.log(`   - ${productCount} productos creados`);
        console.log('   - 6 mesas configuradas');
        console.log('   - Configuración inicial creada');
        console.log(`   - ${insertedCount} usuarios creados`);
        console.log('\n📋 Usuarios disponibles:');
        console.log('   - Admin: PIN 1234 (acceso total)');
        console.log('   - Cajero: PIN 2222 (operaciones de caja)');
        console.log('   - Mesero: PIN 3333 (solo tomar pedidos)');
        console.log('\n🍔 Menú Malulos Ahumados cargado correctamente!');

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
