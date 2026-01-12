import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApi, customersApi } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Phone,
    MessageCircle,
    MapPin,
    Calendar,
    X,
    Loader2,
    ShoppingBag
} from 'lucide-react'
import type { Customer, Order } from '@/types'
import styles from './Customers.module.css'

export function Customers() {
    const { addToast } = useToast()
    const navigate = useNavigate()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState<'all' | 'telegram' | 'recent' | 'missing-address'>('all')
    const [compactView, setCompactView] = useState(false)

    // Estados para modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [historyOrders, setHistoryOrders] = useState<Order[]>([])
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)
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

    const normalizePhone = (value: string) => value.replace(/\D/g, '')

    const getWhatsAppUrl = (phone: string) => {
        const digits = normalizePhone(phone)
        if (!digits) return ''
        if (digits.length === 10) {
            return `https://wa.me/57${digits}`
        }
        return `https://wa.me/${digits}`
    }

    const getMapUrl = (address: string) => {
        if (!address) return ''
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    }

    const formatDate = (value?: Date | string | null) => {
        if (!value) return ''
        return new Date(value).toLocaleDateString()
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    const getOrderTypeLabel = (type: Order['type']) => {
        if (type === 'dine-in') return 'Mesa'
        if (type === 'takeout') return 'Para llevar'
        return 'Domicilio'
    }

    const totalCustomers = customers.length
    const telegramCount = customers.filter(customer => Boolean(customer.telegramId)).length
    const recentCount = customers.filter(customer => Boolean(customer.lastOrderAt)).length

    const filteredCustomers = customers.filter(customer => {
        if (activeFilter === 'telegram' && !customer.telegramId) return false
        if (activeFilter === 'recent' && !customer.lastOrderAt) return false
        if (activeFilter === 'missing-address' && customer.address?.trim()) return false

        const query = searchTerm.trim().toLowerCase()
        if (!query) return true
        const haystack = [
            customer.name,
            customer.phone,
            customer.address,
            customer.notes || '',
            customer.telegramId || ''
        ].join(' ').toLowerCase()
        return haystack.includes(query) || normalizePhone(customer.phone).includes(normalizePhone(query))
    })

    const handleOpenModal = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer)
            setFormData({
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                notes: customer.notes || ''
            })
            loadCustomerHistory(customer)
        } else {
            setEditingCustomer(null)
            setFormData({ name: '', phone: '', address: '', notes: '' })
            setHistoryOrders([])
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setHistoryOrders([])
        setIsHistoryLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const incomingPhone = normalizePhone(formData.phone)
            const duplicate = customers.find(customer =>
                normalizePhone(customer.phone) === incomingPhone &&
                customer.id !== editingCustomer?.id
            )

            if (duplicate) {
                addToast('error', 'Telefono duplicado', 'Ya existe un cliente con ese numero')
                return
            }

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
            setIsModalOpen(false)
            loadCustomers()
        } catch (error) {
            addToast('error', 'Error', 'No se pudo guardar el cliente')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Estas seguro de eliminar este cliente?')) return
        try {
            await fetchApi(`/customers/${id}`, { method: 'DELETE' })
            addToast('success', 'Eliminado', 'Cliente eliminado correctamente')
            loadCustomers()
        } catch (error) {
            addToast('error', 'Error', 'No se pudo eliminar el cliente')
        }
    }

    const handleNewDeliveryOrder = (customer: Customer) => {
        const params = new URLSearchParams({
            type: 'delivery',
            name: customer.name,
            phone: customer.phone,
            address: customer.address || ''
        })

        if (customer.id) {
            params.set('customerId', String(customer.id))
        }

        navigate(`/orders?${params.toString()}`)
    }

    const loadCustomerHistory = async (customer: Customer) => {
        if (!customer.id && !customer.phone) return
        setIsHistoryLoading(true)
        try {
            const orders = await fetchApi<Order[]>('/orders')
            const byId = customer.id
                ? orders.filter(order => order.customerId === customer.id)
                : []
            const byPhone = orders.filter(order => order.customerPhone === customer.phone)
            const combined = [...byId, ...byPhone].reduce<Order[]>((acc, order) => {
                if (acc.find(existing => existing.id === order.id)) return acc
                acc.push(order)
                return acc
            }, [])

            const sorted = combined.sort((a, b) => {
                const aTime = new Date(a.createdAt).getTime()
                const bTime = new Date(b.createdAt).getTime()
                return bTime - aTime
            })

            setHistoryOrders(sorted.slice(0, 5))
        } catch (error) {
            console.error('Error loading customer history:', error)
            setHistoryOrders([])
        } finally {
            setIsHistoryLoading(false)
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
                    <h1>Gestion de Clientes</h1>
                    <p>Base de datos de clientes y domicilios</p>
                </div>
                <button className={styles.addBtn} onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    <span>Nuevo Cliente</span>
                </button>
            </header>

            <div className={styles.statsRow}>
                <span className={styles.statPill}>Total: {totalCustomers}</span>
                <span className={styles.statPill}>Telegram: {telegramCount}</span>
                <span className={styles.statPill}>Con pedidos: {recentCount}</span>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBar}>
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, telefono o direccion..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.filters}>
                    <button
                        className={`${styles.filterBtn} ${activeFilter === 'all' ? styles.filterActive : ''}`}
                        onClick={() => setActiveFilter('all')}
                    >
                        Todos
                    </button>
                    <button
                        className={`${styles.filterBtn} ${activeFilter === 'telegram' ? styles.filterActive : ''}`}
                        onClick={() => setActiveFilter('telegram')}
                    >
                        Telegram
                    </button>
                    <button
                        className={`${styles.filterBtn} ${activeFilter === 'recent' ? styles.filterActive : ''}`}
                        onClick={() => setActiveFilter('recent')}
                    >
                        Con pedidos
                    </button>
                    <button
                        className={`${styles.filterBtn} ${activeFilter === 'missing-address' ? styles.filterActive : ''}`}
                        onClick={() => setActiveFilter('missing-address')}
                    >
                        Sin direccion
                    </button>
                </div>

                <button
                    className={`${styles.compactToggle} ${compactView ? styles.compactActive : ''}`}
                    onClick={() => setCompactView(prev => !prev)}
                >
                    {compactView ? 'Vista comoda' : 'Vista compacta'}
                </button>
            </div>

            <div className={`${styles.grid} ${compactView ? styles.gridCompact : ''}`}>
                {filteredCustomers.map(customer => (
                    <div key={customer.id} className={`${styles.card} ${compactView ? styles.cardCompact : ''}`}>
                        <div className={styles.cardHeader}>
                            <div className={styles.avatar}>
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.actions}>
                                <button onClick={() => handleOpenModal(customer)}><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(customer.id!)} className={styles.deleteBtn}><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <div className={styles.tags}>
                            {customer.telegramId && (
                                <span className={`${styles.tag} ${styles.tagTelegram}`}>Telegram</span>
                            )}
                        </div>

                        <h3 className={styles.name}>{customer.name}</h3>

                        <div className={styles.info}>
                            <div className={styles.infoItem}>
                                <Phone size={14} />
                                <span>{customer.phone}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <MapPin size={14} />
                                <span>{customer.address || 'Sin direccion'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <Calendar size={14} />
                                <span>Registrado: {formatDate(customer.createdAt)}</span>
                            </div>
                        </div>

                        {!compactView && (
                            <>
                                {customer.notes && (
                                    <p className={styles.notes}>{customer.notes}</p>
                                )}

                                <div className={styles.cardActions}>
                                    {customer.phone ? (
                                        <a className={styles.actionBtn} href={`tel:${normalizePhone(customer.phone)}`}>
                                            <Phone size={14} />
                                            <span>Llamar</span>
                                        </a>
                                    ) : (
                                        <button className={`${styles.actionBtn} ${styles.actionDisabled}`} type="button" disabled>
                                            <Phone size={14} />
                                            <span>Llamar</span>
                                        </button>
                                    )}

                                    {customer.phone ? (
                                        <a
                                            className={styles.actionBtn}
                                            href={getWhatsAppUrl(customer.phone)}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <MessageCircle size={14} />
                                            <span>WhatsApp</span>
                                        </a>
                                    ) : (
                                        <button className={`${styles.actionBtn} ${styles.actionDisabled}`} type="button" disabled>
                                            <MessageCircle size={14} />
                                            <span>WhatsApp</span>
                                        </button>
                                    )}

                                    {customer.address ? (
                                        <a
                                            className={styles.actionBtn}
                                            href={getMapUrl(customer.address)}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <MapPin size={14} />
                                            <span>Mapa</span>
                                        </a>
                                    ) : (
                                        <button className={`${styles.actionBtn} ${styles.actionDisabled}`} type="button" disabled>
                                            <MapPin size={14} />
                                            <span>Mapa</span>
                                        </button>
                                    )}
                                </div>

                                <button
                                    className={styles.orderBtn}
                                    onClick={() => handleNewDeliveryOrder(customer)}
                                >
                                    <ShoppingBag size={16} />
                                    <span>Nuevo pedido</span>
                                </button>

                                {customer.lastOrderAt && (
                                    <div className={styles.footer}>
                                        <ShoppingBag size={14} />
                                        <span>Ultimo pedido: {formatDate(customer.lastOrderAt)}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                            <button onClick={handleCloseModal}><X size={24} /></button>
                        </div>

                        <div className={styles.modalContent}>
                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.formGroup}>
                                    <label>Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Juan Perez"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Telefono / WhatsApp</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="Ej: 3001234567"
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Direccion de Entrega</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Direccion completa para domicilios..."
                                        rows={2}
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label>Notas Adicionales</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Puntos de referencia, alergias, etc."
                                        rows={2}
                                    />
                                </div>

                                <div className={styles.formActions}>
                                    <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className={styles.submitBtn}>
                                        {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
                                    </button>
                                </div>
                            </form>

                            {editingCustomer && (
                                <div className={styles.historySection}>
                                    <div className={styles.historyHeader}>
                                        <h3>Ultimos pedidos</h3>
                                    </div>
                                    {isHistoryLoading ? (
                                        <div className={styles.historyLoading}>
                                            <Loader2 className={styles.spinner} />
                                            <span>Cargando historial...</span>
                                        </div>
                                    ) : historyOrders.length > 0 ? (
                                        <div className={styles.historyList}>
                                            {historyOrders.map(order => (
                                                <div key={order.id || order.orderNumber} className={styles.historyItem}>
                                                    <div>
                                                        <div className={styles.historyOrder}>
                                                            {order.orderNumber || 'Orden'}
                                                        </div>
                                                        <div className={styles.historyMeta}>
                                                            {formatDate(order.createdAt)} · {getOrderTypeLabel(order.type)}
                                                        </div>
                                                    </div>
                                                    <div className={styles.historyTotal}>
                                                        {formatPrice(order.total)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={styles.historyEmpty}>Sin pedidos aun.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
