import { create } from 'zustand'
import type { CartItem, Product, ProductSize, Modifier, ComboSelection } from '@/types'

interface CartState {
    items: CartItem[]
    tableId: number | null
    guestCount: number | null
    orderType: 'dine-in' | 'takeout' | 'delivery'
    customerId: number | null
    customerName: string
    customerPhone: string
    customerAddress: string

    // Actions
    setTable: (tableId: number | null) => void
    setGuestCount: (guestCount: number | null) => void
    setOrderType: (type: 'dine-in' | 'takeout' | 'delivery') => void
    setCustomer: (name: string, phone: string, address: string, customerId?: number | null) => void
    addItem: (
        product: Product,
        quantity: number,
        size?: ProductSize,
        modifiers?: Modifier[],
        comboSelections?: ComboSelection[],
        notes?: string
    ) => void
    updateItemQuantity: (itemId: string, quantity: number) => void
    removeItem: (itemId: string) => void
    clearCart: () => void
    getSubtotal: () => number
    getTotal: () => number
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 9)
}

function calculateItemPrice(
    product: Product,
    size?: ProductSize,
    modifiers?: Modifier[]
): number {
    let price = product.basePrice

    if (size) {
        price += size.priceModifier
    }

    if (modifiers) {
        price += modifiers.reduce((sum, mod) => sum + mod.priceModifier, 0)
    }

    return price
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    tableId: null,
    guestCount: null,
    orderType: 'dine-in',
    customerId: null,
    customerName: '',
    customerPhone: '',
    customerAddress: '',

    setTable: (tableId) => set({ tableId }),
    setGuestCount: (guestCount) => set({ guestCount }),

    setOrderType: (type) => set({ orderType: type }),

    setCustomer: (name, phone, address, customerId = null) => set({
        customerId,
        customerName: name,
        customerPhone: phone,
        customerAddress: address
    }),

    addItem: (product, quantity, size, modifiers = [], comboSelections = [], notes = '') => {
        const unitPrice = calculateItemPrice(product, size, modifiers)

        const newItem: CartItem = {
            id: generateId(),
            product,
            quantity,
            selectedSize: size,
            selectedModifiers: modifiers,
            comboSelections,
            notes,
            unitPrice,
            totalPrice: unitPrice * quantity
        }

        set((state) => ({
            items: [...state.items, newItem]
        }))
    },

    updateItemQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(itemId)
            return
        }

        set((state) => ({
            items: state.items.map((item) =>
                item.id === itemId
                    ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
                    : item
            )
        }))
    },

    removeItem: (itemId) => {
        set((state) => ({
            items: state.items.filter((item) => item.id !== itemId)
        }))
    },

    clearCart: () => {
        set({
            items: [],
            tableId: null,
            guestCount: null,
            orderType: 'dine-in',
            customerId: null,
            customerName: '',
            customerPhone: '',
            customerAddress: ''
        })
    },

    getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0)
    },

    getTotal: () => {
        // Por ahora sin impuestos ni descuentos
        return get().getSubtotal()
    }
}))
