import 'dotenv/config';
import { pool } from '../config/database.js';

const addDeliveryUser = async () => {
    try {
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

addDeliveryUser();
