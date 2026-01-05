import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { Package, Edit, Trash2 } from 'lucide-react'
import type { Category, Product } from '@/types'
import styles from './Menu.module.css'

export function Menu() {
    const categories = useLiveQuery<Category[]>(() => db.categories.toArray().then(c => c.sort((a, b) => a.order - b.order)))
    const products = useLiveQuery<Product[]>(() => db.products.toArray())

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    const getProductsByCategory = (categoryId: number) => {
        return products?.filter(p => p.categoryId === categoryId) || []
    }

    return (
        <div className={styles.menu}>
            <header className={styles.header}>
                <h1 className={styles.title}>Gestión de Menú</h1>
                <p className={styles.subtitle}>
                    {products?.length || 0} productos en {categories?.length || 0} categorías
                </p>
            </header>

            <div className={styles.content}>
                {categories?.map(category => (
                    <section key={category.id} className={styles.categorySection}>
                        <div className={styles.categoryHeader}>
                            <span className={styles.categoryIcon}>{category.icon}</span>
                            <h2 className={styles.categoryName}>{category.name}</h2>
                            <span className={styles.productCount}>
                                {getProductsByCategory(category.id!).length} productos
                            </span>
                        </div>

                        <div className={styles.productsList}>
                            {getProductsByCategory(category.id!).map(product => (
                                <div key={product.id} className={styles.productItem}>
                                    <div className={styles.productInfo}>
                                        <h3 className={styles.productName}>
                                            {product.name}
                                            {product.isCombo && <span className={styles.comboBadge}>Combo</span>}
                                        </h3>
                                        <p className={styles.productDesc}>{product.description}</p>

                                        {product.sizes.length > 0 && (
                                            <div className={styles.productSizes}>
                                                {product.sizes.map(size => (
                                                    <span key={size.name} className={styles.sizeTag}>
                                                        {size.name}
                                                        {size.priceModifier > 0 && ` (+${formatPrice(size.priceModifier)})`}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {product.modifierGroups.length > 0 && (
                                            <div className={styles.modifiersInfo}>
                                                {product.modifierGroups.map(group => (
                                                    <span key={group.name} className={styles.modifierGroup}>
                                                        {group.name}: {group.modifiers.length} opciones
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.productActions}>
                                        <span className={styles.productPrice}>{formatPrice(product.basePrice)}</span>
                                        <div className={styles.actionButtons}>
                                            <button className={styles.editBtn} title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button className={styles.deleteBtn} title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {getProductsByCategory(category.id!).length === 0 && (
                                <div className={styles.emptyCategory}>
                                    <Package size={24} />
                                    <span>Sin productos en esta categoría</span>
                                </div>
                            )}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}
