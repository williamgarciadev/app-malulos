import { useState, useMemo } from 'react'
import { fetchApi, ordersApi } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/context/ToastContext'
import { Order } from '@/types'
import { Bike, MapPin, Phone, User, CheckCircle, Navigation, Package, DollarSign } from 'lucide-react'
import styles from './Delivery.module.css'

export function Delivery() {
    const { addToast } = useToast()
    const [orders, setOrders] = useState<Order[]>([])
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending')
    const [processingId, setProcessingId] = useState<number | null>(null)

    usePolling(async () => {
        try {
            // Idealmente el backend tendria un endpoint /orders/delivery
            const allOrders = await ordersApi.getAll({ active: true })

            const deliveryOrders = allOrders.filter(o =>
                o.type === 'delivery' &&
                ['ready', 'on_the_way'].includes(o.status)
            )

            setOrders(deliveryOrders)
        } catch (error) {
            console.error('Error loading delivery orders:', error)
        }
    }, 10000) // Polling cada 10s

    const pendingOrders = useMemo(
        () => orders.filter(o => o.status === 'ready'),
        [orders]
    )

    const activeOrders = useMemo(
        () => orders.filter(o => o.status === 'on_the_way'),
        [orders]
    )

    const handleStartDelivery = async (orderId: number) => {
        setProcessingId(orderId)
        try {
            await fetchApi(`/orders/${orderId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'on_the_way' })
            })
            addToast('success', 'En camino!', 'El cliente ha sido notificado')

            // Actualizacion optimista
            setOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, status: 'on_the_way' } : o
            ))
            setActiveTab('active')
        } catch (error) {
            addToast('error', 'Error', 'No se pudo iniciar la entrega')
        } finally {
            setProcessingId(null)
        }
    }

    const handleCompleteDelivery = async (orderId: number) => {
        if (!confirm('Confirmas que el pedido fue entregado y pagado?')) return

        setProcessingId(orderId)
        try {
            await fetchApi(`/orders/${orderId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'completed' })
            })

            const order = orders.find(o => o.id === orderId)
            if (order && order.paymentStatus !== 'paid') {
                // Nota: Esto idealmente deberia ir al endpoint de pagos, pero por simplicidad
                // dejamos que el cajero cierre la caja o implementamos endpoint de pago rapido aqui.
                // Por ahora solo completamos la orden.
            }

            addToast('success', 'Entregado!', 'Pedido completado exitosamente')
            setOrders(prev => prev.filter(o => o.id !== orderId))
        } catch (error) {
            addToast('error', 'Error', 'No se pudo completar la entrega')
        } finally {
            setProcessingId(null)
        }
    }

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const currentList = activeTab === 'pending' ? pendingOrders : activeOrders

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    <Bike size={28} />
                    Malulos Delivery
                </h1>
            </header>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    <Package size={18} />
                    Listos para Recoger
                    {pendingOrders.length > 0 && <span className={styles.badge}>{pendingOrders.length}</span>}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    <Navigation size={18} />
                    En Ruta
                    {activeOrders.length > 0 && <span className={styles.badge}>{activeOrders.length}</span>}
                </button>
            </div>

            <div className={styles.ordersList}>
                {currentList.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Bike size={48} opacity={0.5} />
                        <h3>No hay pedidos {activeTab === 'pending' ? 'pendientes' : 'en curso'}</h3>
                        <p>Los nuevos pedidos apareceran aqui automaticamente</p>
                    </div>
                ) : (
                    currentList.map(order => (
                        <div key={order.id} className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                                <div>
                                    <div className={styles.orderNumber}>{order.orderNumber}</div>
                                    <div className={styles.orderTime}>
                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div className={`${styles.badge} ${order.paymentStatus === 'paid' ? styles.badgePaid : styles.badgePending}`}>
                                    {order.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE PAGO'}
                                </div>
                            </div>

                            <div className={styles.customerInfo}>
                                <div className={styles.customerRow}>
                                    <User size={16} className={styles.icon} />
                                    <span>{order.customerName || 'Cliente sin nombre'}</span>
                                </div>
                                <div className={styles.customerRow}>
                                    <MapPin size={16} className={styles.icon} />
                                    <span>{order.customerAddress || 'Sin direccion'}</span>
                                </div>
                                {order.customerPhone && (
                                    <div className={styles.customerRow}>
                                        <Phone size={16} className={styles.icon} />
                                        <a href={`tel:${order.customerPhone}`} className={styles.link}>
                                            {order.customerPhone}
                                        </a>
                                        <span style={{ margin: '0 4px' }}>|</span>
                                        <a
                                            href={`https://wa.me/${order.customerPhone.replace(/\D/g,'')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={styles.link}
                                        >
                                            WhatsApp
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className={styles.orderDetails}>
                                <div className={styles.itemsList}>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className={styles.item}>
                                            <span>{item.quantity}x {item.productName}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.orderTotal}>
                                    <span>Total a Cobrar:</span>
                                    <span>{formatPrice(order.total)}</span>
                                </div>
                                {order.paymentMethod && (
                                    <div className={styles.customerRow} style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                        <DollarSign size={14} />
                                        Metodo: {order.paymentMethod.toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className={styles.actions}>
                                {activeTab === 'pending' ? (
                                    <button
                                        className={`${styles.actionBtn} ${styles.startBtn}`}
                                        onClick={() => handleStartDelivery(order.id!)}
                                        disabled={processingId === order.id}
                                    >
                                        <Navigation size={20} />
                                        {processingId === order.id ? 'Iniciando...' : 'Iniciar Entrega'}
                                    </button>
                                ) : (
                                    <button
                                        className={`${styles.actionBtn} ${styles.completeBtn}`}
                                        onClick={() => handleCompleteDelivery(order.id!)}
                                        disabled={processingId === order.id}
                                    >
                                        <CheckCircle size={20} />
                                        {processingId === order.id ? 'Finalizando...' : 'Confirmar Entrega'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
