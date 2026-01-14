import { create } from 'zustand'
import { fetchApi, cashMovementsApi } from '@/services/api'
import type { CashSession } from '@/types'

interface CashState {
    currentSession: CashSession | null
    isLoading: boolean

    // Acciones
    checkActiveSession: () => Promise<void>
    refreshSession: () => Promise<void>
    openSession: (userId: number, userName: string, openingAmount: number) => Promise<void>
    closeSession: (actualAmount: number, notes?: string) => Promise<void>
    addMovement: (type: 'in' | 'out', amount: number, reason: string, userId: number, userName: string) => Promise<void>
}

export const useCashStore = create<CashState>((set, get) => ({
    currentSession: null,
    isLoading: true,

    checkActiveSession: async () => {
        set({ isLoading: true })
        try {
            // Consultar sesión activa en el servidor
            const activeSession = await fetchApi<CashSession | null>('/cash-sessions/active')
            set({ currentSession: activeSession, isLoading: false })
        } catch (error) {
            console.error('Error checking active session:', error)
            set({ isLoading: false })
        }
    },

    refreshSession: async () => {
        try {
            // Recargar sesión activa sin mostrar loading
            const activeSession = await fetchApi<CashSession | null>('/cash-sessions/active')
            set({ currentSession: activeSession })
        } catch (error) {
            console.error('Error refreshing session:', error)
        }
    },

    openSession: async (userId: number, userName: string, openingAmount: number) => {
        try {
            const sessionData = {
                userId,
                userName,
                openingAmount,
                notes: 'Apertura de caja'
            }

            const newSession = await fetchApi<CashSession>('/cash-sessions', {
                method: 'POST',
                body: JSON.stringify(sessionData)
            })

            set({ currentSession: newSession })
        } catch (error) {
            console.error('Error opening session:', error)
            throw error
        }
    },

    closeSession: async (actualAmount: number, notes?: string) => {
        const { currentSession } = get()
        if (!currentSession || !currentSession.id) return

        try {
            const closeData = {
                closedAt: new Date(),
                actualAmount,
                notes
            }

            await fetchApi<CashSession>(`/cash-sessions/${currentSession.id}/close`, {
                method: 'POST',
                body: JSON.stringify(closeData)
            })

            set({ currentSession: null })
        } catch (error) {
            console.error('Error closing session:', error)
            throw error
        }
    },

    addMovement: async (type: 'in' | 'out', amount: number, reason: string, userId: number, userName: string) => {
        const { currentSession } = get()
        if (!currentSession || !currentSession.id) return

        try {
            const result = await cashMovementsApi.create({
                sessionId: currentSession.id,
                type,
                amount,
                reason,
                userId,
                userName,
                createdAt: new Date()
            })

            set({ currentSession: result.session })
        } catch (error) {
            console.error('Error adding movement:', error)
            throw error
        }
    }
}))
