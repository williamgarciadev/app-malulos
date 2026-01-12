import { useState, useEffect } from 'react'
import { fetchApi } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { X, Banknote, CreditCard, Check, Receipt, Smartphone, Wallet } from 'lucide-react'
import type { Order, PaymentMethod, AppConfig, CashSession } from '@/types'
import { useCashStore } from '@/stores/cashStore'
import styles from './PaymentModal.module.css'
import { generateTicketPDF } from '@/services/ticketService'

interface PaymentModalProps {
    order: Order
    tableName: string
    onClose: () => void
    onPaymentComplete: () => void
}

export function PaymentModal({ order, tableName, onClose, onPaymentComplete }: PaymentModalProps) {
    const { addToast } = useToast()
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
    const [receivedAmount, setReceivedAmount] = useState<string>('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [isCompact, setIsCompact] = useState(false)
    const { currentSession, refreshSession } = useCashStore()

    // Resetear valores cuando cambie la orden
    useEffect(() => {
        setPaymentMethod('cash')
        setReceivedAmount('')
        setIsProcessing(false)
        setShowSuccess(false)
    }, [order.id])

    useEffect(() => {
        const updateCompact = () => {
            setIsCompact(window.innerHeight <= 760)
        }

        updateCompact()
        window.addEventListener('resize', updateCompact)
        return () => window.removeEventListener('resize', updateCompact)
    }, [])

    const total = order.total
    const received = parseFloat(receivedAmount) || 0
    const change = received - total

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    const quickAmounts = [20000, 50000, 100000]
    const visibleItems = isCompact ? order.items.slice(0, 2) : order.items
    const hiddenItems = order.items.length - visibleItems.length

    const handlePrint = async () => {
        try {
            let config: AppConfig
            try {
                config = await fetchApi<AppConfig>('/config')
            } catch (configError) {
                console.warn('Using default config for PDF:', configError)
                // Usar configuración por defecto si falla
                config = {
                    businessName: 'Malulos',
                    taxRate: 0,
                    currency: 'COP',
                    currencySymbol: '$',
                    printReceipt: true,
                    soundEnabled: true
                }
            }

            generateTicketPDF({
                ...order,
                status: 'completed',
                paymentStatus: 'paid',
                paymentMethod,
                paidAmount: paymentMethod === 'cash' ? received : total,
                completedAt: new Date()
            }, config)
        } catch (error) {
            console.error('Error generating PDF:', error)
            addToast('error', 'Error', 'No se pudo generar el ticket')
        }
    }

    const handlePayment = async () => {
        if (paymentMethod === 'cash' && received < total) return

        setIsProcessing(true)

        try {
            const completedAt = new Date()
            const paidAmount = paymentMethod === 'cash' ? received : total

            // 1. Actualizar pedido como pagado
            await fetchApi(`/orders/${order.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'completed',
                    paymentStatus: 'paid',
                    paymentMethod,
                    paidAmount,
                    completedAt
                })
            })

            // 2. Actualizar sesión de caja
            if (currentSession && currentSession.id) {
                const updates: Partial<CashSession> = {
                    cashSales: currentSession.cashSales || 0,
                    cardSales: currentSession.cardSales || 0,
                    transferSales: currentSession.transferSales || 0,
                    nequiSales: currentSession.nequiSales || 0,
                    davipplataSales: currentSession.davipplataSales || 0,
                    totalSales: (currentSession.totalSales || 0) + total,
                    ordersCount: (currentSession.ordersCount || 0) + 1
                }

                // Incrementar ventas según el método
                if (paymentMethod === 'cash') updates.cashSales! += total
                else if (paymentMethod === 'card') updates.cardSales! += total
                else if (paymentMethod === 'transfer') updates.transferSales! += total
                else if (paymentMethod === 'nequi') updates.nequiSales! += total
                else if (paymentMethod === 'daviplata') updates.davipplataSales! += total

                await fetchApi(`/cash-sessions/${currentSession.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                })

                // Recargar sesión actualizada
                await refreshSession()
            }

            // 3. Liberar la mesa
            if (order.tableId) {
                await fetchApi(`/tables/${order.tableId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        status: 'available',
                        currentOrderId: null
                    })
                })
            }

            setShowSuccess(true)
            
            // IMPRIMIR TICKET AUTOMÁTICAMENTE
            handlePrint()
        } catch (error) {
            console.error('Error processing payment:', error)
            addToast('error', 'Error en el pago', 'No se pudo procesar el pago')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleFinish = () => {
        onPaymentComplete()
    }

    if (showSuccess) {
        return (
            <div className={styles.overlay} onClick={handleFinish}>
                <div className={`${styles.modal} ${styles.successModal}`} onClick={e => e.stopPropagation()}>
                    <div className={styles.successHeader}>
                        <div className={styles.successIcon}>
                            <Check size={48} />
                        </div>
                        <h2 className={styles.title}>¡Pago Exitoso!</h2>
                        <p className={styles.subtitle}>La cuenta de {tableName} ha sido pagada.</p>
                    </div>

                    <div className={styles.successStats}>
                        <div className={styles.statLine}>
                            <span>Total:</span>
                            <span className={styles.statBold}>{formatPrice(total)}</span>
                        </div>
                        {paymentMethod === 'cash' && (
                            <div className={styles.statLine}>
                                <span>Cambio:</span>
                                <span className={styles.statChange}>{formatPrice(change)}</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.successActions}>
                        <button className={styles.printBtn} onClick={handlePrint}>
                            <Receipt size={20} />
                            <span>Descargar Ticket</span>
                        </button>
                        <button className={styles.finishBtn} onClick={handleFinish}>
                            <span>Finalizar</span>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={24} />
                </button>

                <div className={styles.header}>
                    <Receipt size={32} className={styles.headerIcon} />
                    <h2 className={styles.title}>Cuenta - {tableName}</h2>
                    <p className={styles.orderNumber}>{order.orderNumber}</p>
                </div>

                {/* Resumen del pedido */}
                <div className={styles.summary}>
                    <h3 className={styles.sectionTitle}>Resumen del Pedido</h3>
                    <ul className={styles.itemsList}>
                        {visibleItems.map((item, index) => (
                            <li key={index} className={styles.item}>
                                <span className={styles.itemQty}>{item.quantity}x</span>
                                <span className={styles.itemName}>{item.productName}</span>
                                <span className={styles.itemPrice}>{formatPrice(item.totalPrice)}</span>
                            </li>
                        ))}
                    </ul>
                    {isCompact && hiddenItems > 0 && (
                        <div className={styles.itemsMore}>+ {hiddenItems} items más</div>
                    )}

                    <div className={styles.totalRow}>
                        <span>Total a Pagar</span>
                        <span className={styles.totalAmount}>{formatPrice(total)}</span>
                    </div>
                </div>

                {/* Método de pago */}
                <div className={styles.paymentMethod}>
                    <h3 className={styles.sectionTitle}>Método de Pago</h3>
                    <div className={styles.methodButtons}>
                        <button
                            className={`${styles.methodBtn} ${paymentMethod === 'cash' ? styles.methodActive : ''}`}
                            onClick={() => setPaymentMethod('cash')}
                        >
                            <Banknote size={24} />
                            <span>Efectivo</span>
                        </button>
                        <button
                            className={`${styles.methodBtn} ${paymentMethod === 'card' ? styles.methodActive : ''}`}
                            onClick={() => setPaymentMethod('card')}
                        >
                            <CreditCard size={24} />
                            <span>Tarjeta</span>
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

                {/* Monto recibido (solo efectivo) */}
                {paymentMethod === 'cash' && (
                    <div className={styles.cashSection}>
                        <h3 className={styles.sectionTitle}>Monto Recibido</h3>
                        <input
                            type="number"
                            className={styles.amountInput}
                            value={receivedAmount}
                            onChange={e => setReceivedAmount(e.target.value)}
                            placeholder="0"
                        />
                        <div className={styles.quickAmounts}>
                            {quickAmounts.map(amount => (
                                <button
                                    key={amount}
                                    className={styles.quickBtn}
                                    onClick={() => setReceivedAmount(String(amount))}
                                >
                                    {formatPrice(amount)}
                                </button>
                            ))}
                            <button
                                className={styles.quickBtn}
                                onClick={() => setReceivedAmount(String(total))}
                            >
                                Exacto
                            </button>
                        </div>

                        {received >= total && (
                            <div className={styles.changeRow}>
                                <span>Cambio</span>
                                <span className={styles.changeAmount}>{formatPrice(change)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Botón de confirmar */}
                <button
                    className={styles.confirmBtn}
                    onClick={handlePayment}
                    disabled={isProcessing || (paymentMethod === 'cash' && received < total)}
                >
                    {isProcessing ? (
                        <span>Procesando...</span>
                    ) : (
                        <>
                            <Check size={20} />
                            <span>Confirmar Pago</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
