import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
    Home,
    UtensilsCrossed,
    ClipboardList,
    ChefHat,
    Settings,
    LogOut,
    User as UserIcon,
    Banknote,
    BarChart3,
    Users,
    LayoutGrid,
    Send,
    Bike
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ThemeToggle } from './ThemeToggle'
import styles from './Layout.module.css'

interface LayoutProps {
    children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, logout, hasPermission } = useAuthStore()

    const isActive = (path: string) => location.pathname === path
    const isKitchenDisplay = location.pathname === '/kitchen'

    // Construir navItems basado en permisos
    const navItems = [
        { path: '/', icon: <Home size={20} />, label: 'Inicio', show: true },
        { path: '/tables', icon: <UtensilsCrossed size={20} />, label: 'Mesas', show: true },
        { path: '/orders', icon: <ClipboardList size={20} />, label: 'Pedidos', show: true },
        { path: '/kitchen', icon: <ChefHat size={20} />, label: 'Cocina', show: true },
        { path: '/delivery', icon: <Bike size={20} />, label: 'Delivery', show: hasPermission('canDeliverOrders') },
        { path: '/customers', icon: <Users size={20} />, label: 'Clientes', show: true },
        { path: '/telegram-orders', icon: <Send size={20} />, label: 'Telegram', show: hasPermission('canManageCash') },
        { path: '/cash', icon: <Banknote size={20} />, label: 'Caja', show: hasPermission('canManageCash') },
        { path: '/menu', icon: <Settings size={20} />, label: 'Menú', show: hasPermission('canManageMenu') },
        { path: '/manage-tables', icon: <LayoutGrid size={20} />, label: 'Gestión Mesas', show: hasPermission('canManageMenu') },
        { path: '/reports', icon: <BarChart3 size={20} />, label: 'Reportes', show: hasPermission('canViewReports') },
        { path: '/users', icon: <Users size={20} />, label: 'Usuarios', show: hasPermission('canManageUsers') },
    ].filter(item => item.show)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className={`${styles.container} ${isKitchenDisplay ? styles.kitchenDisplay : ''}`}>
            {/* Sidebar / Topbar para Desktop */}
            {!isKitchenDisplay && (
                <header className={styles.header}>
                    <div className={styles.logo} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <img src="/images/logo.png" alt="Logo" className={styles.logoImg} />
                        <h1 className={styles.logoText}>Malulos</h1>
                    </div>

                    <div className={styles.userProfile}>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{user?.name}</span>
                            <span className={styles.userRole}>{user?.role}</span>
                        </div>
                        <div className={styles.avatar}>
                            <UserIcon size={18} />
                        </div>

                        <ThemeToggle />

                        <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar Sesión">
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>
            )}

            <main className={styles.main}>
                {children}
            </main>

            {/* Bottom Navigation para Mobile */}
            {!isKitchenDisplay && (
                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
                        >
                            {item.icon}
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    ))}
                </nav>
            )}
        </div>
    )
}
