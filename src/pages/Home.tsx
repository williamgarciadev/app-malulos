import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import {
    LayoutGrid,
    ShoppingCart,
    ChefHat,
    Truck,
    TrendingUp,
    Clock
} from 'lucide-react'
import styles from './Home.module.css'

export function Home() {
    const navigate = useNavigate()

    // Estadísticas en tiempo real
    const pendingOrders = useLiveQuery(
        () => db.orders.where('status').anyOf(['pending', 'confirmed', 'preparing']).count()
    )

    const todayOrders = useLiveQuery(async () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return db.orders.where('createdAt').above(today).count()
    })

    const occupiedTables = useLiveQuery(
        () => db.tables.where('status').equals('occupied').count()
    )

    const totalTables = useLiveQuery(() => db.tables.count())

    const quickActions = [
        {
            icon: LayoutGrid,
            label: 'Nuevo Pedido Mesa',
            color: 'primary',
            onClick: () => navigate('/tables')
        },
        {
            icon: Truck,
            label: 'Nuevo Domicilio',
            color: 'secondary',
            onClick: () => navigate('/orders?type=delivery')
        },
        {
            icon: ShoppingCart,
            label: 'Para Llevar',
            color: 'info',
            onClick: () => navigate('/orders?type=takeout')
        },
        {
            icon: ChefHat,
            label: 'Ver Cocina',
            color: 'warning',
            onClick: () => navigate('/kitchen')
        }
    ]

    return (
        <div className={styles.home}>
            <section className={styles.greeting}>
                <h1 className={styles.title}>¡Bienvenido!</h1>
                <p className={styles.subtitle}>
                    <Clock size={16} />
                    {new Date().toLocaleDateString('es-CO', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                    })}
                </p>
            </section>

            <section className={styles.stats}>
                <div className={`${styles.statCard} ${styles.statPrimary}`}>
                    <div className={styles.statIcon}>
                        <ShoppingCart size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{pendingOrders ?? 0}</span>
                        <span className={styles.statLabel}>Pedidos Activos</span>
                    </div>
                </div>

                <div className={`${styles.statCard} ${styles.statSecondary}`}>
                    <div className={styles.statIcon}>
                        <LayoutGrid size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {occupiedTables ?? 0}/{totalTables ?? 0}
                        </span>
                        <span className={styles.statLabel}>Mesas Ocupadas</span>
                    </div>
                </div>

                <div className={`${styles.statCard} ${styles.statInfo}`}>
                    <div className={styles.statIcon}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{todayOrders ?? 0}</span>
                        <span className={styles.statLabel}>Pedidos Hoy</span>
                    </div>
                </div>
            </section>

            <section className={styles.actions}>
                <h2 className={styles.sectionTitle}>Acciones Rápidas</h2>
                <div className={styles.actionsGrid}>
                    {quickActions.map(({ icon: Icon, label, color, onClick }) => (
                        <button
                            key={label}
                            className={`${styles.actionCard} ${styles[`action${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}
                            onClick={onClick}
                        >
                            <div className={styles.actionIcon}>
                                <Icon size={28} />
                            </div>
                            <span className={styles.actionLabel}>{label}</span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    )
}
