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
    Clock,
    MessageCircle,
    Bell
} from 'lucide-react'
import type { Order, RestaurantTable } from '@/types'
import styles from './Home.module.css'

export function Home() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        pendingOrders: 0,
        todayOrders: 0,
        occupiedTables: 0,
        totalTables: 0,
        telegramOrders: 0
    })
    const [telegramOrders, setTelegramOrders] = useState<Order[]>([])

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

            // Filtrar pedidos de Telegram/Delivery pendientes
            const telegramPending = orders.filter(o =>
                (o.origin === 'telegram' || o.type === 'delivery' || o.type === 'takeout') &&
                ['pending', 'confirmed', 'preparing'].includes(o.status)
            )

            setStats({
                pendingOrders: pending,
                todayOrders: today,
                occupiedTables: occupied,
                totalTables: total,
                telegramOrders: telegramPending.length
            })
            setTelegramOrders(telegramPending)
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
            label: 'Mesas',
            color: 'primary',
            onClick: () => navigate('/tables')
        },
        {
            icon: Truck,
            label: 'Domicilio',
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
            label: 'Cocina',
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

            {/* Sección de Pedidos de Telegram/Delivery */}
            {telegramOrders.length > 0 && (
                <section className={styles.telegramSection}>
                    <div className={styles.telegramHeader}>
                        <h2 className={styles.sectionTitle}>
                            <Bell size={20} className={styles.bellIcon} />
                            Pedidos Telegram/Delivery Pendientes
                            <span className={styles.telegramBadge}>{stats.telegramOrders}</span>
                        </h2>
                        <button
                            className={styles.viewAllBtn}
                            onClick={() => navigate('/kitchen')}
                        >
                            Ver en Cocina
                        </button>
                    </div>
                    <div className={styles.telegramOrders}>
                        {telegramOrders.slice(0, 3).map(order => (
                            <div
                                key={order.id}
                                className={styles.telegramOrderCard}
                                onClick={() => navigate('/kitchen')}
                            >
                                <div className={styles.orderHeader}>
                                    <div className={styles.orderNumber}>
                                        {order.origin === 'telegram' && (
                                            <MessageCircle size={16} className={styles.telegramIcon} />
                                        )}
                                        <strong>#{order.orderNumber}</strong>
                                    </div>
                                    <span className={styles.orderType}>
                                        {order.type === 'delivery' && '🛵 Domicilio'}
                                        {order.type === 'takeout' && '🛍️ Para llevar'}
                                    </span>
                                </div>
                                <div className={styles.orderCustomer}>
                                    {order.customerName || 'Cliente'}
                                    {order.customerPhone && ` - ${order.customerPhone}`}
                                </div>
                                <div className={styles.orderItems}>
                                    {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                                    <span className={styles.orderTotal}>
                                        ${order.total.toLocaleString()}
                                    </span>
                                </div>
                                <div className={styles.orderTime}>
                                    {new Date(order.createdAt).toLocaleTimeString('es-CO', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    {telegramOrders.length > 3 && (
                        <button
                            className={styles.showMoreBtn}
                            onClick={() => navigate('/kitchen')}
                        >
                            Ver {telegramOrders.length - 3} pedidos más en Cocina
                        </button>
                    )}
                </section>
            )}

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
