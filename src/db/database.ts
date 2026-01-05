import Dexie, { type EntityTable } from 'dexie'
import type {
    Category,
    Product,
    RestaurantTable,
    Order,
    Customer,
    CashRegister,
    AppConfig
} from '@/types'

// Definición de la base de datos
class MalulosDatabase extends Dexie {
    categories!: EntityTable<Category, 'id'>
    products!: EntityTable<Product, 'id'>
    restaurantTables!: EntityTable<RestaurantTable, 'id'>
    orders!: EntityTable<Order, 'id'>
    customers!: EntityTable<Customer, 'id'>
    cashRegisters!: EntityTable<CashRegister, 'id'>
    config!: EntityTable<AppConfig, 'id'>

    constructor() {
        super('MalulosDB')

        // Version 2: Renombrado de tabla 'tables' a 'restaurantTables'
        this.version(2).stores({
            categories: '++id, name, order, isActive',
            products: '++id, categoryId, name, isCombo, isActive, createdAt',
            restaurantTables: '++id, number, status, currentOrderId',
            orders: '++id, orderNumber, type, tableId, status, paymentStatus, createdAt',
            customers: '++id, name, phone, createdAt',
            cashRegisters: '++id, openedAt, closedAt',
            config: '++id',
            // Eliminar tabla antigua
            tables: null
        })
    }
}

// Instancia única de la base de datos
export const db = new MalulosDatabase()

