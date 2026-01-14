import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApi } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/context/ToastContext'
import { Users, Receipt, Plus, Loader2, ArrowRightLeft, XCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { PaymentModal } from '@/components/payment/PaymentModal'
import type { TableStatus, RestaurantTable, Order } from '@/types'
import styles from './Tables.module.css'

type TableDisplayStatus = TableStatus | 'kitchen' | 'ready'

const displayStatusLabels: Record<TableDisplayStatus, string> = {
    available: 'Disponible',
    occupied: 'Ocupada',
    paying: 'Por Pagar',
    reserved: 'Reservada',
    kitchen: 'En Cocina',
    ready: 'Listo'
}

const displayStatusColors: Record<TableDisplayStatus, string> = {
    available: 'success',
    occupied: 'info',
    paying: 'danger',
    reserved: 'info',
    kitchen: 'warning',
    ready: 'success'
}

export function Tables() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [tables, setTables] = useState<RestaurantTable[]>([])
    const [activeOrders, setActiveOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
    const [orderToPay, setOrderToPay] = useState<Order | null>(null)
    const [openTable, setOpenTable] = useState<RestaurantTable | null>(null)
    const [guestCount, setGuestCount] = useState(2)
    const [isOpening, setIsOpening] = useState(false)
    const [transferTable, setTransferTable] = useState<RestaurantTable | null>(null)
    const [transferTargetId, setTransferTargetId] = useState<number | null>(null)
    const [cancelOrder, setCancelOrder] = useState<Order | null>(null)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)

    const { hasPermission } = useAuthStore()
    const canTransfer = hasPermission('canManageCash')

    const loadData = useCallback(async () => {
        try {
            const [tablesData, ordersData] = await Promise.all([
                fetchApi<RestaurantTable[]>('/tables'),
                fetchApi<Order[]>('/orders?active=true')
            ])
            setTables(tablesData.sort((a, b) => a.number - b.number))
            setActiveOrders(ordersData)
            setIsLoading(false)
        } catch (error) {
            console.error('Error loading tables data:', error)
            // No reseteamos isLoading a false si es la primera carga y falló estrepitosamente, 
            // pero para polling simplemente logueamos el error
        }
    }, [])

    // Carga inicial
    useEffect(() => {
        loadData()
    }, [loadData])

    // Polling cada 10 segundos para mantener sincronización entre dispositivos
    usePolling(loadData, 10000)

    const getTableOrder = (table: RestaurantTable) => {
        if (table.status === 'available') return null
        return activeOrders?.find(o => o.tableId === table.id)
    }

    const getDisplayStatus = (table: RestaurantTable, order: Order | null): TableDisplayStatus => {
        if (table.status === 'paying') return 'paying'
        if (table.status === 'reserved') return 'reserved'
        if (!order) return table.status
        if (order.status === 'ready') return 'ready'
        if (['pending', 'confirmed', 'preparing'].includes(order.status)) return 'kitchen'
        return table.status
    }

    const getElapsedLabel = (order: Order) => {
        const baseTime = order.confirmedAt || order.createdAt
        const start = new Date(baseTime)
        if (Number.isNaN(start.getTime())) return ''
        const minutes = Math.floor((Date.now() - start.getTime()) / 60000)
        if (minutes < 1) return 'Ahora'
        return `${minutes} min`
    }

    const handleOpenTable = (table: RestaurantTable) => {
        setGuestCount(2)
        setOpenTable(table)
    }

    const handleTableClick = (table: RestaurantTable) => {
        if (table.status === 'available') {
            handleOpenTable(table)
        } else if (table.status === 'occupied' || table.status === 'paying') {
            setSelectedTable(table)
        }
    }

    const handleNewOrder = () => {
        if (selectedTable) {
            navigate(`/orders/${selectedTable.id}`)
            setSelectedTable(null)
        }
    }

    const handleConfirmOpenTable = async () => {
        if (!openTable?.id) return
        const guests = Math.max(1, Math.min(guestCount, 20))

        setIsOpening(true)
        try {
            await fetchApi(`/tables/${openTable.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'occupied' })
            })

            navigate(`/orders/${openTable.id}?guests=${guests}`)
            setOpenTable(null)
        } catch (error) {
            console.error('Error opening table:', error)
            addToast('error', 'Error', 'No se pudo abrir la mesa')
        } finally {
            setIsOpening(false)
        }
    }

    const handleTransfer = () => {
        if (!selectedTable) return
        setTransferTargetId(null)
        setTransferTable(selectedTable)
        setSelectedTable(null)
    }

    const handleConfirmTransfer = async () => {
        if (!transferTable || !transferTable.id || !transferTargetId) return
        const order = getTableOrder(transferTable)
        if (!order?.id) return

        const targetTable = tables.find(t => t.id === transferTargetId)
        if (!targetTable) return

        try {
            await fetchApi(`/orders/${order.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    tableId: targetTable.id,
                    tableName: targetTable.name
                })
            })

            await fetchApi(`/tables/${transferTable.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'available' })
            })

            await fetchApi(`/tables/${targetTable.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'occupied' })
            })

            await loadData()
            setTransferTable(null)
            setTransferTargetId(null)
            addToast('success', 'Mesa transferida', `Pedido movido a ${targetTable.name}`)
        } catch (error) {
            console.error('Error transferring table:', error)
            addToast('error', 'Error', 'No se pudo transferir la mesa')
        }
    }

    const handleRequestBill = async () => {
        if (!selectedTable || !selectedTable.id) return

        const order = getTableOrder(selectedTable)
        if (order) {
            try {
                // Actualizar estado de mesa en el servidor
                await fetchApi(`/tables/${selectedTable.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'paying' })
                })
                
                // Recargar datos inmediatamente
                await loadData()
                
                setOrderToPay(order)
                setSelectedTable(null)
            } catch (error) {
                console.error('Error updating table status:', error)
                addToast('error', 'Error', 'No se pudo actualizar el estado de la mesa')
            }
        }
    }

    const handlePaymentComplete = () => {
        setOrderToPay(null)
        loadData() // Recargar para ver la mesa libre
    }

    const handleOpenCancelModal = (order: Order) => {
        setCancelOrder(order)
        setShowCancelModal(true)
    }

    const handleCancelOrder = async () => {
        if (!cancelOrder) return
        setIsCancelling(true)
        try {
            await fetchApi(`/orders/${cancelOrder.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'cancelled' })
            })
            await loadData()
            addToast('info', 'Pedido cancelado', `Pedido ${cancelOrder.orderNumber} cancelado`)
            setShowCancelModal(false)
            setCancelOrder(null)
            setSelectedTable(null)
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

    const availableTables = tables.filter(table => table.status === 'available')

    if (isLoading && tables.length === 0) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className={styles.spinner} />
                <p>Cargando mesas...</p>
            </div>
        )
    }

    return (
        <div className={styles.tables}>
            <header className={styles.header}>
                <h1 className={styles.title}>Mesas</h1>
                <div className={styles.legend}>
                    {(['available', 'occupied', 'kitchen', 'ready', 'paying', 'reserved'] as TableDisplayStatus[]).map(status => (
                        <div key={status} className={styles.legendItem}>
                            <span className={`${styles.legendDot} ${styles[displayStatusColors[status]]}`} />
                            <span>{displayStatusLabels[status]}</span>
                        </div>
                    ))}
                </div>
            </header>

            <div className={styles.grid}>
                {tables.map((table) => {
                    const order = getTableOrder(table)
                    const displayStatus = getDisplayStatus(table, order)
                    return (
                        <button
                            key={table.id}
                            className={`${styles.tableCard} ${styles[displayStatusColors[displayStatus]]}`}
                            onClick={() => handleTableClick(table)}
                        >
                            <span className={styles.tableNumber}>{table.number}</span>
                            <span className={styles.tableName}>{table.name}</span>
                            <div className={styles.tableInfo}>
                                <Users size={14} />
                                <span>{table.capacity}</span>
                                {order?.guestCount && (
                                    <span className={styles.tableGuests}>{order.guestCount} pax</span>
                                )}
                            </div>
                            {order && (
                                <span className={styles.tableTotal}>{formatPrice(order.total)}</span>
                            )}
                            {order && (
                                <span className={styles.tableTime}>{getElapsedLabel(order)}</span>
                            )}
                            <span className={`${styles.tableStatus} ${styles[`status${displayStatusColors[displayStatus].charAt(0).toUpperCase() + displayStatusColors[displayStatus].slice(1)}`]}`}>
                                {displayStatusLabels[displayStatus]}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Modal de opciones de mesa ocupada */}
            {selectedTable && (
                <div className={styles.optionsOverlay} onClick={() => setSelectedTable(null)}>
                    <div className={styles.optionsModal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.optionsTitle}>{selectedTable.name}</h3>

                        {(() => {
                            const currentOrder = getTableOrder(selectedTable);
                            return (
                                <>
                                    {currentOrder && (
                                        <div className={styles.orderInfo}>
                                            <span>Pedido actual:</span>
                                            <strong>{formatPrice(currentOrder.total)}</strong>
                                        </div>
                                    )}

                                    <div className={styles.optionsButtons}>
                                        <button className={styles.optionBtn} onClick={handleNewOrder}>
                                            <Plus size={20} />
                                            <span>Agregar Productos</span>
                                        </button>

                                        {currentOrder && (
                                            <button
                                                className={`${styles.optionBtn} ${styles.optionBill}`}
                                                onClick={handleRequestBill}
                                            >
                                                <Receipt size={20} />
                                                <span>Pedir la Cuenta</span>
                                            </button>
                                        )}

                                        {canTransfer && currentOrder && (
                                            <button className={styles.optionBtn} onClick={handleTransfer}>
                                                <ArrowRightLeft size={20} />
                                                <span>Transferir Mesa</span>
                                            </button>
                                        )}

                                        {currentOrder && (
                                            <button
                                                className={`${styles.optionBtn} ${styles.optionDanger}`}
                                                onClick={() => handleOpenCancelModal(currentOrder as Order)}
                                            >
                                                <XCircle size={20} />
                                                <span>Cancelar Pedido</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            );
                        })()}

                        <button
                            className={styles.cancelBtn}
                            onClick={() => setSelectedTable(null)}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {openTable && (
                <div className={styles.optionsOverlay} onClick={() => setOpenTable(null)}>
                    <div className={styles.openModal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.optionsTitle}>Abrir {openTable.name}</h3>
                        <div className={styles.guestControl}>
                            <button
                                className={styles.guestBtn}
                                onClick={() => setGuestCount(count => Math.max(1, count - 1))}
                                disabled={guestCount <= 1}
                            >
                                -
                            </button>
                            <div className={styles.guestValue}>
                                <span>{guestCount}</span>
                                <span className={styles.guestLabel}>comensales</span>
                            </div>
                            <button
                                className={styles.guestBtn}
                                onClick={() => setGuestCount(count => Math.min(20, count + 1))}
                            >
                                +
                            </button>
                        </div>
                        <button
                            className={styles.openConfirm}
                            onClick={handleConfirmOpenTable}
                            disabled={isOpening}
                        >
                            {isOpening ? 'Abriendo...' : 'Iniciar Pedido'}
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setOpenTable(null)}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {transferTable && (
                <div className={styles.optionsOverlay} onClick={() => setTransferTable(null)}>
                    <div className={styles.openModal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.optionsTitle}>Transferir {transferTable.name}</h3>
                        <div className={styles.transferList}>
                            {availableTables.length === 0 ? (
                                <span className={styles.transferEmpty}>No hay mesas disponibles</span>
                            ) : (
                                availableTables.map(table => (
                                    <button
                                        key={table.id}
                                        className={`${styles.transferBtn} ${transferTargetId === table.id ? styles.transferBtnActive : ''}`}
                                        onClick={() => setTransferTargetId(table.id!)}
                                    >
                                        {table.name}
                                    </button>
                                ))
                            )}
                        </div>
                        <button
                            className={styles.openConfirm}
                            onClick={handleConfirmTransfer}
                            disabled={!transferTargetId}
                        >
                            Confirmar Transferencia
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setTransferTable(null)}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {showCancelModal && cancelOrder && (
                <div className={styles.optionsOverlay} onClick={() => setShowCancelModal(false)}>
                    <div className={styles.cancelModal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.optionsTitle}>Cancelar pedido</h3>
                        <div className={styles.cancelSummary}>
                            <p>Vas a cancelar el pedido <strong>{cancelOrder.orderNumber}</strong>.</p>
                            <p className={styles.cancelHint}>
                                {cancelOrder.paymentStatus === 'paid'
                                    ? 'Se realizará un reverso en caja y la mesa quedará disponible.'
                                    : 'La mesa quedará disponible.'}
                            </p>
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
                                {isCancelling ? 'Cancelando...' : 'Confirmar cancelación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de pago */}
            {orderToPay && (
                <PaymentModal
                    order={orderToPay}
                    tableName={tables.find(t => t.id === orderToPay.tableId)?.name || 'Mesa'}
                    onClose={() => setOrderToPay(null)}
                    onPaymentComplete={handlePaymentComplete}
                />
            )}
        </div>
    )
}
