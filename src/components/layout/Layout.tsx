import { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
    Home,
    ShoppingCart,
    ChefHat,
    UtensilsCrossed,
    LayoutGrid,
    Settings
} from 'lucide-react'
import styles from './Layout.module.css'

interface LayoutProps {
    children: ReactNode
}

const navItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/tables', icon: LayoutGrid, label: 'Mesas' },
    { path: '/orders', icon: ShoppingCart, label: 'Pedidos' },
    { path: '/kitchen', icon: ChefHat, label: 'Cocina' },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menú' }
]

export function Layout({ children }: LayoutProps) {
    const location = useLocation()
    const isKitchenView = location.pathname === '/kitchen'

    // Vista de cocina sin navegación
    if (isKitchenView) {
        return <main className={styles.kitchenMain}>{children}</main>
    }

    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>🍔</span>
                    <span className={styles.logoText}>Malulos</span>
                </div>
                <button className={styles.settingsBtn} aria-label="Configuración">
                    <Settings size={20} />
                </button>
            </header>

            <main className={styles.main}>{children}</main>

            <nav className={styles.nav}>
                {navItems.map(({ path, icon: Icon, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                        }
                    >
                        <Icon size={22} />
                        <span className={styles.navLabel}>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
