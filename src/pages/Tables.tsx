import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { Users } from 'lucide-react'
import type { TableStatus, RestaurantTable } from '@/types'
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
    const tables = useLiveQuery<RestaurantTable[]>(() =>
        db.restaurantTables.toArray().then(t => t.sort((a, b) => a.number - b.number))
    )

    const handleTableClick = (tableId: number, status: TableStatus) => {
        if (status === 'available') {
            navigate(`/orders/${tableId}`)
        } else if (status === 'occupied' || status === 'paying') {
            navigate(`/orders/${tableId}`)
        }
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
                {tables?.map((table) => (
                    <button
                        key={table.id}
                        className={`${styles.tableCard} ${styles[statusColors[table.status]]}`}
                        onClick={() => handleTableClick(table.id!, table.status)}
                    >
                        <span className={styles.tableNumber}>{table.number}</span>
                        <span className={styles.tableName}>{table.name}</span>
                        <div className={styles.tableInfo}>
                            <Users size={14} />
                            <span>{table.capacity}</span>
                        </div>
                        <span className={`${styles.tableStatus} ${styles[`status${statusColors[table.status].charAt(0).toUpperCase() + statusColors[table.status].slice(1)}`]}`}>
                            {statusLabels[table.status]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}
