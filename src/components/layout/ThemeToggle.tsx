import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
    const { theme, toggleTheme } = useThemeStore()

    return (
        <button 
            className={styles.toggleBtn} 
            onClick={toggleTheme}
            title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
            <div className={`${styles.iconWrapper} ${theme === 'dark' ? styles.showMoon : styles.showSun}`}>
                <Sun className={styles.sunIcon} size={20} />
                <Moon className={styles.moonIcon} size={20} />
            </div>
        </button>
    )
}
