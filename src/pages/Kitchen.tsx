import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import {
    Clock,
    Check,
    ChefHat,
    Home
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Order } from '@/types'
import styles from './Kitchen.module.css'

export function Kitchen() {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const prevOrdersCount = useRef(0)

    const orders = useLiveQuery(
        () => db.orders
            .where('status')
            .anyOf(['pending', 'confirmed', 'preparing'])
            .sortBy('createdAt')
    )

    // Sonido de notificación para nuevos pedidos
    useEffect(() => {
        if (orders && orders.length > prevOrdersCount.current) {
            // Reproducir sonido (se puede agregar un archivo de audio)
            try {
                if (audioRef.current) {
                    audioRef.current.play()
                }
            } catch {
                // Silenciar error si no hay audio
            }
        }
        prevOrdersCount.current = orders?.length || 0
    }, [orders?.length])

    const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
        if (!order.id) return

        const updates: Partial<Order> = { status: newStatus }

        if (newStatus === 'confirmed') {
            updates.confirmedAt = new Date()
        } else if (newStatus === 'ready') {
            updates.readyAt = new Date()
            // También marcar todos los items como listos
            updates.items = order.items.map(item => ({ ...item, status: 'ready' as const }))
        }

        await db.orders.update(order.id, updates)
    }

    const getTimeElapsed = (date: Date) => {
        const now = new Date()
        const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000 / 60)
        if (diff < 1) return 'Ahora'
        if (diff === 1) return '1 min'
        return `${diff} min`
    }

    const getStatusLabel = (status: Order['status']) => {
        const labels: Record<Order['status'], string> = {
            pending: 'Nuevo',
            confirmed: 'Confirmado',
            preparing: 'Preparando',
            ready: 'Listo',
            delivered: 'Entregado',
            completed: 'Completado',
            cancelled: 'Cancelado'
        }
        return labels[status]
    }

    const pendingOrders = orders?.filter(o => o.status === 'pending') || []
    const preparingOrders = orders?.filter(o => o.status === 'confirmed' || o.status === 'preparing') || []

    return (
        <div className={styles.kitchen}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <ChefHat size={28} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Cocina</h1>
                        <p className={styles.subtitle}>
                            {orders?.length || 0} pedidos activos
                        </p>
                    </div>
                </div>
                <Link to="/" className={styles.homeBtn}>
                    <Home size={20} />
                </Link>
            </header>

            <div className={styles.columns}>
                {/* Pendientes */}
                <section className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.columnPending}`}>
                        <Clock size={20} />
                        <span>Pendientes</span>
                        <span className={styles.count}>{pendingOrders.length}</span>
                    </div>

                    <div className={styles.columnContent}>
                        {pendingOrders.map(order => (
                            <div key={order.id} className={`${styles.ticket} ${styles.ticketPending}`}>
                                <div className={styles.ticketHeader}>
                                    <span className={styles.orderNumber}>{order.orderNumber}</span>
                                    <span className={styles.orderTime}>{getTimeElapsed(order.createdAt)}</span>
                                </div>

                                <div className={styles.ticketInfo}>
                                    <span className={styles.orderType}>
                                        {order.type === 'dine-in' && order.tableName}
                                        {order.type === 'delivery' && '🛵 Domicilio'}
                                        {order.type === 'takeout' && '🛍️ Para llevar'}
                                    </span>
                                    {order.customerName && (
                                        <span className={styles.customerName}>{order.customerName}</span>
                                    )}
                                </div>

                                <ul className={styles.itemsList}>
                                    {order.items.map(item => (
                                        <li key={item.id} className={styles.item}>
                                            <span className={styles.itemQty}>{item.quantity}x</span>
                                            <div className={styles.itemDetails}>
                                                <span className={styles.itemName}>{item.productName}</span>
                                                {item.selectedSize && (
                                                    <span className={styles.itemMeta}>{item.selectedSize.name}</span>
                                                )}
                                                {item.selectedModifiers.length > 0 && (
                                                    <span className={styles.itemMeta}>
                                                        {item.selectedModifiers.map(m => m.name).join(', ')}
                                                    </span>
                                                )}
                                                {item.notes && (
                                                    <span className={styles.itemNotes}>📝 {item.notes}</span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={styles.actionBtn}
                                    onClick={() => handleStatusChange(order, 'preparing')}
                                >
                                    <ChefHat size={18} />
                                    <span>Comenzar a Preparar</span>
                                </button>
                            </div>
                        ))}

                        {pendingOrders.length === 0 && (
                            <div className={styles.emptyState}>
                                <Clock size={40} />
                                <p>Sin pedidos pendientes</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* En Preparación */}
                <section className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.columnPreparing}`}>
                        <ChefHat size={20} />
                        <span>En Preparación</span>
                        <span className={styles.count}>{preparingOrders.length}</span>
                    </div>

                    <div className={styles.columnContent}>
                        {preparingOrders.map(order => (
                            <div key={order.id} className={`${styles.ticket} ${styles.ticketPreparing}`}>
                                <div className={styles.ticketHeader}>
                                    <span className={styles.orderNumber}>{order.orderNumber}</span>
                                    <span className={`${styles.orderTime} ${styles.timeWarning}`}>
                                        {getTimeElapsed(order.createdAt)}
                                    </span>
                                </div>

                                <div className={styles.ticketInfo}>
                                    <span className={styles.orderType}>
                                        {order.type === 'dine-in' && order.tableName}
                                        {order.type === 'delivery' && '🛵 Domicilio'}
                                        {order.type === 'takeout' && '🛍️ Para llevar'}
                                    </span>
                                    <span className={`${styles.statusBadge} ${styles.statusPreparing}`}>
                                        {getStatusLabel(order.status)}
                                    </span>
                                </div>

                                <ul className={styles.itemsList}>
                                    {order.items.map(item => (
                                        <li key={item.id} className={styles.item}>
                                            <span className={styles.itemQty}>{item.quantity}x</span>
                                            <div className={styles.itemDetails}>
                                                <span className={styles.itemName}>{item.productName}</span>
                                                {item.selectedSize && (
                                                    <span className={styles.itemMeta}>{item.selectedSize.name}</span>
                                                )}
                                                {item.selectedModifiers.length > 0 && (
                                                    <span className={styles.itemMeta}>
                                                        {item.selectedModifiers.map(m => m.name).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`${styles.actionBtn} ${styles.actionReady}`}
                                    onClick={() => handleStatusChange(order, 'ready')}
                                >
                                    <Check size={18} />
                                    <span>Marcar como Listo</span>
                                </button>
                            </div>
                        ))}

                        {preparingOrders.length === 0 && (
                            <div className={styles.emptyState}>
                                <ChefHat size={40} />
                                <p>Nada en preparación</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Audio para notificaciones */}
            <audio ref={audioRef} preload="auto">
                <source src="/notification.mp3" type="audio/mpeg" />
            </audio>
        </div>
    )
}
