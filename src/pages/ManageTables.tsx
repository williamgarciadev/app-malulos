import { useState, useEffect, useCallback } from 'react'
import { tablesApi } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { LayoutGrid, Edit, X, Save, Plus, Loader2, Trash2 } from 'lucide-react'
import type { RestaurantTable, TableStatus } from '@/types'
import styles from './ManageTables.module.css'

export function ManageTables() {
    const { addToast } = useToast()
    const [tables, setTables] = useState<RestaurantTable[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [isCreatingNew, setIsCreatingNew] = useState(false)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const tablesData = await tablesApi.getAll()
            setTables(tablesData.sort((a, b) => a.number - b.number))
        } catch (error) {
            console.error('Error loading tables:', error)
            addToast('error', 'Error', 'No se pudieron cargar las mesas')
        } finally {
            setIsLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleCreate = () => {
        const maxNumber = tables.length > 0
            ? Math.max(...tables.map(t => t.number))
            : 0

        const newTable: RestaurantTable = {
            number: maxNumber + 1,
            name: `Mesa ${maxNumber + 1}`,
            status: 'available',
            capacity: 4,
            positionX: 0,
            positionY: 0
        }
        setEditingTable(newTable)
        setIsCreatingNew(true)
        setShowEditModal(true)
    }

    const handleEdit = (table: RestaurantTable) => {
        setEditingTable({ ...table })
        setIsCreatingNew(false)
        setShowEditModal(true)
    }

    const handleDelete = async (table: RestaurantTable) => {
        if (!table.id) return
        
        // No permitir eliminar mesas ocupadas
        if (table.status !== 'available') {
            addToast('error', 'No permitido', 'No se puede eliminar una mesa que no esté disponible')
            return
        }

        if (confirm(`¿Estás seguro de eliminar la ${table.name}?`)) {
            try {
                // Como no hay tablesApi.delete implementado en api.ts (lo vi antes), 
                // voy a usar fetchApi directamente si es necesario o asumir que existe si lo agregamos.
                // Revisando api.ts anterior, NO existe tablesApi.delete.
                // Usaré fetchApi directamente.
                const { fetchApi } = await import('@/services/api')
                await fetchApi(`/tables/${table.id}`, { method: 'DELETE' })
                
                addToast('success', 'Mesa eliminada', `La ${table.name} ha sido eliminada`)
                loadData()
            } catch (error) {
                console.error('Error deleting table:', error)
                addToast('error', 'Error', 'No se pudo eliminar la mesa')
            }
        }
    }

    const handleSave = async () => {
        if (!editingTable) return

        if (!editingTable.name.trim()) {
            addToast('error', 'Campo requerido', 'El nombre de la mesa es obligatorio')
            return
        }
        if (editingTable.capacity < 1) {
            addToast('error', 'Valor inválido', 'La capacidad debe ser al menos 1')
            return
        }

        try {
            if (isCreatingNew) {
                await tablesApi.create(editingTable)
                addToast('success', 'Mesa creada', `Se ha creado la ${editingTable.name}`)
            } else {
                if (!editingTable.id) return
                await tablesApi.update(editingTable.id, editingTable)
                addToast('success', 'Mesa actualizada', `Los cambios en la ${editingTable.name} se han guardado`)
            }

            await loadData()
            setShowEditModal(false)
            setEditingTable(null)
        } catch (error) {
            console.error('Error al guardar mesa:', error)
            addToast('error', 'Error', 'No se pudieron guardar los cambios')
        }
    }

    const getStatusName = (status: TableStatus) => {
        const statuses = {
            available: 'Disponible',
            occupied: 'Ocupada',
            paying: 'Pagando',
            reserved: 'Reservada'
        }
        return statuses[status]
    }

    const getStatusColor = (status: TableStatus) => {
        const colors = {
            available: 'var(--color-success)',
            occupied: 'var(--color-warning)',
            paying: 'var(--color-info)',
            reserved: 'var(--color-secondary)'
        }
        return colors[status]
    }

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <Loader2 className={styles.spinner} size={48} />
                <p>Cargando mesas...</p>
            </div>
        )
    }

    return (
        <div className={styles.manageTables}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        <LayoutGrid size={28} />
                        Gestión de Mesas
                    </h1>
                    <p className={styles.subtitle}>
                        Administra las mesas del restaurante
                    </p>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.tablesGrid}>
                    {tables.map(table => (
                        <div key={table.id} className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <div className={styles.tableInfo}>
                                    <h3 className={styles.tableName}>{table.name}</h3>
                                    <span className={styles.tableNumber}>#{table.number}</span>
                                </div>
                                <div className={styles.actionButtons}>
                                    <button
                                        onClick={() => handleEdit(table)}
                                        className={styles.editBtn}
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(table)}
                                        className={styles.deleteBtn}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.tableDetails}>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Capacidad:</span>
                                    <span className={styles.detailValue}>{table.capacity} personas</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Estado:</span>
                                    <span
                                        className={styles.statusBadge}
                                        style={{ backgroundColor: getStatusColor(table.status) }}
                                    >
                                        {getStatusName(table.status)}
                                    </span>
                                </div>
                                {table.currentOrderId && (
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>Pedido:</span>
                                        <span className={styles.detailValue}>#{table.currentOrderId}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button onClick={handleCreate} className={styles.addButton}>
                <Plus size={24} />
            </button>

            {showEditModal && editingTable && (
                <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{isCreatingNew ? 'Crear Mesa' : 'Editar Mesa'}</h2>
                            <button onClick={() => setShowEditModal(false)} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    value={editingTable.name}
                                    onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                                    placeholder="Mesa 1"
                                    autoFocus
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Número</label>
                                <input
                                    type="number"
                                    value={editingTable.number}
                                    onChange={(e) => setEditingTable({ ...editingTable, number: parseInt(e.target.value) || 0 })}
                                    min="1"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Capacidad (personas)</label>
                                <input
                                    type="number"
                                    value={editingTable.capacity}
                                    onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 1 })}
                                    min="1"
                                    max="20"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Estado</label>
                                <select
                                    value={editingTable.status}
                                    onChange={(e) => setEditingTable({ ...editingTable, status: e.target.value as TableStatus })}
                                >
                                    <option value="available">Disponible</option>
                                    <option value="occupied">Ocupada</option>
                                    <option value="paying">Pagando</option>
                                    <option value="reserved">Reservada</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowEditModal(false)} className={styles.cancelBtn}>
                                Cancelar
                            </button>
                            <button onClick={handleSave} className={styles.saveBtn}>
                                <Save size={18} />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}