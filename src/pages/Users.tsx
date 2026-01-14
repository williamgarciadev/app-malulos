import { useState, useEffect, useCallback } from 'react'
import { usersApi } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { Users as UsersIcon, Edit, X, Save, Plus, Loader2 } from 'lucide-react'
import type { User, UserRole } from '@/types'
import styles from './Users.module.css'

export function Users() {
    const { addToast } = useToast()
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [isCreatingNew, setIsCreatingNew] = useState(false)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const usersData = await usersApi.getAll()
            setUsers(usersData)
        } catch (error) {
            console.error('Error loading users:', error)
            addToast('error', 'Error', 'No se pudieron cargar los usuarios')
        } finally {
            setIsLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleCreate = () => {
        const newUser: User = {
            name: '',
            pin: '',
            role: 'waiter',
            isActive: true,
            createdAt: new Date()
        }
        setEditingUser(newUser)
        setIsCreatingNew(true)
        setShowEditModal(true)
    }

    const handleEdit = (user: User) => {
        setEditingUser({ ...user })
        setIsCreatingNew(false)
        setShowEditModal(true)
    }

    const handleSave = async () => {
        if (!editingUser) return

        // Validación
        if (!editingUser.name.trim()) {
            addToast('error', 'Campo requerido', 'El nombre es obligatorio')
            return
        }
        if (!editingUser.pin.trim() || editingUser.pin.length !== 4) {
            addToast('error', 'PIN inválido', 'El PIN debe tener exactamente 4 dígitos')
            return
        }

        try {
            if (isCreatingNew) {
                await usersApi.create(editingUser)
                addToast('success', 'Usuario creado', `Se ha creado el usuario ${editingUser.name}`)
            } else {
                if (!editingUser.id) return
                await usersApi.update(editingUser.id, editingUser)
                addToast('success', 'Usuario actualizado', `Los datos de ${editingUser.name} se han guardado`)
            }

            await loadData()
            setShowEditModal(false)
            setEditingUser(null)
        } catch (error) {
            console.error('Error al guardar usuario:', error)
            addToast('error', 'Error', 'No se pudieron guardar los cambios')
        }
    }

    const handleToggleActive = async (user: User) => {
        if (!user.id) return

        try {
            const newStatus = !user.isActive
            await usersApi.update(user.id, { isActive: newStatus })
            
            addToast(
                newStatus ? 'success' : 'info', 
                'Estado actualizado', 
                `El usuario ${user.name} ahora está ${newStatus ? 'activo' : 'inactivo'}`
            )
            
            // Actualizar localmente para feedback inmediato
            setUsers(prevUsers => 
                prevUsers.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u)
            )
        } catch (error) {
            console.error('Error toggling user status:', error)
            addToast('error', 'Error', 'No se pudo cambiar el estado del usuario')
        }
    }

    const getRoleName = (role: UserRole) => {
        const roles = {
            admin: 'Administrador',
            cashier: 'Cajero',
            waiter: 'Mesero',
            delivery: 'Domiciliario'
        }
        return roles[role]
    }

    const getRoleColor = (role: UserRole) => {
        const colors = {
            admin: 'var(--color-danger)',
            cashier: 'var(--color-success)',
            waiter: 'var(--color-info)',
            delivery: 'var(--color-warning)'
        }
        return colors[role]
    }

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <Loader2 className={styles.spinner} size={48} />
                <p>Cargando usuarios...</p>
            </div>
        )
    }

    return (
        <div className={styles.users}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        <UsersIcon size={28} />
                        Gestión de Usuarios
                    </h1>
                    <p className={styles.subtitle}>
                        Administra los usuarios del sistema
                    </p>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.usersGrid}>
                    {users.map(user => (
                        <div key={user.id} className={styles.userCard}>
                            <div className={styles.userHeader}>
                                <div className={styles.userInfo}>
                                    <h3 className={styles.userName}>{user.name}</h3>
                                    <span
                                        className={styles.userRole}
                                        style={{ backgroundColor: getRoleColor(user.role) }}
                                    >
                                        {getRoleName(user.role)}
                                    </span>
                                </div>
                                <div className={styles.userActions}>
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className={styles.actionBtn}
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(user)}
                                        className={`${styles.actionBtn} ${!user.isActive ? styles.inactive : ''}`}
                                        title={user.isActive ? 'Desactivar' : 'Activar'}
                                        style={{ color: user.isActive ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                                    >
                                        {user.isActive ? '✓' : '✗'}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.userDetails}>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>PIN:</span>
                                    <span className={styles.detailValue}>••••</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Estado:</span>
                                    <span className={`${styles.status} ${user.isActive ? styles.active : styles.inactive}`}>
                                        {user.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botón flotante para agregar */}
            <button onClick={handleCreate} className={styles.addButton}>
                <Plus size={24} />
            </button>

            {/* Modal de edición/creación */}
            {showEditModal && editingUser && (
                <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{isCreatingNew ? 'Crear Usuario' : 'Editar Usuario'}</h2>
                            <button onClick={() => setShowEditModal(false)} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    placeholder="Nombre del usuario"
                                    autoFocus
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>PIN (4 dígitos)</label>
                                <input
                                    type="text"
                                    value={editingUser.pin}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                                        setEditingUser({ ...editingUser, pin: value })
                                    }}
                                    placeholder="1234"
                                    maxLength={4}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Rol</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                                >
                                    <option value="waiter">Mesero</option>
                                    <option value="cashier">Cajero</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.checkbox}>
                                    <input
                                        type="checkbox"
                                        checked={editingUser.isActive}
                                        onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                                    />
                                    <span>Usuario activo</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowEditModal(false)} className={styles.cancelBtn}>
                                Cancelar
                            </button>
                            <button onClick={handleSave} className={styles.saveBtn}>
                                <Save size={18} />
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}