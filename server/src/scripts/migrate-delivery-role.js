import 'dotenv/config';
import { pool } from '../config/database.js';

const updateRoleConstraint = async () => {
    try {
        console.log('?? Actualizando constraint de roles...');

        // 1. Eliminar constraint actual
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');

        // 2. Agregar nuevo constraint incluyendo 'delivery'
        await pool.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'cashier', 'waiter', 'delivery'))");

        console.log('? Constraint actualizado.');

        // 3. Ahora si crear el usuario
        console.log('?? Creando usuario Repartidor...');
        const res = await pool.query(
            "INSERT INTO users (name, pin, role, isActive) VALUES ($1, $2, $3, $4) ON CONFLICT (pin) DO NOTHING RETURNING id",
            ['Repartidor', '4444', 'delivery', 1]
        );

        if (res.rowCount > 0) {
            console.log('? Usuario Repartidor creado con exito (PIN: 4444).');
        } else {
            console.log('??  El usuario Repartidor ya existe.');
        }

    } catch (error) {
        console.error('? Error:', error);
    } finally {
        await pool.end();
    }
};

updateRoleConstraint();
