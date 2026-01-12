import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchApi } from '@/services/api'
import type { User, UserPermissions } from '@/types'
import { ROLE_PERMISSIONS } from '@/types'

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    permissions: UserPermissions | null

    // Acciones
    login: (pin: string) => Promise<boolean>
    logout: () => void
    hasPermission: (permission: keyof UserPermissions) => boolean
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            permissions: null,

            login: async (pin: string) => {
                try {
                    // Llamada al backend
                    const user = await fetchApi<User>('/users/login', {
                        method: 'POST',
                        body: JSON.stringify({ pin })
                    })

                    if (user && user.isActive) {
                        const permissions = ROLE_PERMISSIONS[user.role]
                        set({
                            user,
                            isAuthenticated: true,
                            permissions
                        })
                        return true
                    }
                    return false
                } catch (error) {
                    console.error('Login error:', error)
                    return false
                }
            },

            logout: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                    permissions: null
                })
            },

            hasPermission: (permission: keyof UserPermissions) => {
                const { permissions, user } = get()
                if (permissions?.[permission] !== undefined) {
                    return permissions[permission]
                }
                if (user?.role && ROLE_PERMISSIONS[user.role]?.[permission] !== undefined) {
                    return ROLE_PERMISSIONS[user.role][permission]
                }
                return false
            }
        }),
        {
            name: 'malulos-auth',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                permissions: state.permissions
            })
        }
    )
)
