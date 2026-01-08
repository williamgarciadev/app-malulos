import { useState, useEffect, useRef, useCallback } from 'react'
import { ordersApi, fetchApi } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { useCashStore } from '@/stores/cashStore'
import type { Order, PaymentMethod } from '@/types'
import {
    Send,
    Banknote,
    Smartphone,
    Wallet,
    X,
    CheckCheck,
    XCircle,
    RefreshCw,
    Package,
    Clock,
    AlertTriangle,
    Copy,
    Check,
    Volume2,
    VolumeX,
    Truck,
    CreditCard,
    History
} from 'lucide-react'
import styles from './TelegramOrders.module.css'

type TabType = 'pending' | 'contraentrega' | 'processed'

export function TelegramOrders() {
    const { addToast } = useToast()
    const { currentSession, refreshSession } = useCashStore()

    const [allOrders, setAllOrders] = useState<Order[]>([])
    const [activeTab, setActiveTab] = useState<TabType>('pending')
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('nequi')
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [cancelOrder, setCancelOrder] = useState<Order | null>(null)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
    const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set())
    const [, setTick] = useState(0)

    const previousOrderIdsRef = useRef<Set<number>>(new Set())
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Inicializar audio
    useEffect(() => {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQc7mt7XnH8GSJPZ05qEDFCJ0suViRhdiM3GkosoZ4fKwYqPL3OEyLqAljZ/gcW0e5w7i36/rnChP5V7uapknEaferahYJdMqHOvoVqRUK9tqZpSlFq2Z6OTTZBktmOdj0qMa7dekopIiXO4WZaKR4Z5tlSSikaEf7NRj4pFgYWxTYyKRH6KrkiJikN7j6pFholDd5OnQoWJQnSXo0CDiUFxmp9AgoY/bp2cP4CFPmyhnj1+hDxqpJ07fIM7aaafO3yCOmiooTt7gDhnqqI7en86Z62kO3l9OWeupDt4fDhoq6Q7eHs4aKukO3h7OGirpDt4ezhpqqQ7eHs4aaqkO3h7OGmqpDt4ezhpqqQ7eHs4aaqlO3h7OGmqpTt4ezhpqqU7eHs4aaqlO3h7OGmqpTt4ezhpqqU7')
    }, [])

    // Timer para actualizar tiempo relativo cada minuto
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000)
        return () => clearInterval(interval)
    }, [])

    const loadOrders = useCallback(async () => {
        try {
            const orders = await ordersApi.getAll()
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const telegramOrders = orders.filter((order: Order) => {
                if (order.origin !== 'telegram') return false
                const orderDate = new Date(order.createdAt)
                orderDate.setHours(0, 0, 0, 0)
                return orderDate.getTime() === today.getTime()
            })

            // Detectar nuevos pedidos pendientes
            const currentPendingIds = new Set(
                telegramOrders
                    .filter((o: Order) => o.paymentStatus === 'pending' && o.status === 'pending' && o.id !== undefined)
                    .map((o: Order) => o.id as number)
            )

            const newIds: number[] = []
            currentPendingIds.forEach(id => {
                if (!previousOrderIdsRef.current.has(id)) {
                    newIds.push(id)
                }
            })

            if (newIds.length > 0 && previousOrderIdsRef.current.size > 0) {
                // Hay nuevos pedidos
                setNewOrderIds(prev => new Set([...prev, ...newIds]))
                if (soundEnabled && audioRef.current) {
                    audioRef.current.play().catch(() => {})
                }
                addToast('info', 'Nuevo pedido', `${newIds.length} nuevo(s) pedido(s) de Telegram`)
            }

            previousOrderIdsRef.current = currentPendingIds
            setAllOrders(telegramOrders)
        } catch (error) {
            console.error('Error loading Telegram orders:', error)
        }
    }, [soundEnabled, addToast])

    useEffect(() => {
        loadOrders()
        const interval = setInterval(loadOrders, 10000)
        return () => clearInterval(interval)
    }, [loadOrders])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await loadOrders()
        setTimeout(() => setIsRefreshing(false), 500)
    }

    // Filtrar ordenes segun tab activa
    const getFilteredOrders = () => {
        switch (activeTab) {
            case 'pending':
                return allOrders.filter(o =>
                    o.paymentStatus === 'pending' &&
                    o.status === 'pending' &&
                    o.paymentMethod !== 'cash'
                )
            case 'contraentrega':
                return allOrders.filter(o =>
                    (o.paymentMethod === 'cash' || o.notes?.includes('CONTRAENTREGA')) &&
                    o.status !== 'delivered' &&
                    o.status !== 'cancelled'
                )
            case 'processed':
                return allOrders.filter(o =>
                    o.paymentStatus === 'paid' ||
                    o.status === 'delivered' ||
                    o.status === 'cancelled'
                )
            default:
                return []
        }
    }

    const filteredOrders = getFilteredOrders()

    // Conteos para tabs
    const counts = {
        pending: allOrders.filter(o => o.paymentStatus === 'pending' && o.status === 'pending' && o.paymentMethod !== 'cash').length,
        contraentrega: allOrders.filter(o => (o.paymentMethod === 'cash' || o.notes?.includes('CONTRAENTREGA')) && o.status !== 'delivered' && o.status !== 'cancelled').length,
        processed: allOrders.filter(o => o.paymentStatus === 'paid' || o.status === 'delivered' || o.status === 'cancelled').length
    }

    const handleConfirmPayment = async () => {
        if (!selectedOrder) return
        if (!currentSession) {
            addToast('error', 'Caja cerrada', 'Debes abrir caja para confirmar pagos')
            return
        }

        try {
            setIsConfirming(true)
            const confirmedAt = new Date()

            await fetchApi(`/orders/${selectedOrder.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'preparing',
                    paymentStatus: 'paid',
                    paymentMethod,
                    paidAmount: selectedOrder.total,
                    confirmedAt
                })
            })

            const updates: Record<string, number> = {
                cashSales: currentSession.cashSales || 0,
                cardSales: currentSession.cardSales || 0,
                transferSales: currentSession.transferSales || 0,
                nequiSales: currentSession.nequiSales || 0,
                davipplataSales: currentSession.davipplataSales || 0,
                totalSales: (currentSession.totalSales || 0) + selectedOrder.total,
                ordersCount: (currentSession.ordersCount || 0) + 1
            }

            if (paymentMethod === 'nequi') updates.nequiSales += selectedOrder.total
            else if (paymentMethod === 'daviplata') updates.davipplataSales += selectedOrder.total
            else if (paymentMethod === 'transfer') updates.transferSales += selectedOrder.total

            await fetchApi(`/cash-sessions/${currentSession.id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            })

            await refreshSession()

            // Remover de nuevos
            if (selectedOrder.id !== undefined) {
                setNewOrderIds(prev => {
                    const next = new Set(prev)
                    next.delete(selectedOrder.id as number)
                    return next
                })
            }

            await loadOrders()

            addToast('success', 'Pago confirmado', `Pedido ${selectedOrder.orderNumber} confirmado`)
            setShowPaymentModal(false)
            setSelectedOrder(null)
        } catch (error) {
            console.error('Error confirming payment:', error)
            addToast('error', 'Error', 'No se pudo confirmar el pago')
        } finally {
            setIsConfirming(false)
        }
    }

    const handleMarkCashOnDelivery = async (order: Order) => {
        try {
            await fetchApi(`/orders/${order.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'preparing',
                    paymentMethod: 'cash',
                    notes: (order.notes || '') + '\n[CONTRAENTREGA - Pago pendiente al entregar]'
                })
            })

            if (order.id !== undefined) {
                setNewOrderIds(prev => {
                    const next = new Set(prev)
                    next.delete(order.id as number)
                    return next
                })
            }

            await loadOrders()
            addToast('info', 'Contraentrega', `Pedido ${order.orderNumber} marcado como contraentrega`)
        } catch (error) {
            console.error('Error marking cash on delivery:', error)
            addToast('error', 'Error', 'No se pudo marcar como contraentrega')
        }
    }

    const handleMarkDelivered = async (order: Order) => {
        if (!currentSession) {
            addToast('error', 'Caja cerrada', 'Debes abrir caja para marcar entregado')
            return
        }

        try {
            await fetchApi(`/orders/${order.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'delivered',
                    paymentStatus: 'paid',
                    paidAmount: order.total
                })
            })

            // Actualizar ventas de caja
            const updates: Record<string, number> = {
                cashSales: (currentSession.cashSales || 0) + order.total,
                totalSales: (currentSession.totalSales || 0) + order.total,
                ordersCount: (currentSession.ordersCount || 0) + 1
            }

            await fetchApi(`/cash-sessions/${currentSession.id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            })

            await refreshSession()
            await loadOrders()
            addToast('success', 'Entregado', `Pedido ${order.orderNumber} entregado y cobrado`)
        } catch (error) {
            console.error('Error marking delivered:', error)
            addToast('error', 'Error', 'No se pudo marcar como entregado')
        }
    }

    const handleCancelOrder = async () => {
        if (!cancelOrder) return

        try {
            setIsCancelling(true)
            await fetchApi(`/orders/${cancelOrder.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'cancelled'
                })
            })

            if (cancelOrder.id !== undefined) {
                setNewOrderIds(prev => {
                    const next = new Set(prev)
                    next.delete(cancelOrder.id as number)
                    return next
                })
            }

            await loadOrders()
            addToast('info', 'Pedido cancelado', `Pedido ${cancelOrder.orderNumber} cancelado`)
            setShowCancelModal(false)
            setCancelOrder(null)
        } catch (error) {
            console.error('Error canceling order:', error)
            addToast('error', 'Error', 'No se pudo cancelar el pedido')
        } finally {
            setIsCancelling(false)
        }
    }

    const copyAddress = async (address: string, orderId: number | undefined) => {
        if (orderId === undefined) return
        try {
            await navigator.clipboard.writeText(address)
            setCopiedAddress(String(orderId))
            setTimeout(() => setCopiedAddress(null), 2000)
        } catch {
            addToast('error', 'Error', 'No se pudo copiar la direccion')
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    const getTimeAgo = (dateInput: Date | string) => {
        const now = new Date()
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) return 'Ahora'
        if (diffMins < 60) return `Hace ${diffMins} min`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `Hace ${diffHours}h ${diffMins % 60}m`
        return date.toLocaleString()
    }

    const isUrgent = (dateInput: Date | string) => {
        const now = new Date()
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
        const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
        return diffMins >= 10
    }

    const getPaymentIcon = (method?: string) => {
        switch (method) {
            case 'nequi': return <Smartphone size={14} className={styles.iconNequi} />
            case 'daviplata': return <Wallet size={14} className={styles.iconDaviplata} />
            case 'transfer': return <CreditCard size={14} className={styles.iconTransfer} />
            case 'cash': return <Banknote size={14} className={styles.iconCash} />
            default: return null
        }
    }

    const getPaymentLabel = (method?: string) => {
        switch (method) {
            case 'nequi': return 'Nequi'
            case 'daviplata': return 'DaviPlata'
            case 'transfer': return 'Transferencia'
            case 'cash': return 'Contraentrega'
            default: return method
        }
    }

    // Resumen de ventas del dia
    const todaySummary = {
        total: allOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.total, 0),
        count: allOrders.filter(o => o.paymentStatus === 'paid').length,
        byMethod: {
            nequi: allOrders.filter(o => o.paymentStatus === 'paid' && o.paymentMethod === 'nequi').reduce((sum, o) => sum + o.total, 0),
            daviplata: allOrders.filter(o => o.paymentStatus === 'paid' && o.paymentMethod === 'daviplata').reduce((sum, o) => sum + o.total, 0),
            transfer: allOrders.filter(o => o.paymentStatus === 'paid' && o.paymentMethod === 'transfer').reduce((sum, o) => sum + o.total, 0),
            cash: allOrders.filter(o => o.paymentStatus === 'paid' && o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0)
        }
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <Send size={32} />
                    <div>
                        <h1>Pedidos Telegram</h1>
                        <p>Gestion de pedidos externos y delivery</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={`${styles.soundBtn} ${!soundEnabled ? styles.soundMuted : ''}`}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title={soundEnabled ? 'Silenciar alertas' : 'Activar alertas'}
                    >
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <button
                        className={styles.refreshBtn}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={20} className={isRefreshing ? styles.spinning : ''} />
                        Actualizar
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    <Clock size={18} />
                    Pendientes
                    {counts.pending > 0 && (
                        <span className={`${styles.badge} ${newOrderIds.size > 0 ? styles.badgePulse : ''}`}>
                            {counts.pending}
                        </span>
                    )}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'contraentrega' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('contraentrega')}
                >
                    <Truck size={18} />
                    Contraentrega
                    {counts.contraentrega > 0 && (
                        <span className={styles.badge}>{counts.contraentrega}</span>
                    )}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'processed' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('processed')}
                >
                    <History size={18} />
                    Procesados
                    {counts.processed > 0 && (
                        <span className={styles.badgeSecondary}>{counts.processed}</span>
                    )}
                </button>
            </div>

            {/* Resumen del dia (solo en tab procesados) */}
            {activeTab === 'processed' && todaySummary.count > 0 && (
                <div className={styles.daySummary}>
                    <h3>Resumen del dia</h3>
                    <div className={styles.summaryGrid}>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Total Vendido</span>
                            <span className={styles.summaryValue}>{formatPrice(todaySummary.total)}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Pedidos</span>
                            <span className={styles.summaryValue}>{todaySummary.count}</span>
                        </div>
                        {todaySummary.byMethod.nequi > 0 && (
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}><Smartphone size={14} /> Nequi</span>
                                <span className={styles.summaryValue}>{formatPrice(todaySummary.byMethod.nequi)}</span>
                            </div>
                        )}
                        {todaySummary.byMethod.daviplata > 0 && (
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}><Wallet size={14} /> DaviPlata</span>
                                <span className={styles.summaryValue}>{formatPrice(todaySummary.byMethod.daviplata)}</span>
                            </div>
                        )}
                        {todaySummary.byMethod.transfer > 0 && (
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}><CreditCard size={14} /> Transfer</span>
                                <span className={styles.summaryValue}>{formatPrice(todaySummary.byMethod.transfer)}</span>
                            </div>
                        )}
                        {todaySummary.byMethod.cash > 0 && (
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}><Banknote size={14} /> Efectivo</span>
                                <span className={styles.summaryValue}>{formatPrice(todaySummary.byMethod.cash)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {filteredOrders.length === 0 ? (
                <div className={styles.emptyState}>
                    <Package size={64} />
                    <h2>
                        {activeTab === 'pending' && 'No hay pedidos pendientes'}
                        {activeTab === 'contraentrega' && 'No hay pedidos contraentrega'}
                        {activeTab === 'processed' && 'No hay pedidos procesados hoy'}
                    </h2>
                    <p>
                        {activeTab === 'pending' && 'Los nuevos pedidos de Telegram apareceran aqui automaticamente'}
                        {activeTab === 'contraentrega' && 'Los pedidos marcados como contraentrega apareceran aqui'}
                        {activeTab === 'processed' && 'Los pedidos confirmados del dia apareceran aqui'}
                    </p>
                </div>
            ) : (
                <div className={styles.ordersGrid}>
                    {filteredOrders.map(order => (
                        <div
                            key={order.id ?? order.orderNumber}
                            className={`${styles.orderCard}
                                ${order.status === 'cancelled' ? styles.orderCardCancelled : ''}
                                ${order.id !== undefined && newOrderIds.has(order.id) ? styles.orderCardNew : ''}
                                ${isUrgent(order.createdAt) && activeTab === 'pending' ? styles.orderCardUrgent : ''}`}
                        >
                            <div className={styles.orderMain}>
                                <div className={styles.orderHeader}>
                                    <div>
                                        <h3>#{order.orderNumber}</h3>
                                        <div className={styles.orderTimeRow}>
                                            <Clock size={12} />
                                            <span className={`${styles.orderTime} ${isUrgent(order.createdAt) && activeTab === 'pending' ? styles.urgent : ''}`}>
                                                {getTimeAgo(order.createdAt)}
                                            </span>
                                            {isUrgent(order.createdAt) && activeTab === 'pending' && (
                                                <AlertTriangle size={14} className={styles.urgentIcon} />
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.orderHeaderMeta}>
                                        {order.status === 'cancelled' && (
                                            <span className={styles.cancelledBadge}>Cancelado</span>
                                        )}
                                        {order.status === 'delivered' && (
                                            <span className={styles.deliveredBadge}>Entregado</span>
                                        )}
                                        {order.paymentStatus === 'paid' && order.status !== 'cancelled' && (
                                            <span className={styles.paidBadge}>Pagado</span>
                                        )}
                                        {order.paymentMethod && (
                                            <span className={styles.paymentBadge}>
                                                {getPaymentIcon(order.paymentMethod)}
                                                {getPaymentLabel(order.paymentMethod)}
                                            </span>
                                        )}
                                        <div className={styles.orderTotal}>{formatPrice(order.total)}</div>
                                    </div>
                                </div>

                                <div className={styles.customerInfo}>
                                    <div className={styles.infoRow}>
                                        <span className={styles.label}>Cliente:</span>
                                        <span>{order.customerName || 'Sin nombre'}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.label}>Telefono:</span>
                                        <span>{order.customerPhone || 'Sin telefono'}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.label}>Direccion:</span>
                                        <div className={styles.addressRow}>
                                            <span>{order.customerAddress || 'Sin direccion'}</span>
                                            {order.customerAddress && (
                                                <button
                                                    className={styles.copyBtn}
                                                    onClick={() => copyAddress(order.customerAddress!, order.id)}
                                                    title="Copiar direccion"
                                                >
                                                    {copiedAddress === String(order.id) ? (
                                                        <Check size={14} className={styles.copied} />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {order.notes && (
                                    <div className={styles.orderNotes}>
                                        <strong>Notas:</strong> {order.notes}
                                    </div>
                                )}
                            </div>

                            <div className={styles.orderItems}>
                                <h4>Productos:</h4>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className={styles.orderItem}>
                                        <span className={styles.itemQty}>{item.quantity}x</span>
                                        <span className={styles.itemName}>{item.productName}</span>
                                        <span className={styles.itemPrice}>{formatPrice(item.totalPrice)}</span>
                                    </div>
                                ))}
                            </div>

                            {activeTab === 'pending' && (
                                <div className={styles.orderActions}>
                                    <button
                                        className={styles.confirmBtn}
                                        onClick={() => {
                                            setSelectedOrder(order)
                                            setShowPaymentModal(true)
                                        }}
                                    >
                                        <CheckCheck size={18} />
                                        Confirmar pago
                                    </button>
                                    <button
                                        className={styles.contraBtn}
                                        onClick={() => handleMarkCashOnDelivery(order)}
                                    >
                                        <Truck size={18} />
                                        Contraentrega
                                    </button>
                                    <button
                                        className={styles.cancelBtn}
                                        onClick={() => {
                                            setCancelOrder(order)
                                            setShowCancelModal(true)
                                        }}
                                    >
                                        <XCircle size={18} />
                                        Cancelar
                                    </button>
                                </div>
                            )}

                            {activeTab === 'contraentrega' && order.status !== 'delivered' && (
                                <div className={styles.orderActions}>
                                    <button
                                        className={styles.deliveredBtn}
                                        onClick={() => handleMarkDelivered(order)}
                                    >
                                        <CheckCheck size={18} />
                                        Marcar Entregado y Cobrado
                                    </button>
                                    <button
                                        className={styles.cancelBtn}
                                        onClick={() => {
                                            setCancelOrder(order)
                                            setShowCancelModal(true)
                                        }}
                                    >
                                        <XCircle size={18} />
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de pago */}
            {showPaymentModal && selectedOrder && (
                <div className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
                    <div className={styles.paymentModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Confirmar pago</h2>
                            <button className={styles.closeModalBtn} onClick={() => setShowPaymentModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.orderSummary}>
                                <h3>Pedido #{selectedOrder.orderNumber}</h3>
                                <p>{selectedOrder.customerName} | {selectedOrder.customerPhone}</p>
                                <div className={styles.totalAmount}>{formatPrice(selectedOrder.total)}</div>
                            </div>

                            <div className={styles.paymentMethodSelector}>
                                <h3>Metodo de pago recibido</h3>
                                <div className={styles.methodButtons}>
                                    <button
                                        className={`${styles.methodBtn} ${styles.methodNequi} ${paymentMethod === 'nequi' ? styles.methodActive : ''}`}
                                        onClick={() => setPaymentMethod('nequi')}
                                    >
                                        <Smartphone size={24} />
                                        <span>Nequi</span>
                                    </button>
                                    <button
                                        className={`${styles.methodBtn} ${styles.methodDaviplata} ${paymentMethod === 'daviplata' ? styles.methodActive : ''}`}
                                        onClick={() => setPaymentMethod('daviplata')}
                                    >
                                        <Wallet size={24} />
                                        <span>DaviPlata</span>
                                    </button>
                                    <button
                                        className={`${styles.methodBtn} ${paymentMethod === 'transfer' ? styles.methodActive : ''}`}
                                        onClick={() => setPaymentMethod('transfer')}
                                    >
                                        <CreditCard size={24} />
                                        <span>Transferencia</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                className={styles.confirmPaymentBtn}
                                onClick={handleConfirmPayment}
                                disabled={isConfirming || !currentSession}
                            >
                                <CheckCheck size={20} />
                                {isConfirming ? 'Confirmando...' : 'Confirmar pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de cancelacion */}
            {showCancelModal && cancelOrder && (
                <div className={styles.modalOverlay} onClick={() => setShowCancelModal(false)}>
                    <div className={styles.cancelModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Cancelar pedido</h2>
                            <button className={styles.closeModalBtn} onClick={() => setShowCancelModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.cancelSummary}>
                                <p>Vas a cancelar el pedido <strong>{cancelOrder.orderNumber}</strong>.</p>
                                <p className={styles.cancelHint}>El cliente sera notificado por Telegram.</p>
                            </div>
                            <div className={styles.cancelActions}>
                                <button
                                    className={styles.cancelGhostBtn}
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={isCancelling}
                                >
                                    Volver
                                </button>
                                <button
                                    className={styles.cancelConfirmBtn}
                                    onClick={handleCancelOrder}
                                    disabled={isCancelling}
                                >
                                    {isCancelling ? 'Cancelando...' : 'Confirmar cancelacion'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
