// ============================================
// MALULOS POS - Tipos TypeScript
// ============================================

// ---------- Categorías ----------
export interface Category {
    id?: number
    name: string
    icon: string
    order: number
    isActive: boolean
}

// ---------- Tamaños ----------
export interface ProductSize {
    name: string  // 'pequeño', 'mediano', 'grande'
    priceModifier: number  // precio adicional
}

// ---------- Modificadores ----------
export interface Modifier {
    id: string
    name: string  // 'sin cebolla', 'extra queso'
    priceModifier: number  // precio adicional
    isDefault: boolean
}

export interface ModifierGroup {
    name: string  // 'Ingredientes', 'Extras'
    modifiers: Modifier[]
    minSelect: number  // mínimo a seleccionar
    maxSelect: number  // máximo a seleccionar
}

// ---------- Productos ----------
export interface Product {
    id?: number
    categoryId: number
    name: string
    description: string
    basePrice: number
    image?: string
    sizes: ProductSize[]
    modifierGroups: ModifierGroup[]
    isCombo: boolean
    comboItems: ComboItem[]
    isActive: boolean
    createdAt: Date
}

export interface ComboItem {
    categoryId: number  // categoría de donde elegir
    name: string  // 'Bebida', 'Acompañamiento'
    required: boolean
}

// ---------- Items del Carrito ----------
export interface CartItem {
    id: string  // UUID único para el item
    product: Product
    quantity: number
    selectedSize?: ProductSize
    selectedModifiers: Modifier[]
    comboSelections: ComboSelection[]
    notes: string
    unitPrice: number
    totalPrice: number
}

export interface ComboSelection {
    comboItemName: string
    selectedProduct: Product
    selectedSize?: ProductSize
    selectedModifiers: Modifier[]
}

// ---------- Mesas ----------
export type TableStatus = 'available' | 'occupied' | 'paying' | 'reserved'

export interface RestaurantTable {
    id?: number
    number: number
    name: string
    status: TableStatus
    capacity: number
    currentOrderId?: number
    positionX: number
    positionY: number
}

// ---------- Clientes ----------
export interface Customer {
    id?: number
    name: string
    phone: string
    address: string
    notes?: string
    createdAt: Date
    lastOrderAt?: Date
}

// ---------- Pedidos ----------
export type OrderType = 'dine-in' | 'takeout' | 'delivery'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'completed' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'nequi' | 'daviplata' | 'mixed'
export type PaymentStatus = 'pending' | 'partial' | 'paid'

export interface OrderItem {
    id: string
    productId: number
    productName: string
    quantity: number
    selectedSize?: ProductSize
    selectedModifiers: Modifier[]
    comboSelections: ComboSelection[]
    notes: string
    unitPrice: number
    totalPrice: number
    status: 'pending' | 'preparing' | 'ready'
}

export interface Order {
    id?: number
    orderNumber: string  // Número visible: #001, #002
    type: OrderType
    tableId?: number
    tableName?: string
    customerId?: number
    customerName?: string
    customerPhone?: string
    customerAddress?: string
    items: OrderItem[]
    subtotal: number
    discount: number
    tax: number
    total: number
    status: OrderStatus
    paymentStatus: PaymentStatus
    paymentMethod?: PaymentMethod
    paidAmount: number
    notes?: string
    origin?: 'pos' | 'telegram'
    createdAt: Date
    confirmedAt?: Date
    readyAt?: Date
    completedAt?: Date
}

// ---------- Caja ----------
export interface CashRegister {
    id?: number
    openedAt: Date
    closedAt?: Date
    openingAmount: number
    closingAmount?: number
    cashSales: number
    cardSales: number
    transferSales: number
    totalSales: number
    ordersCount: number
    notes?: string
}

// ---------- Configuración ----------
export interface AppConfig {
    id?: number
    businessName: string
    taxRate: number
    currency: string
    currencySymbol: string
    printReceipt: boolean
    soundEnabled: boolean
}

// ---------- Usuarios ----------
export type UserRole = 'admin' | 'cashier' | 'waiter' | 'delivery'

export interface User {
    id?: number
    name: string
    pin: string // 4 dígitos
    role: UserRole
    isActive: boolean
    createdAt: Date
}

export interface UserPermissions {
    canTakeOrders: boolean
    canProcessPayments: boolean
    canManageCash: boolean
    canViewReports: boolean
    canManageMenu: boolean
    canManageUsers: boolean
    canDeliverOrders: boolean
}

// Permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
    admin: {
        canTakeOrders: true,
        canProcessPayments: true,
        canManageCash: true,
        canViewReports: true,
        canManageMenu: true,
        canManageUsers: true,
        canDeliverOrders: true
    },
    cashier: {
        canTakeOrders: true,
        canProcessPayments: true,
        canManageCash: true,
        canViewReports: false,
        canManageMenu: false,
        canManageUsers: false,
        canDeliverOrders: false
    },
    waiter: {
        canTakeOrders: true,
        canProcessPayments: false,
        canManageCash: false,
        canViewReports: false,
        canManageMenu: false,
        canManageUsers: false,
        canDeliverOrders: false
    },
    delivery: {
        canTakeOrders: false,
        canProcessPayments: true, // Puede cobrar contraentrega
        canManageCash: false,
        canViewReports: false,
        canManageMenu: false,
        canManageUsers: false,
        canDeliverOrders: true
    }
}

// ---------- Sesiones de Caja ----------
export type CashSessionStatus = 'open' | 'closed'

export interface CashSession {
    id?: number
    userId: number
    userName: string
    openedAt: Date
    closedAt?: Date
    openingAmount: number
    expectedAmount?: number
    actualAmount?: number
    difference?: number
    cashSales: number
    cardSales: number
    transferSales: number
    nequiSales: number
    davipplataSales: number
    totalSales: number
    ordersCount: number
    notes?: string
    status: CashSessionStatus
}

export interface CashMovement {
    id?: number
    sessionId: number
    type: 'in' | 'out'
    amount: number
    reason: string
    userId: number
    userName: string
    createdAt: Date
}
