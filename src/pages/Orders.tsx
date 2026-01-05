import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { useCartStore } from '@/stores/cartStore'
import {
    Plus,
    Minus,
    ShoppingCart,
    Trash2,
    Send,
    ArrowLeft,
    X
} from 'lucide-react'
import type { Product, ProductSize, Modifier, Category } from '@/types'
import styles from './Orders.module.css'

export function Orders() {
    const { tableId } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>()
    const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([])
    const [quantity, setQuantity] = useState(1)
    const [showCart, setShowCart] = useState(false)

    const cart = useCartStore()

    const categories = useLiveQuery<Category[]>(() =>
        db.categories.toArray().then(cats => cats.filter(c => c.isActive).sort((a, b) => a.order - b.order))
    )

    const products = useLiveQuery<Product[]>(
        () => selectedCategory
            ? db.products.where('categoryId').equals(selectedCategory).filter(p => p.isActive).toArray()
            : db.products.filter(p => p.isActive).toArray(),
        [selectedCategory]
    )

    // Configurar tipo de pedido y mesa
    useEffect(() => {
        const type = searchParams.get('type')
        if (type === 'delivery') {
            cart.setOrderType('delivery')
        } else if (type === 'takeout') {
            cart.setOrderType('takeout')
        } else if (tableId) {
            cart.setOrderType('dine-in')
            cart.setTable(parseInt(tableId))
        }
    }, [tableId, searchParams])

    // Seleccionar primera categoría
    useEffect(() => {
        if (categories && categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0].id!)
        }
    }, [categories])

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product)
        setSelectedSize(product.sizes[0])
        setSelectedModifiers([])
        setQuantity(1)
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

    const handleAddToCart = () => {
        if (!selectedProduct) return

        cart.addItem(
            selectedProduct,
            quantity,
            selectedSize,
            selectedModifiers,
            [],
            ''
        )

        setSelectedProduct(null)
        setShowCart(true)
    }

    const handleSendOrder = async () => {
        if (cart.items.length === 0) return

        const orderNumber = `#${String(Date.now()).slice(-4)}`

        const table = tableId ? await db.restaurantTables.get(parseInt(tableId)) : null

        await db.orders.add({
            orderNumber,
            type: cart.orderType,
            tableId: tableId ? parseInt(tableId) : undefined,
            tableName: table?.name,
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
            paidAmount: 0,
            createdAt: new Date()
        })

        // Actualizar estado de la mesa
        if (tableId) {
            await db.restaurantTables.update(parseInt(tableId), { status: 'occupied' })
        }

        cart.clearCart()
        navigate('/kitchen')
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

    return (
        <div className={styles.orders}>
            {/* Header */}
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>
                        {cart.orderType === 'dine-in' && tableId && `Mesa ${tableId}`}
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

            {/* Categories */}
            <nav className={styles.categories}>
                {categories?.map(cat => (
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

            {/* Products Grid */}
            <div className={styles.productsGrid}>
                {products?.map(product => (
                    <button
                        key={product.id}
                        className={styles.productCard}
                        onClick={() => handleProductClick(product)}
                    >
                        <div className={styles.productEmoji}>
                            {product.isCombo ? '🍱' : categories?.find(c => c.id === product.categoryId)?.icon}
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
                                {selectedProduct.isCombo ? '🍱' : categories?.find(c => c.id === selectedProduct.categoryId)?.icon}
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
                                    <button className={styles.sendBtn} onClick={handleSendOrder}>
                                        <Send size={20} />
                                        <span>Enviar a Cocina</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
