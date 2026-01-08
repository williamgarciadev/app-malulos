import { useState, useEffect } from 'react'
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
    Package
} from 'lucide-react'
import styles from './TelegramOrders.module.css'

export function TelegramOrders() {
    const { addToast } = useToast()
    const { currentSession, refreshSession } = useCashStore()

    const [pendingOrders, setPendingOrders] = useState<Order[]>([])
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('nequi')
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [cancelOrder, setCancelOrder] = useState<Order | null>(null)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)

    useEffect(() => {
        loadPendingOrders()

        // Polling every 10 seconds to update pending orders
        const interval = setInterval(loadPendingOrders, 10000)
        return () => clearInterval(interval)
    }, [])

    const loadPendingOrders = async () => {
        try {
            const allOrders = await ordersApi.getAll()
            const telegram = allOrders.filter(order =>
                order.origin === 'telegram' &&
                order.paymentStatus === 'pending' &&
                (order.status === 'pending' || order.status === 'cancelled')
            )
            setPendingOrders(telegram)
        } catch (error) {
            console.error('Error loading pending Telegram orders:', error)
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await loadPendingOrders()
        setTimeout(() => setIsRefreshing(false), 500)
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

            const updates: any = {
                cashSales: currentSession.cashSales || 0,
                cardSales: currentSession.cardSales || 0,
                transferSales: currentSession.transferSales || 0,
                nequiSales: currentSession.nequiSales || 0,
                davipplataSales: currentSession.davipplataSales || 0,
                totalSales: (currentSession.totalSales || 0) + selectedOrder.total,
                ordersCount: (currentSession.ordersCount || 0) + 1
            }

            if (paymentMethod === 'nequi') updates.nequiSales! += selectedOrder.total
            else if (paymentMethod === 'daviplata') updates.davipplataSales! += selectedOrder.total
            else if (paymentMethod === 'transfer') updates.transferSales! += selectedOrder.total

            await fetchApi(`/cash-sessions/${currentSession.id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            })

            await refreshSession()
            await loadPendingOrders()

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
                    notes: (order.notes || '') + '\n[CONTRAENTREGA - Pago pendiente al entregar]'
                })
            })

            await loadPendingOrders()
            addToast('info', 'Contraentrega', `Pedido ${order.orderNumber} marcado como contraentrega`)
        } catch (error) {
            console.error('Error marking cash on delivery:', error)
            addToast('error', 'Error', 'No se pudo marcar como contraentrega')
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

            setPendingOrders(prev =>
                prev.map(order =>
                    order.id === cancelOrder.id ? { ...order, status: 'cancelled' } : order
                )
            )
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

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
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
                <button
                    className={styles.refreshBtn}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={20} className={isRefreshing ? styles.spinning : ''} />
                    Actualizar
                </button>
            </header>

            {pendingOrders.length === 0 ? (
                <div className={styles.emptyState}>
                    <Package size={64} />
                    <h2>No hay pedidos pendientes</h2>
                    <p>Los nuevos pedidos de Telegram apareceran aqui automaticamente</p>
                </div>
            ) : (
                <div className={styles.ordersGrid}>
                    {pendingOrders.map(order => (
                        <div
                            key={order.id}
                            className={`${styles.orderCard} ${order.status === 'cancelled' ? styles.orderCardCancelled : ''}`}
                        >
                            <div className={styles.orderMain}>
                            <div className={styles.orderHeader}>
                                <div>
                                    <h3>#{order.orderNumber}</h3>
                                    <p className={styles.orderTime}>
                                        {new Date(order.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className={styles.orderHeaderMeta}>
                                    {order.status === 'cancelled' && (
                                        <span className={styles.cancelledBadge}>Cancelado</span>
                                    )}
                                    {order.paymentMethod && order.paymentStatus === 'pending' && (
                                        <span className={styles.paymentBadge}>
                                            {order.paymentMethod === 'nequi' ? 'Nequi' :
                                             order.paymentMethod === 'daviplata' ? 'DaviPlata' :
                                             order.paymentMethod === 'transfer' ? 'Transferencia' :
                                             order.paymentMethod === 'cash' ? 'Contraentrega' : order.paymentMethod}
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
                                        <span>{order.customerAddress || 'Sin direccion'}</span>
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

                            <div className={styles.orderActions}>
                                <button
                                    className={styles.confirmBtn}
                                    disabled={order.status === 'cancelled'}
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
                                    disabled={order.status === 'cancelled'}
                                    onClick={() => handleMarkCashOnDelivery(order)}
                                >
                                    <Banknote size={18} />
                                    Contraentrega
                                </button>
                                <button
                                    className={styles.cancelBtn}
                                    disabled={order.status === 'cancelled'}
                                    onClick={() => {
                                        setCancelOrder(order)
                                        setShowCancelModal(true)
                                    }}
                                >
                                    <XCircle size={18} />
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                                        className={`${styles.methodBtn} ${paymentMethod === 'transfer' ? styles.methodActive : ''}`}
                                        onClick={() => setPaymentMethod('transfer')}
                                    >
                                        <Banknote size={24} />
                                        <span>Transferencia</span>
                                    </button>
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
                                <p className={styles.cancelHint}>Esta accion se reflejara en cocina y reportes.</p>
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
