import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApi } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import {
    LayoutGrid,
    ShoppingCart,
    ChefHat,
    Truck,
    TrendingUp,
    Clock
} from 'lucide-react'
import type { Order, RestaurantTable } from '@/types'
import styles from './Home.module.css'

export function Home() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        pendingOrders: 0,
        todayOrders: 0,
        occupiedTables: 0,
        totalTables: 0
    })

    const loadStats = useCallback(async () => {
        try {
            const [orders, tables] = await Promise.all([
                fetchApi<Order[]>('/orders'),
                fetchApi<RestaurantTable[]>('/tables')
            ])

            const now = new Date()
            now.setHours(0, 0, 0, 0)

            const pending = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length
            const today = orders.filter(o => new Date(o.createdAt) >= now).length
            const occupied = tables.filter(t => t.status === 'occupied').length
            const total = tables.length

            setStats({
                pendingOrders: pending,
                todayOrders: today,
                occupiedTables: occupied,
                totalTables: total
            })
        } catch (error) {
            console.error('Error loading home stats:', error)
        }
    }, [])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    usePolling(loadStats, 15000)

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
            color: 'orders?type=delivery'
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
                        <span className={styles.statValue}>{stats.pendingOrders}</span>
                        <span className={styles.statLabel}>Pedidos Activos</span>
                    </div>
                </div>

                <div className={`${styles.statCard} ${styles.statSecondary}`}>
                    <div className={styles.statIcon}>
                        <LayoutGrid size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {stats.occupiedTables}/{stats.totalTables}
                        </span>
                        <span className={styles.statLabel}>Mesas Ocupadas</span>
                    </div>
                </div>

                <div className={`${styles.statCard} ${styles.statInfo}`}>
                    <div className={styles.statIcon}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.todayOrders}</span>
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
