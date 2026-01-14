// src/services/api.ts

import type {
    Category,
    Product,
    RestaurantTable,
    Order,
    Customer,
    AppConfig,
    User,
    CashSession,
    CashMovement
} from '@/types'

// URL del backend.
// Si hay variable de entorno, la usa y normaliza el prefijo /api.
// Si no, construye la URL basada en la IP actual del navegador (util para red local).
// Asume que si el frontend esta en puerto 5174, el backend esta en el 3000 de la misma IP.
const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;

const normalizeApiUrl = (value?: string) => {
    if (!value) {
        return `http://${window.location.hostname}:3000/api`;
    }

    if (value.startsWith('/')) {
        return `http://${window.location.hostname}:3000${value.replace(/\/$/, '')}`;
    }

    const trimmed = value.replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const API_URL = normalizeApiUrl(rawApiUrl);

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

/**
 * Funcion generica para realizar peticiones a la API
 */
export async function fetchApi<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const config: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Si la respuesta no es OK, intentamos obtener el mensaje de error del JSON
        if (!response.ok) {
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Si no es JSON, nos quedamos con el error por defecto
            }
            throw new Error(errorMessage);
        }

        // Si la respuesta no tiene contenido (ej: 204 No Content), devolvemos null
        if (response.status === 204) {
            return null as unknown as T;
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error en ${endpoint}:`, error);
        throw error;
    }
}

// ============================================
// API METHODS - Funciones especificas por entidad
// ============================================

// ---------- PRODUCTOS ----------
export const productsApi = {
    getAll: () => fetchApi<Product[]>('/products'),

    getById: (id: number) => fetchApi<Product>(`/products/${id}`),

    getByCategory: (categoryId: number) => fetchApi<Product[]>(`/products/category/${categoryId}`),

    create: (product: Omit<Product, 'id'>) =>
        fetchApi<Product>('/products', {
            method: 'POST',
            body: JSON.stringify(product)
        }),

    update: (id: number, product: Partial<Product>) =>
        fetchApi<Product>(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(product)
        }),

    delete: (id: number) =>
        fetchApi<void>(`/products/${id}`, { method: 'DELETE' })
}

// ---------- CATEGORIAS ----------
export const categoriesApi = {
    getAll: () => fetchApi<Category[]>('/categories'),

    create: (category: Omit<Category, 'id'>) =>
        fetchApi<Category>('/categories', {
            method: 'POST',
            body: JSON.stringify(category)
        }),

    update: (id: number, category: Partial<Category>) =>
        fetchApi<Category>(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(category)
        }),

    delete: (id: number) =>
        fetchApi<void>(`/categories/${id}`, { method: 'DELETE' })
}

// ---------- MESAS ----------
export const tablesApi = {
    getAll: () => fetchApi<RestaurantTable[]>('/tables'),

    getById: (id: number) => fetchApi<RestaurantTable>(`/tables/${id}`),

    create: (table: Omit<RestaurantTable, 'id'>) =>
        fetchApi<RestaurantTable>('/tables', {
            method: 'POST',
            body: JSON.stringify(table)
        }),

    update: (id: number, table: Partial<RestaurantTable>) =>
        fetchApi<RestaurantTable>(`/tables/${id}`, {
            method: 'PUT',
            body: JSON.stringify(table)
        })
}

// ---------- PEDIDOS ----------
export const ordersApi = {
    getAll: (params?: { 
        active?: boolean; 
        status?: string; 
        tableId?: number;
        startDate?: string;
        endDate?: string;
    }) => {
        const query = new URLSearchParams()
        if (params?.active !== undefined) query.append('active', String(params.active))
        if (params?.status) query.append('status', params.status)
        if (params?.tableId) query.append('tableId', String(params.tableId))
        if (params?.startDate) query.append('startDate', params.startDate)
        if (params?.endDate) query.append('endDate', params.endDate)

        const queryString = query.toString()
        return fetchApi<Order[]>(`/orders${queryString ? `?${queryString}` : ''}`)
    },

    getById: (id: number) => fetchApi<Order>(`/orders/${id}`),

    create: (order: Omit<Order, 'id'>) =>
        fetchApi<Order>('/orders', {
            method: 'POST',
            body: JSON.stringify(order)
        }),

    update: (id: number, order: Partial<Order>) =>
        fetchApi<Order>(`/orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(order)
        }),

    delete: (id: number) =>
        fetchApi<void>(`/orders/${id}`, { method: 'DELETE' })
}

// ---------- USUARIOS ----------
export const usersApi = {
    getAll: () => fetchApi<User[]>('/users'),

    login: (pin: string) =>
        fetchApi<User | null>('/users/login', {
            method: 'POST',
            body: JSON.stringify({ pin })
        }),

    create: (user: Omit<User, 'id'>) =>
        fetchApi<User>('/users', {
            method: 'POST',
            body: JSON.stringify(user)
        }),

    update: (id: number, user: Partial<User>) =>
        fetchApi<User>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(user)
        })
}

// ---------- SESIONES DE CAJA ----------
export const cashSessionsApi = {
    getActive: () => fetchApi<CashSession | null>('/cash-sessions/active'),

    getById: (id: number) => fetchApi<CashSession>(`/cash-sessions/${id}`),

    create: (session: Omit<CashSession, 'id'>) =>
        fetchApi<CashSession>('/cash-sessions', {
            method: 'POST',
            body: JSON.stringify(session)
        }),

    update: (id: number, session: Partial<CashSession>) =>
        fetchApi<CashSession>(`/cash-sessions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(session)
        }),

    close: (id: number, data: { actualAmount: number; notes?: string }) =>
        fetchApi<CashSession>(`/cash-sessions/${id}/close`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
}

// ---------- MOVIMIENTOS DE CAJA ----------
export const cashMovementsApi = {
    create: (movement: Omit<CashMovement, 'id'>) =>
        fetchApi<{ movement: CashMovement; session: CashSession }>('/cash-movements', {
            method: 'POST',
            body: JSON.stringify(movement)
        }),
    getBySession: (sessionId: number) =>
        fetchApi<CashMovement[]>(`/cash-movements?sessionId=${sessionId}`)
}

// ---------- CLIENTES ----------
export const customersApi = {
    getAll: () => fetchApi<Customer[]>('/customers'),

    create: (customer: Omit<Customer, 'id'>) =>
        fetchApi<Customer>('/customers', {
            method: 'POST',
            body: JSON.stringify(customer)
        })
}

// ---------- CONFIGURACION ----------
export const configApi = {
    get: () => fetchApi<AppConfig>('/config'),

    update: (config: Partial<AppConfig>) =>
        fetchApi<AppConfig>('/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        })
}

// ---------- HEALTH CHECK ----------
export const healthApi = {
    check: () => fetchApi<{ status: string; message: string }>('/health')
}
