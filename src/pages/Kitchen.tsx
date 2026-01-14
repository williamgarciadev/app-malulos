import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchApi } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/context/ToastContext'
import { generateKitchenTicket } from '@/services/ticketService'
import {
    Clock,
    Check,
    ChefHat,
    Home,
    Loader2,
    AlertTriangle,
    Printer,
    Send,
    LayoutGrid,
    Filter
} from 'lucide-react'
import type { Order } from '@/types'
import styles from './Kitchen.module.css'

export function Kitchen() {
    const { addToast } = useToast()
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const prevOrdersCount = useRef(0)
    const prevOrderIds = useRef<Set<number>>(new Set())

    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'dine-in' | 'takeout' | 'delivery' | 'telegram'>('all')
    const [compactView, setCompactView] = useState(false)

    const slaTargetMinutes = 8

    const loadOrders = useCallback(async () => {
        try {
            const data = await fetchApi<Order[]>('/orders?active=true')
            // Filtrar solo los que interesan a cocina (pendientes y preparando)
            // Los pedidos Telegram no entran hasta que el pago este confirmado.
            const kitchenOrders = data.filter(o => {
                if (!['pending', 'confirmed', 'preparing'].includes(o.status)) return false
                if (o.origin !== 'telegram') return true

                const isCashOnDelivery = o.paymentMethod === 'cash' || (o.notes || '').includes('[CONTRAENTREGA')
                return o.paymentStatus === 'paid' || isCashOnDelivery
            }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            
            setOrders(kitchenOrders)
            setIsLoading(false)
        } catch (error) {
            console.error('Error loading kitchen orders:', error)
        }
    }, [])

    // Carga inicial
    useEffect(() => {
        loadOrders()
    }, [loadOrders])

    // Polling cada 10 segundos
    usePolling(loadOrders, 10000)

    // Notificación mejorada para nuevos pedidos (especialmente Telegram)
    useEffect(() => {
        if (prevOrderIds.current.size === 0) {
            // Primera carga, solo guardar IDs
            prevOrderIds.current = new Set(orders.map(o => o.id!))
            prevOrdersCount.current = orders.length
            return
        }

        // Detectar pedidos realmente nuevos comparando IDs
        const newOrders = orders.filter(order => !prevOrderIds.current.has(order.id!))

        if (newOrders.length > 0) {
            // Reproducir sonido
            try {
                if (audioRef.current) {
                    audioRef.current.play()
                }
            } catch {
                // Silenciar error si no hay audio
            }

            // Mostrar notificación específica para pedidos de Telegram
            newOrders.forEach(order => {
                if (order.origin === 'telegram') {
                    addToast(
                        'info',
                        '📱 Nuevo Pedido de Telegram',
                        `Pedido ${order.orderNumber} - ${order.customerName || 'Cliente'}`
                    )
                } else {
                    addToast(
                        'info',
                        '🔔 Nuevo Pedido',
                        `Pedido ${order.orderNumber} recibido`
                    )
                }
            })
        }

        // Actualizar referencias
        prevOrderIds.current = new Set(orders.map(o => o.id!))
        prevOrdersCount.current = orders.length
    }, [orders, addToast])

    const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
        if (!order.id) return

        try {
            const updates: Partial<Order> = { status: newStatus }

            if (newStatus === 'confirmed') {
                updates.confirmedAt = new Date()
            } else if (newStatus === 'ready') {
                updates.readyAt = new Date()
                // También marcar todos los items como listos (solo visualmente, el backend debería manejar esto idealmente)
                updates.items = order.items.map(item => ({ ...item, status: 'ready' as const }))
            }

            // Actualizar en backend
            await fetchApi(`/orders/${order.id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            })

            // Recargar inmediatamente
            loadOrders()
        } catch (error) {
            console.error('Error updating order status:', error)
            alert('Error al actualizar el estado del pedido')
        }
    }

    const getBaseTime = (order: Order) => {
        return order.confirmedAt || order.createdAt
    }

    const getElapsedMinutes = (order: Order) => {
        const baseTime = getBaseTime(order)
        const start = new Date(baseTime)
        if (Number.isNaN(start.getTime())) return 0
        return Math.floor((Date.now() - start.getTime()) / 60000)
    }

    const getTimeClass = (order: Order) => {
        const minutes = getElapsedMinutes(order)
        if (minutes >= 10) return styles.timeCritical
        if (minutes >= 5) return styles.timeWarning
        return styles.timeOk
    }

    const isCashOnDelivery = (order: Order) => {
        if (order.paymentMethod === 'cash' && order.paymentStatus !== 'paid') return true
        return (order.notes || '').includes('[CONTRAENTREGA]')
    }

    const getTimeElapsed = (date: Date) => {
        const now = new Date()
        // Asegurarse de que date es un objeto Date válido
        const orderDate = new Date(date)
        const diff = Math.floor((now.getTime() - orderDate.getTime()) / 1000 / 60)
        
        if (isNaN(diff)) return '-'
        if (diff < 1) return 'Ahora'
        if (diff === 1) return '1 min'
        return `${diff} min`
    }

    const getFilteredOrders = () => {
        if (filter === 'all') return orders
        if (filter === 'telegram') return orders.filter(order => order.origin === 'telegram')
        return orders.filter(order => order.type === filter)
    }

    const getStatusLabel = (status: Order['status']) => {
        const labels: Record<Order['status'], string> = {
            pending: 'Nuevo',
            confirmed: 'Confirmado',
            preparing: 'Preparando',
            ready: 'Listo',
            on_the_way: 'En camino',
            delivered: 'Entregado',
            completed: 'Completado',
            cancelled: 'Cancelado'
        }
        return labels[status]
    }

    const filteredOrders = getFilteredOrders()
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending')
    const preparingOrders = filteredOrders.filter(o => o.status === 'confirmed' || o.status === 'preparing')

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className={styles.spinner} />
                <p>Cargando pedidos...</p>
            </div>
        )
    }

    return (
        <div className={`${styles.kitchen} ${compactView ? styles.compact : ''}`}>

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <ChefHat size={28} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Cocina</h1>
                        <p className={styles.subtitle}>
                            {orders.length} pedidos activos
                        </p>
                    </div>
                </div>
                <Link to="/" className={styles.homeBtn}>
                    <Home size={20} />
                </Link>
            </header>

            <div className={styles.controls}>
                <div className={styles.filterGroup}>
                    <button className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`} onClick={() => setFilter('all')}>
                        <Filter size={14} />
                        Todos
                    </button>
                    <button className={`${styles.filterBtn} ${filter === 'dine-in' ? styles.filterActive : ''}`} onClick={() => setFilter('dine-in')}>Mesa</button>
                    <button className={`${styles.filterBtn} ${filter === 'takeout' ? styles.filterActive : ''}`} onClick={() => setFilter('takeout')}>Para llevar</button>
                    <button className={`${styles.filterBtn} ${filter === 'delivery' ? styles.filterActive : ''}`} onClick={() => setFilter('delivery')}>Domicilio</button>
                    <button className={`${styles.filterBtn} ${filter === 'telegram' ? styles.filterActive : ''}`} onClick={() => setFilter('telegram')}>Telegram</button>
                </div>
                <button className={`${styles.compactToggle} ${compactView ? styles.compactActive : ''}`} onClick={() => setCompactView(v => !v)}>
                    <LayoutGrid size={16} />
                    {compactView ? 'Normal' : 'Compacto'}
                </button>
            </div>
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
                            <div key={order.id} className={`${styles.ticket} ${styles.ticketPending} ${order.origin === 'telegram' ? styles.ticketTelegram : ''}`}>
                                <div className={styles.ticketHeader}>
                                    <div className={styles.orderMeta}>
                                        <span className={styles.orderNumber}>Pedido {order.orderNumber}</span>
                                        <span className={`${styles.orderTime} ${getTimeClass(order)}`}>{getTimeElapsed(getBaseTime(order))}</span>
                                        <span className={styles.slaBadge}>Objetivo {slaTargetMinutes}m</span>
                                        {order.origin === 'telegram' && (
                                            <span className={styles.telegramBadge} title="Pedido desde Telegram">
                                                <Send size={12} /> Telegram
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        className={styles.printTicketBtn}
                                        onClick={() => { if (confirm('Reimprimir comanda?')) generateKitchenTicket(order) }}
                                        title="Reimprimir comanda"
                                    >
                                        <Printer size={18} />
                                    </button>
                                </div>

                                <div className={styles.ticketInfo}>
                                    <span className={styles.orderType}>
                                        {order.type === 'dine-in' && order.tableName}
                                        {order.type === 'delivery' && '🛵 Domicilio'}
                                        {order.type === 'takeout' && '🛍️ Para llevar'}
                                    </span>
                                    <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                                        Pendiente
                                    </span>
                                    {order.customerName && (
                                        <span className={styles.customerName}>{order.customerName}</span>
                                    )}
                                    {isCashOnDelivery(order) && (
                                        <span className={styles.codBadge}>Contraentrega</span>
                                    )}
                                    {order.paymentStatus !== 'paid' && !isCashOnDelivery(order) && (
                                        <span className={styles.paymentPendingBadge}>Pago pendiente</span>
                                    )}
                                </div>

                                {!compactView && (
                                    <ul className={styles.itemsList}>
                                    {order.items.map((item, index) => (
                                        <li key={`${order.id}-${item.id}-${index}`} className={styles.item}>
                                            <span className={styles.itemQty}>{item.quantity}x</span>
                                            <div className={styles.itemDetails}>
                                                <span className={styles.itemName}>{item.productName}</span>
                                                {(item.selectedSize || item.selectedModifiers.length > 0) && (
                                                    <div className={styles.itemMetaRow}>
                                                        {item.selectedSize && (
                                                            <span className={styles.itemMeta}>{item.selectedSize.name}</span>
                                                        )}
                                                        {item.selectedModifiers.length > 0 && (
                                                            <span className={styles.itemMeta}>
                                                                {item.selectedModifiers.map(m => m.name).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <div className={styles.itemNotes}>
                                                        <AlertTriangle size={14} />
                                                        <span>{item.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                    </ul>
                                )}

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
                            <div key={order.id} className={`${styles.ticket} ${styles.ticketPreparing} ${order.origin === 'telegram' ? styles.ticketTelegram : ''}`}>
                                <div className={styles.ticketHeader}>
                                    <div className={styles.orderMeta}>
                                        <span className={styles.orderNumber}>Pedido {order.orderNumber}</span>
                                        <span className={`${styles.orderTime} ${getTimeClass(order)}`}>{getTimeElapsed(getBaseTime(order))}</span>
                                        <span className={styles.slaBadge}>Objetivo {slaTargetMinutes}m</span>
                                        {order.origin === 'telegram' && (
                                            <span className={styles.telegramBadge} title="Pedido desde Telegram">
                                                <Send size={12} /> Telegram
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        className={styles.printTicketBtn}
                                        onClick={() => { if (confirm('Reimprimir comanda?')) generateKitchenTicket(order) }}
                                        title="Reimprimir comanda"
                                    >
                                        <Printer size={18} />
                                    </button>
                                </div>

                                <div className={styles.ticketInfo}>
                                    <span className={styles.orderType}>
                                        {order.type === 'dine-in' && order.tableName}
                                        {order.type === 'delivery' && '🛵 Domicilio'}
                                        {order.type === 'takeout' && '🛍️ Para llevar'}
                                    </span>
                                    <span className={`${styles.statusBadge} ${styles.statusPreparing}`}>{getStatusLabel(order.status)}</span>
                                    {isCashOnDelivery(order) && (
                                        <span className={styles.codBadge}>Contraentrega</span>
                                    )}
                                    {order.paymentStatus !== 'paid' && !isCashOnDelivery(order) && (
                                        <span className={styles.paymentPendingBadge}>Pago pendiente</span>
                                    )}
                                </div>

                                {!compactView && (
                                    <ul className={styles.itemsList}>
                                    {order.items.map((item, index) => (
                                        <li key={`${order.id}-${item.id}-${index}`} className={styles.item}>
                                            <span className={styles.itemQty}>{item.quantity}x</span>
                                            <div className={styles.itemDetails}>
                                                <span className={styles.itemName}>{item.productName}</span>
                                                {(item.selectedSize || item.selectedModifiers.length > 0) && (
                                                    <div className={styles.itemMetaRow}>
                                                        {item.selectedSize && (
                                                            <span className={styles.itemMeta}>{item.selectedSize.name}</span>
                                                        )}
                                                        {item.selectedModifiers.length > 0 && (
                                                            <span className={styles.itemMeta}>
                                                                {item.selectedModifiers.map(m => m.name).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <div className={styles.itemNotes}>
                                                        <AlertTriangle size={14} />
                                                        <span>{item.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                    </ul>
                                )}

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
