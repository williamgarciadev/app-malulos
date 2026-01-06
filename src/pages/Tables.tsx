import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApi } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/context/ToastContext'
import { Users, Receipt, Plus, Loader2 } from 'lucide-react'
import { PaymentModal } from '@/components/payment/PaymentModal'
import type { TableStatus, RestaurantTable, Order } from '@/types'
import styles from './Tables.module.css'

const statusLabels: Record<TableStatus, string> = {
    available: 'Disponible',
    occupied: 'Ocupada',
    paying: 'Por Pagar',
    reserved: 'Reservada'
}

const statusColors: Record<TableStatus, string> = {
    available: 'success',
    occupied: 'warning',
    paying: 'danger',
    reserved: 'info'
}

export function Tables() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [tables, setTables] = useState<RestaurantTable[]>([])
    const [activeOrders, setActiveOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
    const [orderToPay, setOrderToPay] = useState<Order | null>(null)

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

    const handleTableClick = (table: RestaurantTable) => {
        if (table.status === 'available') {
            navigate(`/orders/${table.id}`)
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

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

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
                    {Object.entries(statusLabels).map(([status, label]) => (
                        <div key={status} className={styles.legendItem}>
                            <span className={`${styles.legendDot} ${styles[statusColors[status as TableStatus]]}`} />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </header>

            <div className={styles.grid}>
                {tables.map((table) => {
                    const order = getTableOrder(table)
                    return (
                        <button
                            key={table.id}
                            className={`${styles.tableCard} ${styles[statusColors[table.status]]}`}
                            onClick={() => handleTableClick(table)}
                        >
                            <span className={styles.tableNumber}>{table.number}</span>
                            <span className={styles.tableName}>{table.name}</span>
                            <div className={styles.tableInfo}>
                                <Users size={14} />
                                <span>{table.capacity}</span>
                            </div>
                            {order && (
                                <span className={styles.tableTotal}>{formatPrice(order.total)}</span>
                            )}
                            <span className={`${styles.tableStatus} ${styles[`status${statusColors[table.status].charAt(0).toUpperCase() + statusColors[table.status].slice(1)}`]}`}>
                                {statusLabels[table.status]}
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

                        {getTableOrder(selectedTable) && (
                            <div className={styles.orderInfo}>
                                <span>Pedido actual:</span>
                                <strong>{formatPrice(getTableOrder(selectedTable)!.total)}</strong>
                            </div>
                        )}

                        <div className={styles.optionsButtons}>
                            <button className={styles.optionBtn} onClick={handleNewOrder}>
                                <Plus size={20} />
                                <span>Agregar Productos</span>
                            </button>

                            {getTableOrder(selectedTable) && (
                                <button
                                    className={`${styles.optionBtn} ${styles.optionBill}`}
                                    onClick={handleRequestBill}
                                >
                                    <Receipt size={20} />
                                    <span>Pedir la Cuenta</span>
                                </button>
                            )}
                        </div>

                        <button
                            className={styles.cancelBtn}
                            onClick={() => setSelectedTable(null)}
                        >
                            Cancelar
                        </button>
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
