import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { fetchApi } from '@/services/api'
import { useCartStore } from '@/stores/cartStore'
import { useToast } from '@/context/ToastContext'
import { generateKitchenTicket } from '@/services/ticketService'
import { getNotePresetsForCategory } from '@/config/notePresets'
import {
    Plus,
    Minus,
    ShoppingCart,
    Trash2,
    Send,
    ArrowLeft,
    X,
    Loader2
} from 'lucide-react'
import type { Product, ProductSize, Modifier, Category, RestaurantTable, Order, PaymentMethod } from '@/types'
import styles from './Orders.module.css'

export function Orders() {
    const { tableId } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { addToast } = useToast()

    const [categories, setCategories] = useState<Category[]>([])
    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>()
    const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([])
    const [quantity, setQuantity] = useState(1)
    const [notes, setNotes] = useState('')
    const [showCart, setShowCart] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [topProducts, setTopProducts] = useState<Product[]>([])
    const [addOnProducts, setAddOnProducts] = useState<Product[]>([])
    const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<PaymentMethod>('cash')
    const [printKitchenTicket, setPrintKitchenTicket] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true
        const stored = window.localStorage.getItem('malulos-print-kitchen')
        return stored ? stored === 'true' : true
    })

    const cart = useCartStore()

    useEffect(() => {
        if (typeof window === 'undefined') return
        window.localStorage.setItem('malulos-print-kitchen', String(printKitchenTicket))
    }, [printKitchenTicket])

    const buildTopProducts = async (products: Product[]) => {
        try {
            const orders = await fetchApi<Order[]>('/orders?status=completed')
            const sortedOrders = [...orders].sort((a, b) => {
                const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0
                const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0
                return bTime - aTime
            }).slice(0, 100)

            const counts = new Map<number, number>()
            sortedOrders.forEach(order => {
                order.items.forEach(item => {
                    counts.set(item.productId, (counts.get(item.productId) || 0) + item.quantity)
                })
            })

            const top = [...counts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([productId]) => products.find(p => p.id === productId))
                .filter((p): p is Product => Boolean(p))

            if (top.length > 0) {
                setTopProducts(top)
            } else {
                setTopProducts(products.slice(0, 6))
            }
        } catch (error) {
            setTopProducts(products.slice(0, 6))
        }
    }

    // Cargar datos iniciales
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [catsData, prodsData] = await Promise.all([
                    fetchApi<Category[]>('/categories'),
                    fetchApi<Product[]>('/products')
                ])
                
                const activeCats = catsData.filter(c => c.isActive).sort((a, b) => a.order - b.order)
                setCategories(activeCats)
                const activeProducts = prodsData.filter(p => p.isActive)
                setAllProducts(activeProducts)

                if (activeCats.length > 0) {
                    setSelectedCategory(activeCats[0].id!)
                }

                const addOnCategory = activeCats.find(cat => cat.name.toLowerCase().includes('adicional'))
                if (addOnCategory) {
                    setAddOnProducts(activeProducts.filter(p => p.categoryId === addOnCategory.id).slice(0, 8))
                } else {
                    setAddOnProducts([])
                }

                await buildTopProducts(activeProducts)
            } catch (error) {
                console.error('Error loading menu data:', error)
            } finally {
                setIsLoading(false)
            }
        }
        loadInitialData()
    }, [])

    // Configurar tipo de pedido y mesa
    useEffect(() => {
        const type = searchParams.get('type')
        const guestsParam = searchParams.get('guests')
        const customerIdParam = searchParams.get('customerId')
        const customerNameParam = searchParams.get('name')
        const customerPhoneParam = searchParams.get('phone')
        const customerAddressParam = searchParams.get('address')

        const parsedCustomerId = customerIdParam ? Number(customerIdParam) : null
        const hasCustomerParams = Boolean(
            customerNameParam ||
            customerPhoneParam ||
            customerAddressParam ||
            (customerIdParam && Number.isFinite(parsedCustomerId))
        )

        if (type === 'delivery') {
            cart.setOrderType('delivery')
            cart.setTable(null)
            if (hasCustomerParams) {
                cart.setCustomer(
                    customerNameParam || '',
                    customerPhoneParam || '',
                    customerAddressParam || '',
                    Number.isFinite(parsedCustomerId) ? parsedCustomerId : null
                )
            } else {
                cart.setCustomer('', '', '', null)
            }
        } else if (type === 'takeout') {
            cart.setOrderType('takeout')
            cart.setTable(null)
            cart.setCustomer('', '', '', null)
        } else if (tableId) {
            cart.setOrderType('dine-in')
            cart.setTable(parseInt(tableId))
            cart.setCustomer('', '', '', null)
        }

        if (guestsParam) {
            const guests = Number(guestsParam)
            cart.setGuestCount(Number.isFinite(guests) ? guests : null)
        } else if (!tableId) {
            cart.setGuestCount(null)
        }
    }, [tableId, searchParams])

    const getFilteredProducts = useCallback(() => {
        if (!selectedCategory) return []
        return allProducts.filter(p => p.categoryId === selectedCategory)
    }, [allProducts, selectedCategory])

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product)
        setSelectedSize(product.sizes[0])
        setSelectedModifiers([])
        setQuantity(1)
        setNotes('')
    }

    const handleToggleModifier = (modifier: Modifier) => {
        setSelectedModifiers(prev => {
            const exists = prev.find(m => m.id === modifier.id)
            if (exists) {
                return prev.filter(m => m.id !== modifier.id)
            }
            return [...prev, modifier]
        })
    }

    const getNoteTokens = (value: string) => {
        return value
            .split(',')
            .map(token => token.trim())
            .filter(Boolean)
    }

    const handleToggleNotePreset = (preset: string) => {
        const tokens = getNoteTokens(notes)
        const exists = tokens.includes(preset)
        const next = exists ? tokens.filter(token => token !== preset) : [...tokens, preset]
        setNotes(next.join(', '))
    }

    const handleAddToCart = () => {
        if (!selectedProduct) return

        cart.addItem(
            selectedProduct,
            quantity,
            selectedSize,
            selectedModifiers,
            [],
            notes
        )

        setSelectedProduct(null)
        setShowCart(true)
    }

    const handleSendOrder = async () => {
        if (cart.items.length === 0) return
        if (cart.orderType === 'delivery') {
            if (!cart.customerName.trim() || !cart.customerPhone.trim() || !cart.customerAddress.trim()) {
                addToast('error', 'Faltan datos', 'Completa nombre, telefono y direccion para el delivery')
                return
            }
        }

        try {
            let tableName = undefined
            if (tableId) {
                // Obtener nombre de la mesa si es dine-in
                try {
                    const table = await fetchApi<RestaurantTable>(`/tables/${tableId}`)
                    tableName = table.name
                } catch (e) {
                    console.error('Error fetching table info', e)
                }
            }

            const orderData = {
                type: cart.orderType,
                tableId: tableId ? parseInt(tableId) : undefined,
                tableName,
                guestCount: cart.guestCount || undefined,
                customerId: cart.customerId || undefined,
                customerName: cart.customerName || undefined,
                customerPhone: cart.customerPhone || undefined,
                customerAddress: cart.customerAddress || undefined,
                items: cart.items.map(item => ({
                    id: item.id,
                    productId: item.product.id!,
                    productName: item.product.name,
                    quantity: item.quantity,
                    selectedSize: item.selectedSize,
                    selectedModifiers: item.selectedModifiers,
                    comboSelections: item.comboSelections,
                    notes: item.notes,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    status: 'pending'
                })),
                subtotal: cart.getSubtotal(),
                discount: 0,
                tax: 0,
                total: cart.getTotal(),
                status: 'pending',
                paymentStatus: 'pending',
                paymentMethod: cart.orderType === 'delivery' ? deliveryPaymentMethod : undefined,
                paidAmount: 0,
                createdAt: new Date(),
                confirmedAt: new Date()
            }

            // 1. Crear Orden y obtener respuesta
            const createdOrder = await fetchApi<any>('/orders', { // Usar any o tipo Order si incluye orderNumber
                method: 'POST',
                body: JSON.stringify(orderData)
            })

            // 2. Actualizar estado de la mesa si aplica
            if (tableId) {
                await fetchApi(`/tables/${tableId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'occupied' })
                })
            }

            cart.clearCart()
            
            // Usar el número real devuelto por el servidor
            const realOrderNumber = createdOrder?.orderNumber || 'Nueva';
            
            // IMPRIMIR COMANDA
            if (createdOrder && printKitchenTicket) {
                generateKitchenTicket(createdOrder);
            }

            addToast('success', 'Pedido enviado', `Orden ${realOrderNumber} enviada a cocina`)
            
            navigate('/kitchen')
        } catch (error) {
            console.error('Error sending order:', error)
            addToast('error', 'Error al enviar', 'No se pudo enviar el pedido. Intente nuevamente.')
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    const calculateProductPrice = () => {
        if (!selectedProduct) return 0
        let price = selectedProduct.basePrice
        if (selectedSize) price += selectedSize.priceModifier
        price += selectedModifiers.reduce((sum, m) => sum + m.priceModifier, 0)
        return price * quantity
    }

    const noteTokens = getNoteTokens(notes)
    const canSend = cart.items.length > 0
    const selectedCategoryName = selectedProduct
        ? categories.find(cat => cat.id === selectedProduct.categoryId)?.name
        : undefined
    const notePresets = getNotePresetsForCategory(selectedCategoryName)
    const deliveryComplete = Boolean(
        cart.customerName.trim() &&
        cart.customerPhone.trim() &&
        cart.customerAddress.trim()
    )
    const [deliveryExpanded, setDeliveryExpanded] = useState(true)

    useEffect(() => {
        if (cart.orderType === 'delivery') {
            setDeliveryExpanded(!deliveryComplete)
        }
    }, [cart.orderType, deliveryComplete])

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className={styles.spinner} />
                <p>Cargando menú...</p>
            </div>
        )
    }

    return (
        <div className={styles.orders}>
            {/* Header */}
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>
                        {cart.orderType === 'dine-in' && tableId && `Mesa ${tableId}${cart.guestCount ? ` · ${cart.guestCount} pax` : ''}`}
                        {cart.orderType === 'delivery' && 'Domicilio'}
                        {cart.orderType === 'takeout' && 'Para Llevar'}
                    </h1>
                </div>
                <button
                    className={styles.cartBtn}
                    onClick={() => setShowCart(true)}
                    data-count={cart.items.length}
                >
                    <ShoppingCart size={22} />
                    {cart.items.length > 0 && (
                        <span className={styles.cartBadge}>{cart.items.length}</span>
                    )}
                </button>
            </header>

            {cart.orderType === 'delivery' && (
                <section className={`${styles.deliveryBar} ${!deliveryComplete ? styles.deliveryBarWarning : ''}`}>
                    <div className={styles.deliveryBarHeader}>
                        <span>Datos de entrega</span>
                        {deliveryComplete && (
                            <button
                                type="button"
                                className={styles.deliveryToggle}
                                onClick={() => setDeliveryExpanded((prev) => !prev)}
                            >
                                {deliveryExpanded ? 'Minimizar' : 'Editar'}
                            </button>
                        )}
                    </div>
                    {deliveryExpanded ? (
                        <div className={styles.deliveryGrid}>
                            <div className={styles.deliveryField}>
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    value={cart.customerName}
                                    onChange={(e) => cart.setCustomer(
                                        e.target.value,
                                        cart.customerPhone,
                                        cart.customerAddress,
                                        cart.customerId
                                    )}
                                    placeholder="Nombre del cliente"
                                />
                            </div>
                            <div className={styles.deliveryField}>
                                <label>Telefono</label>
                                <input
                                    type="tel"
                                    value={cart.customerPhone}
                                    onChange={(e) => cart.setCustomer(
                                        cart.customerName,
                                        e.target.value,
                                        cart.customerAddress,
                                        cart.customerId
                                    )}
                                    placeholder="Ej: 3001234567"
                                />
                            </div>
                            <div className={`${styles.deliveryField} ${styles.deliveryFull}`}>
                                <label>Direccion</label>
                                <textarea
                                    rows={2}
                                    value={cart.customerAddress}
                                    onChange={(e) => cart.setCustomer(
                                        cart.customerName,
                                        cart.customerPhone,
                                        e.target.value,
                                        cart.customerId
                                    )}
                                    placeholder="Direccion completa"
                                />
                            </div>
                            <div className={`${styles.deliveryField} ${styles.deliveryFull}`}>
                                <label>Metodo de pago</label>
                                <select
                                    value={deliveryPaymentMethod}
                                    onChange={(e) => setDeliveryPaymentMethod(e.target.value as PaymentMethod)}
                                >
                                    <option value="cash">Contraentrega</option>
                                    <option value="nequi">Nequi</option>
                                    <option value="daviplata">DaviPlata</option>
                                    <option value="transfer">Transferencia</option>
                                    <option value="card">Tarjeta</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.deliverySummary}>
                            <div className={styles.deliverySummaryRow}>
                                <span>{cart.customerName}</span>
                                <span>{cart.customerPhone}</span>
                            </div>
                            <div className={styles.deliverySummaryRow}>
                                <span className={styles.deliverySummaryAddress}>{cart.customerAddress}</span>
                                <span className={styles.deliverySummaryMethod}>{deliveryPaymentMethod === 'cash' ? 'Contraentrega' : deliveryPaymentMethod.toUpperCase()}</span>
                            </div>
                        </div>
                    )}
                    {!deliveryComplete && (
                        <div className={styles.deliveryHint}>
                            Completa nombre, telefono y direccion para enviar a cocina.
                        </div>
                    )}
                </section>
            )}

            {/* Categories */}
            <nav className={styles.categories}>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.categoryActive : ''}`}
                        onClick={() => setSelectedCategory(cat.id!)}
                    >
                        <span className={styles.categoryIcon}>{cat.icon}</span>
                        <span className={styles.categoryName}>{cat.name}</span>
                    </button>
                ))}
            </nav>

            {topProducts.length > 0 && (
                <section className={styles.quickSection}>
                    <div className={styles.quickHeader}>
                        <span>Top vendidos</span>
                    </div>
                    <div className={styles.quickRow}>
                        {topProducts.map(product => (
                            <button
                                key={product.id}
                                className={styles.quickItem}
                                onClick={() => handleProductClick(product)}
                            >
                                <span className={styles.quickEmoji}>
                                    {product.isCombo ? 'Combo' : categories.find(c => c.id === product.categoryId)?.icon}
                                </span>
                                <span className={styles.quickName}>{product.name}</span>
                                <span className={styles.quickPrice}>{formatPrice(product.basePrice)}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {addOnProducts.length > 0 && (
                <section className={styles.quickSection}>
                    <div className={styles.quickHeader}>
                        <span>Adicionales recomendados</span>
                    </div>
                    <div className={styles.quickRow}>
                        {addOnProducts.map(product => (
                            <button
                                key={product.id}
                                className={styles.quickItem}
                                onClick={() => handleProductClick(product)}
                            >
                                <span className={styles.quickEmoji}>
                                    {categories.find(c => c.id === product.categoryId)?.icon}
                                </span>
                                <span className={styles.quickName}>{product.name}</span>
                                <span className={styles.quickPrice}>{formatPrice(product.basePrice)}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Products Grid */}
            <div className={styles.productsGrid}>
                {getFilteredProducts().map(product => (
                    <button
                        key={product.id}
                        className={styles.productCard}
                        onClick={() => handleProductClick(product)}
                    >
                        <div className={styles.productEmoji}>
                            {product.isCombo ? '🍱' : categories.find(c => c.id === product.categoryId)?.icon}
                        </div>
                        <h3 className={styles.productName}>{product.name}</h3>
                        <p className={styles.productDesc}>{product.description}</p>
                        <span className={styles.productPrice}>{formatPrice(product.basePrice)}</span>
                    </button>
                ))}
            </div>

            {/* Product Modal */}
            {selectedProduct && (
                <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <button className={styles.modalClose} onClick={() => setSelectedProduct(null)}>
                            <X size={24} />
                        </button>

                        <div className={styles.modalHeader}>
                            <span className={styles.modalEmoji}>
                                {selectedProduct.isCombo ? '🍱' : categories.find(c => c.id === selectedProduct.categoryId)?.icon}
                            </span>
                            <h2 className={styles.modalTitle}>{selectedProduct.name}</h2>
                            <p className={styles.modalDesc}>{selectedProduct.description}</p>
                        </div>

                        {/* Sizes */}
                        {selectedProduct.sizes.length > 0 && (
                            <div className={styles.modalSection}>
                                <h3 className={styles.sectionTitle}>Tamaño</h3>
                                <div className={styles.sizesGrid}>
                                    {selectedProduct.sizes.map(size => (
                                        <button
                                            key={size.name}
                                            className={`${styles.sizeBtn} ${selectedSize?.name === size.name ? styles.sizeActive : ''}`}
                                            onClick={() => setSelectedSize(size)}
                                        >
                                            <span className={styles.sizeName}>{size.name}</span>
                                            {size.priceModifier > 0 && (
                                                <span className={styles.sizePrice}>+{formatPrice(size.priceModifier)}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Modifiers */}
                        {selectedProduct.modifierGroups.map(group => (
                            <div key={group.name} className={styles.modalSection}>
                                <h3 className={styles.sectionTitle}>{group.name}</h3>
                                <div className={styles.modifiersGrid}>
                                    {group.modifiers.map(mod => (
                                        <button
                                            key={mod.id}
                                            className={`${styles.modifierBtn} ${selectedModifiers.find(m => m.id === mod.id) ? styles.modifierActive : ''}`}
                                            onClick={() => handleToggleModifier(mod)}
                                        >
                                            <span className={styles.modifierName}>{mod.name}</span>
                                            {mod.priceModifier > 0 && (
                                                <span className={styles.modifierPrice}>+{formatPrice(mod.priceModifier)}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Quantity */}
                        <div className={styles.modalSection}>
                            <h3 className={styles.sectionTitle}>Cantidad</h3>
                            <div className={styles.quantityControl}>
                                <button
                                    className={styles.quantityBtn}
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                >
                                    <Minus size={20} />
                                </button>
                                <span className={styles.quantityValue}>{quantity}</span>
                                <button
                                    className={styles.quantityBtn}
                                    onClick={() => setQuantity(q => q + 1)}
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className={styles.modalSection}>
                            <h3 className={styles.sectionTitle}>Notas / Instrucciones</h3>
                            <div className={styles.notesPresets}>
                                {notePresets.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        className={`${styles.presetBtn} ${noteTokens.includes(preset) ? styles.presetActive : ''}`}
                                        onClick={() => handleToggleNotePreset(preset)}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                className={styles.notesInput}
                                placeholder="Ej: Sin cebolla, Salsa aparte..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Add Button */}
                        <button className={styles.addBtn} onClick={handleAddToCart}>
                            <Plus size={20} />
                            <span>Agregar</span>
                            <span className={styles.addPrice}>{formatPrice(calculateProductPrice())}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {showCart && (
                <div className={styles.cartOverlay} onClick={() => setShowCart(false)}>
                    <div className={styles.cartDrawer} onClick={e => e.stopPropagation()}>
                        <div className={styles.cartHeader}>
                            <h2>Tu Pedido</h2>
                            <button onClick={() => setShowCart(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        {cart.items.length === 0 ? (
                            <div className={styles.cartEmpty}>
                                <ShoppingCart size={48} />
                                <p>Tu carrito está vacío</p>
                            </div>
                        ) : (
                            <>
                                {cart.orderType === 'delivery' && (
                                    <div className={styles.deliverySection}>
                                        <h3 className={styles.deliveryTitle}>Datos de entrega</h3>
                                        <div className={styles.deliveryGrid}>
                                            <div className={styles.deliveryField}>
                                                <label>Nombre</label>
                                                <input
                                                    type="text"
                                                    value={cart.customerName}
                                                    onChange={(e) => cart.setCustomer(
                                                        e.target.value,
                                                        cart.customerPhone,
                                                        cart.customerAddress,
                                                        cart.customerId
                                                    )}
                                                    placeholder="Nombre del cliente"
                                                />
                                            </div>
                                            <div className={styles.deliveryField}>
                                                <label>Telefono</label>
                                                <input
                                                    type="tel"
                                                    value={cart.customerPhone}
                                                    onChange={(e) => cart.setCustomer(
                                                        cart.customerName,
                                                        e.target.value,
                                                        cart.customerAddress,
                                                        cart.customerId
                                                    )}
                                                    placeholder="Ej: 3001234567"
                                                />
                                            </div>
                                            <div className={`${styles.deliveryField} ${styles.deliveryFull}`}>
                                                <label>Direccion</label>
                                                <textarea
                                                    rows={2}
                                                    value={cart.customerAddress}
                                                    onChange={(e) => cart.setCustomer(
                                                        cart.customerName,
                                                        cart.customerPhone,
                                                        e.target.value,
                                                        cart.customerId
                                                    )}
                                                    placeholder="Direccion completa"
                                                />
                                            </div>
                                            <div className={`${styles.deliveryField} ${styles.deliveryFull}`}>
                                                <label>Metodo de pago</label>
                                                <select
                                                    value={deliveryPaymentMethod}
                                                    onChange={(e) => setDeliveryPaymentMethod(e.target.value as PaymentMethod)}
                                                >
                                                    <option value="cash">Contraentrega</option>
                                                    <option value="nequi">Nequi</option>
                                                    <option value="daviplata">DaviPlata</option>
                                                    <option value="transfer">Transferencia</option>
                                                    <option value="card">Tarjeta</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className={styles.cartItems}>
                                    {cart.items.map(item => (
                                        <div key={item.id} className={styles.cartItem}>
                                            <div className={styles.cartItemInfo}>
                                                <h4>{item.product.name}</h4>
                                                {item.selectedSize && (
                                                    <span className={styles.cartItemMeta}>{item.selectedSize.name}</span>
                                                )}
                                                {item.selectedModifiers.length > 0 && (
                                                    <span className={styles.cartItemMeta}>
                                                        {item.selectedModifiers.map(m => m.name).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.cartItemActions}>
                                                <div className={styles.cartItemQty}>
                                                    <button onClick={() => cart.updateItemQuantity(item.id, item.quantity - 1)}>
                                                        <Minus size={16} />
                                                    </button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => cart.updateItemQuantity(item.id, item.quantity + 1)}>
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <span className={styles.cartItemPrice}>{formatPrice(item.totalPrice)}</span>
                                                <button
                                                    className={styles.cartItemRemove}
                                                    onClick={() => cart.removeItem(item.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.cartFooter}>
                                <div className={styles.cartTotal}>
                                    <span>Total</span>
                                    <span className={styles.cartTotalPrice}>{formatPrice(cart.getTotal())}</span>
                                </div>
                                <label className={styles.printToggle}>
                                    <input
                                        type="checkbox"
                                        checked={printKitchenTicket}
                                        onChange={(e) => setPrintKitchenTicket(e.target.checked)}
                                    />
                                    <span>Imprimir comanda</span>
                                </label>
                                <button className={styles.sendBtn} onClick={handleSendOrder} disabled={!canSend}>
                                    <Send size={20} />
                                    <span>Enviar a Cocina</span>
                                </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.mobileActions}>
                <button className={styles.mobileCartBtn} onClick={() => setShowCart(true)}>
                    <ShoppingCart size={20} />
                    <span>Carrito</span>
                    {cart.items.length > 0 && (
                        <span className={styles.mobileBadge}>{cart.items.length}</span>
                    )}
                </button>
                <button className={styles.mobileSendBtn} onClick={handleSendOrder} disabled={!canSend}>
                    <Send size={20} />
                    <span>Enviar</span>
                </button>
            </div>
        </div>
    )
}
