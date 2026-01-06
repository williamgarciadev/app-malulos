import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'light',

            toggleTheme: () => {
                const newTheme = get().theme === 'light' ? 'dark' : 'light'
                set({ theme: newTheme })
                applyTheme(newTheme)
            },

            setTheme: (theme: Theme) => {
                set({ theme })
                applyTheme(theme)
            }
        }),
        {
            name: 'malulos-theme',
            onRehydrateStorage: () => (state) => {
                // Aplicar el tema guardado cuando se recarga la página
                if (state) {
                    applyTheme(state.theme)
                }
            }
        }
    )
)

// Función para aplicar el tema al documento
function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme)
}
