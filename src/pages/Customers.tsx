import { useState, useEffect, useCallback } from 'react'
import { fetchApi, customersApi } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Phone,
    MapPin,
    Calendar,
    X,
    Loader2,
    ShoppingBag
} from 'lucide-react'
import type { Customer } from '@/types'
import styles from './Customers.module.css'

export function Customers() {
    const { addToast } = useToast()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    
    // Estados para modal
    const [isModalOpen, setIsHistoryOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        notes: ''
    })

    const loadCustomers = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await customersApi.getAll()
            setCustomers(data)
        } catch (error) {
            console.error('Error loading customers:', error)
            addToast('error', 'Error', 'No se pudieron cargar los clientes')
        } finally {
            setIsLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        loadCustomers()
    }, [loadCustomers])

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    )

    const handleOpenModal = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer)
            setFormData({
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                notes: customer.notes || ''
            })
        } else {
            setEditingCustomer(null)
            setFormData({ name: '', phone: '', address: '', notes: '' })
        }
        setIsHistoryOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingCustomer) {
                await fetchApi(`/customers/${editingCustomer.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                })
                addToast('success', 'Cliente actualizado', 'Los datos se guardaron correctamente')
            } else {
                await customersApi.create({
                    ...formData,
                    createdAt: new Date()
                })
                addToast('success', 'Cliente registrado', 'El nuevo cliente ha sido creado')
            }
            setIsHistoryOpen(false)
            loadCustomers()
        } catch (error) {
            addToast('error', 'Error', 'No se pudo guardar el cliente')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return
        try {
            await fetchApi(`/customers/${id}`, { method: 'DELETE' })
            addToast('success', 'Eliminado', 'Cliente eliminado correctamente')
            loadCustomers()
        } catch (error) {
            addToast('error', 'Error', 'No se pudo eliminar el cliente')
        }
    }

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <Loader2 className={styles.spinner} />
                <p>Cargando clientes...</p>
            </div>
        )
    }

    return (
        <div className={styles.customersPage}>
            <header className={styles.header}>
                <div>
                    <h1>Gestión de Clientes</h1>
                    <p>Base de datos de clientes y domicilios</p>
                </div>
                <button className={styles.addBtn} onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    <span>Nuevo Cliente</span>
                </button>
            </header>

            <div className={styles.searchBar}>
                <Search size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className={styles.grid}>
                {filteredCustomers.map(customer => (
                    <div key={customer.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.avatar}>
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.actions}>
                                <button onClick={() => handleOpenModal(customer)}><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(customer.id!)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                            </div>
                        </div>
                        
                        <h3 className={styles.name}>{customer.name}</h3>
                        
                        <div className={styles.info}>
                            <div className={styles.infoItem}>
                                <Phone size={14} />
                                <span>{customer.phone}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <MapPin size={14} />
                                <span>{customer.address || 'Sin dirección'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <Calendar size={14} />
                                <span>Registrado: {new Date(customer.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {customer.lastOrderAt && (
                            <div className={styles.footer}>
                                <ShoppingBag size={14} />
                                <span>Último pedido: {new Date(customer.lastOrderAt).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsHistoryOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                            <button onClick={() => setIsHistoryOpen(false)}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Teléfono / WhatsApp</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    placeholder="Ej: 3001234567"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Dirección de Entrega</label>
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    placeholder="Dirección completa para domicilios..."
                                    rows={2}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Notas Adicionales</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                    placeholder="Puntos de referencia, alergias, etc."
                                    rows={2}
                                />
                            </div>
                            
                            <div className={styles.formActions}>
                                <button type="button" onClick={() => setIsHistoryOpen(false)} className={styles.cancelBtn}>
                                    Cancelar
                                </button>
                                <button type="submit" className={styles.submitBtn}>
                                    {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
