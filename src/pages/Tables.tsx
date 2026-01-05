import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { Users, Receipt, Plus } from 'lucide-react'
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
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
    const [orderToPay, setOrderToPay] = useState<Order | null>(null)

    const tables = useLiveQuery<RestaurantTable[]>(() =>
        db.restaurantTables.toArray().then(t => t.sort((a, b) => a.number - b.number))
    )

    // Obtener pedidos activos por mesa
    const activeOrders = useLiveQuery<Order[]>(() =>
        db.orders
            .where('status')
            .anyOf(['pending', 'confirmed', 'preparing', 'ready'])
            .toArray()
    )

    const getTableOrder = (tableId: number) => {
        return activeOrders?.find(o => o.tableId === tableId)
    }

    const handleTableClick = (table: RestaurantTable) => {
        if (table.status === 'available') {
            navigate(`/orders/${table.id}`)
        } else if (table.status === 'occupied' || table.status === 'paying') {
            // Mostrar opciones
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
        if (!selectedTable) return

        const order = getTableOrder(selectedTable.id!)
        if (order) {
            // Cambiar estado de mesa a "paying"
            await db.restaurantTables.update(selectedTable.id!, { status: 'paying' })
            setOrderToPay(order)
            setSelectedTable(null)
        }
    }

    const handlePaymentComplete = () => {
        setOrderToPay(null)
        // Mesa se libera automáticamente en PaymentModal
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
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
                {tables?.map((table) => {
                    const order = getTableOrder(table.id!)
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

                        {getTableOrder(selectedTable.id!) && (
                            <div className={styles.orderInfo}>
                                <span>Pedido actual:</span>
                                <strong>{formatPrice(getTableOrder(selectedTable.id!)!.total)}</strong>
                            </div>
                        )}

                        <div className={styles.optionsButtons}>
                            <button className={styles.optionBtn} onClick={handleNewOrder}>
                                <Plus size={20} />
                                <span>Agregar Productos</span>
                            </button>

                            {getTableOrder(selectedTable.id!) && (
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
                    tableName={tables?.find(t => t.id === orderToPay.tableId)?.name || 'Mesa'}
                    onClose={() => setOrderToPay(null)}
                    onPaymentComplete={handlePaymentComplete}
                />
            )}
        </div>
    )
}
