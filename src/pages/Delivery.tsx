import { useState, useMemo, useCallback, useEffect } from 'react'
import { fetchApi, ordersApi } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/context/ToastContext'
import { Order } from '@/types'
import { Bike, MapPin, Phone, User, CheckCircle, Navigation, Package, DollarSign, Search, Copy } from 'lucide-react'
import styles from './Delivery.module.css'

export function Delivery() {
    const { addToast } = useToast()
    const [orders, setOrders] = useState<Order[]>([])
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending')
    const [processingId, setProcessingId] = useState<number | null>(null)
    const [confirmOrder, setConfirmOrder] = useState<Order | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [compactView, setCompactView] = useState(false)
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'cash'>('all')

    const loadOrders = useCallback(async () => {
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
    }, [])

    useEffect(() => {
        loadOrders()
    }, [loadOrders])

    usePolling(loadOrders, 10000) // Polling cada 10s

    const normalizePhone = (value: string) => value.replace(/\D/g, '')

    const getWhatsAppUrl = (phone: string) => {
        const digits = normalizePhone(phone)
        if (!digits) return ''
        if (digits.length === 10) {
            return `https://wa.me/57${digits}`
        }
        return `https://wa.me/${digits}`
    }

    const getMapsUrl = (address: string) => {
        if (!address) return ''
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    }

    const getDirectionsUrl = (address: string) => {
        if (!address) return ''
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    }

    const getOrderMinutes = (order: Order) => {
        const timeValue = order.confirmedAt || order.createdAt
        const baseTime = timeValue ? new Date(timeValue).getTime() : Date.now()
        return Math.max(0, Math.floor((Date.now() - baseTime) / 60000))
    }

    const getTimeClass = (minutes: number) => {
        if (minutes >= 25) return styles.timeCritical
        if (minutes >= 15) return styles.timeWarning
        return styles.timeOk
    }

    const pendingOrders = useMemo(
        () => orders.filter(o => o.status === 'ready'),
        [orders]
    )

    const activeOrders = useMemo(
        () => orders.filter(o => o.status === 'on_the_way'),
        [orders]
    )

    const filteredOrders = useMemo(() => {
        const list = activeTab === 'pending' ? pendingOrders : activeOrders
        const query = searchTerm.trim().toLowerCase()

        return list.filter(order => {
            if (paymentFilter === 'paid' && order.paymentStatus !== 'paid') return false
            if (paymentFilter === 'pending' && order.paymentStatus === 'paid') return false
            if (paymentFilter === 'cash' && order.paymentMethod !== 'cash') return false

            if (!query) return true
            const haystack = [
                order.orderNumber,
                order.customerName,
                order.customerPhone,
                order.customerAddress
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
            return haystack.includes(query)
        })
    }, [activeTab, pendingOrders, activeOrders, searchTerm, paymentFilter])

    const handleCopyAddress = async (address: string) => {
        if (!address) return
        try {
            await navigator.clipboard.writeText(address)
            addToast('success', 'Direccion copiada', 'La direccion quedo en el portapapeles')
        } catch (error) {
            addToast('error', 'Error', 'No se pudo copiar la direccion')
        }
    }

    const handleStartDelivery = async (orderId: number) => {
        setProcessingId(orderId)
        try {
            await fetchApi(`/orders/${orderId}/status`, {
                method: 'POST',
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
        setProcessingId(orderId)
        try {
            await fetchApi(`/orders/${orderId}/status`, {
                method: 'POST',
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

    const getPaymentLabel = (method?: string) => {
        if (!method) return 'Sin metodo'
        if (method === 'cash') return 'Contraentrega'
        return method.toUpperCase()
    }

    const tabOrders = activeTab === 'pending' ? pendingOrders : activeOrders
    const currentList = filteredOrders
    const hasActiveFilters = paymentFilter !== 'all' || Boolean(searchTerm.trim())
    const showFilteredEmpty = tabOrders.length > 0 && currentList.length === 0
    const showActiveHint = activeTab === 'pending' && pendingOrders.length === 0 && activeOrders.length > 0

    const handleClearFilters = () => {
        setSearchTerm('')
        setPaymentFilter('all')
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    <Bike size={28} />
                    Malulos Delivery
                </h1>
            </header>

            <div className={styles.toolbar}>
                <div className={styles.searchBar}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por orden, cliente o direccion..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.filters}>
                    <button
                        className={`${styles.filterBtn} ${paymentFilter === 'all' ? styles.filterActive : ''}`}
                        onClick={() => setPaymentFilter('all')}
                    >
                        Todos
                    </button>
                    <button
                        className={`${styles.filterBtn} ${paymentFilter === 'pending' ? styles.filterActive : ''}`}
                        onClick={() => setPaymentFilter('pending')}
                    >
                        Pendiente pago
                    </button>
                    <button
                        className={`${styles.filterBtn} ${paymentFilter === 'paid' ? styles.filterActive : ''}`}
                        onClick={() => setPaymentFilter('paid')}
                    >
                        Pagado
                    </button>
                    <button
                        className={`${styles.filterBtn} ${paymentFilter === 'cash' ? styles.filterActive : ''}`}
                        onClick={() => setPaymentFilter('cash')}
                    >
                        Contraentrega
                    </button>
                </div>

                <button
                    className={`${styles.compactToggle} ${compactView ? styles.compactActive : ''}`}
                    onClick={() => setCompactView(prev => !prev)}
                >
                    {compactView ? 'Vista comoda' : 'Vista compacta'}
                </button>
            </div>

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

            <div className={styles.summaryRow}>
                <span className={styles.summaryText}>
                    Mostrando {currentList.length} de {tabOrders.length} pedidos
                </span>
                {hasActiveFilters && (
                    <button className={styles.clearBtn} onClick={handleClearFilters}>
                        Limpiar filtros
                    </button>
                )}
            </div>

            <div className={styles.ordersList}>
                {currentList.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Bike size={48} opacity={0.5} />
                        <h3>
                            {showFilteredEmpty
                                ? 'Hay pedidos pero estan ocultos por filtros'
                                : showActiveHint
                                    ? 'Tienes pedidos en ruta'
                                    : `No hay pedidos ${activeTab === 'pending' ? 'pendientes' : 'en curso'}`
                            }
                        </h3>
                        <p>
                            {showFilteredEmpty
                                ? 'Limpia los filtros o el buscador para verlos.'
                                : showActiveHint
                                    ? 'Revisa la pestaña En Ruta para gestionarlos.'
                                    : 'Los nuevos pedidos apareceran aqui automaticamente'
                            }
                        </p>
                        {(showFilteredEmpty || showActiveHint) && (
                            <button
                                className={styles.clearBtn}
                                onClick={showFilteredEmpty ? handleClearFilters : () => setActiveTab('active')}
                            >
                                {showFilteredEmpty ? 'Limpiar filtros' : 'Ir a En Ruta'}
                            </button>
                        )}
                    </div>
                ) : (
                    currentList.map(order => (
                        <div key={order.id} className={`${styles.orderCard} ${compactView ? styles.orderCardCompact : ''}`}>
                            <div className={styles.orderHeader}>
                                <div>
                                    <div className={styles.orderNumber}>{order.orderNumber}</div>
                                    <div className={styles.orderTime}>
                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <span className={`${styles.timeBadge} ${getTimeClass(getOrderMinutes(order))}`}>
                                            {getOrderMinutes(order)} min
                                        </span>
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
                                            href={getWhatsAppUrl(order.customerPhone)}
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
                                {!compactView && (
                                    <div className={styles.itemsList}>
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className={styles.item}>
                                                <span>{item.quantity}x {item.productName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className={styles.orderTotal}>
                                    <span>Total a Cobrar:</span>
                                    <span>{formatPrice(order.total)}</span>
                                </div>
                                <div className={styles.metaRow}>
                                    {order.paymentMethod && (
                                        <span className={styles.methodBadge}>
                                            <DollarSign size={14} />
                                            {order.paymentMethod === 'cash' ? 'Contraentrega' : order.paymentMethod.toUpperCase()}
                                        </span>
                                    )}
                                    <span className={styles.itemsCount}>
                                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                    </span>
                                </div>
                            </div>

                            <div className={styles.quickActions}>
                                <button
                                    className={styles.quickBtn}
                                    onClick={() => handleCopyAddress(order.customerAddress || '')}
                                    disabled={!order.customerAddress}
                                    type="button"
                                >
                                    <Copy size={16} />
                                    Copiar direccion
                                </button>
                                {order.customerAddress && (
                                    <a
                                        className={styles.quickBtn}
                                        href={getDirectionsUrl(order.customerAddress)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Navigation size={16} />
                                        Ruta
                                    </a>
                                )}
                                {order.customerAddress && (
                                    <a
                                        className={styles.quickBtn}
                                        href={getMapsUrl(order.customerAddress)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <MapPin size={16} />
                                        Mapa
                                    </a>
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
                                        onClick={() => setConfirmOrder(order)}
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

            {confirmOrder && (
                <div className={styles.modalOverlay} onClick={() => setConfirmOrder(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalHeaderTitle}>
                                <h2>Confirmar entrega</h2>
                                <span className={styles.modalHeaderBadge}>{confirmOrder.orderNumber}</span>
                            </div>
                            <button className={styles.closeBtn} onClick={() => setConfirmOrder(null)}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.modalSummary}>
                                <div className={styles.modalCustomer}>
                                    {confirmOrder.customerName || 'Cliente'}
                                </div>
                                <div className={styles.modalAddress}>
                                    {confirmOrder.customerAddress || 'Sin direccion'}
                                </div>
                                <div className={styles.modalTotal}>
                                    Total: {formatPrice(confirmOrder.total)}
                                </div>
                                <div className={styles.modalItems}>
                                    {confirmOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                </div>
                                <div className={styles.modalPayment}>
                                    <span>Pago: {getPaymentLabel(confirmOrder.paymentMethod)}</span>
                                    <span className={confirmOrder.paymentStatus === 'paid' ? styles.paymentPaid : styles.paymentPending}>
                                        {confirmOrder.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                                    </span>
                                </div>
                                <div className={styles.modalItemsList}>
                                    {confirmOrder.items.slice(0, 3).map((item, index) => (
                                        <div key={`${item.productId}-${index}`} className={styles.modalItemRow}>
                                            <span>{item.quantity}x</span>
                                            <span className={styles.modalItemName}>{item.productName}</span>
                                            <span className={styles.modalItemPrice}>{formatPrice(item.totalPrice)}</span>
                                        </div>
                                    ))}
                                    {confirmOrder.items.length > 3 && (
                                        <div className={styles.modalMore}>
                                            +{confirmOrder.items.length - 3} items mas
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.cancelBtn} onClick={() => setConfirmOrder(null)}>
                                    Cancelar
                                </button>
                                <button
                                    className={styles.confirmBtn}
                                    onClick={() => {
                                        if (!confirmOrder?.id) return
                                        handleCompleteDelivery(confirmOrder.id)
                                        setConfirmOrder(null)
                                    }}
                                    disabled={processingId === confirmOrder.id}
                                >
                                    {processingId === confirmOrder.id ? 'Finalizando...' : 'Confirmar entrega'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