// Datos iniciales
export async function seedDatabase(): Promise<void> {
    const categoriesCount = await db.categories.count()

    if (categoriesCount === 0) {
        // Categorías iniciales
        await db.categories.bulkAdd([
            { name: 'Hamburguesas', icon: '🍔', order: 1, isActive: true },
            { name: 'Perros Calientes', icon: '🌭', order: 2, isActive: true },
            { name: 'Papas', icon: '🍟', order: 3, isActive: true },
            { name: 'Bebidas', icon: '🥤', order: 4, isActive: true },
            { name: 'Postres', icon: '🍦', order: 5, isActive: true },
            { name: 'Combos', icon: '🍱', order: 6, isActive: true }
        ])

        // Productos de ejemplo
        const categories = await db.categories.toArray()
        const hamburguesasCat = categories.find(c => c.name === 'Hamburguesas')
        const papasCat = categories.find(c => c.name === 'Papas')
        const bebidasCat = categories.find(c => c.name === 'Bebidas')
        const combosCat = categories.find(c => c.name === 'Combos')

        if (hamburguesasCat && papasCat && bebidasCat && combosCat) {
            await db.products.bulkAdd([
                {
                    categoryId: hamburguesasCat.id!,
                    name: 'Hamburguesa Clásica',
                    description: 'Carne de res, lechuga, tomate, cebolla y salsas',
                    basePrice: 15000,
                    sizes: [
                        { name: 'Sencilla', priceModifier: 0 },
                        { name: 'Doble Carne', priceModifier: 5000 }
                    ],
                    modifierGroups: [
                        {
                            name: 'Ingredientes',
                            modifiers: [
                                { id: 'sin-cebolla', name: 'Sin cebolla', priceModifier: 0, isDefault: false },
                                { id: 'sin-tomate', name: 'Sin tomate', priceModifier: 0, isDefault: false },
                                { id: 'sin-lechuga', name: 'Sin lechuga', priceModifier: 0, isDefault: false }
                            ],
                            minSelect: 0,
                            maxSelect: 3
                        },
                        {
                            name: 'Extras',
                            modifiers: [
                                { id: 'extra-queso', name: 'Extra queso', priceModifier: 2000, isDefault: false },
                                { id: 'extra-tocineta', name: 'Extra tocineta', priceModifier: 3000, isDefault: false },
                                { id: 'extra-huevo', name: 'Extra huevo', priceModifier: 2000, isDefault: false }
                            ],
                            minSelect: 0,
                            maxSelect: 3
                        }
                    ],
                    isCombo: false,
                    comboItems: [],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    categoryId: hamburguesasCat.id!,
                    name: 'Hamburguesa BBQ',
                    description: 'Carne de res, queso cheddar, tocineta, cebolla caramelizada y salsa BBQ',
                    basePrice: 18000,
                    sizes: [
                        { name: 'Sencilla', priceModifier: 0 },
                        { name: 'Doble Carne', priceModifier: 5000 }
                    ],
                    modifierGroups: [
                        {
                            name: 'Extras',
                            modifiers: [
                                { id: 'extra-queso', name: 'Extra queso', priceModifier: 2000, isDefault: false },
                                { id: 'extra-tocineta', name: 'Extra tocineta', priceModifier: 3000, isDefault: false }
                            ],
                            minSelect: 0,
                            maxSelect: 2
                        }
                    ],
                    isCombo: false,
                    comboItems: [],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    categoryId: papasCat.id!,
                    name: 'Papas Fritas',
                    description: 'Papas fritas crujientes con sal',
                    basePrice: 6000,
                    sizes: [
                        { name: 'Pequeña', priceModifier: 0 },
                        { name: 'Mediana', priceModifier: 2000 },
                        { name: 'Grande', priceModifier: 4000 }
                    ],
                    modifierGroups: [
                        {
                            name: 'Salsas',
                            modifiers: [
                                { id: 'salsa-queso', name: 'Salsa de queso', priceModifier: 1500, isDefault: false },
                                { id: 'salsa-bbq', name: 'Salsa BBQ', priceModifier: 1000, isDefault: false }
                            ],
                            minSelect: 0,
                            maxSelect: 2
                        }
                    ],
                    isCombo: false,
                    comboItems: [],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    categoryId: bebidasCat.id!,
                    name: 'Gaseosa',
                    description: 'Coca-Cola, Sprite o Fanta',
                    basePrice: 3000,
                    sizes: [
                        { name: 'Pequeña', priceModifier: 0 },
                        { name: 'Mediana', priceModifier: 1000 },
                        { name: 'Grande', priceModifier: 2000 }
                    ],
                    modifierGroups: [],
                    isCombo: false,
                    comboItems: [],
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    categoryId: combosCat.id!,
                    name: 'Combo Clásico',
                    description: 'Hamburguesa + Papas + Bebida',
                    basePrice: 22000,
                    sizes: [],
                    modifierGroups: [],
                    isCombo: true,
                    comboItems: [
                        { categoryId: hamburguesasCat.id!, name: 'Hamburguesa', required: true },
                        { categoryId: papasCat.id!, name: 'Acompañamiento', required: true },
                        { categoryId: bebidasCat.id!, name: 'Bebida', required: true }
                    ],
                    isActive: true,
                    createdAt: new Date()
                }
            ])
        }

        // Mesas iniciales
        await db.restaurantTables.bulkAdd([
            { number: 1, name: 'Mesa 1', status: 'available', capacity: 4, positionX: 0, positionY: 0 },
            { number: 2, name: 'Mesa 2', status: 'available', capacity: 4, positionX: 1, positionY: 0 },
            { number: 3, name: 'Mesa 3', status: 'available', capacity: 2, positionX: 2, positionY: 0 },
            { number: 4, name: 'Mesa 4', status: 'available', capacity: 6, positionX: 0, positionY: 1 },
            { number: 5, name: 'Mesa 5', status: 'available', capacity: 4, positionX: 1, positionY: 1 },
            { number: 6, name: 'Mesa 6', status: 'available', capacity: 4, positionX: 2, positionY: 1 }
        ])

        // Configuración inicial
        await db.config.add({
            businessName: 'Malulos',
            taxRate: 0,
            currency: 'COP',
            currencySymbol: '$',
            printReceipt: false,
            soundEnabled: true
        })
    }
}
