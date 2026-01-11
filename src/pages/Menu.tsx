import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { Package, Edit, Trash2, X, Save, Plus, Loader2 } from 'lucide-react'
import type { Category, Product } from '@/types'
import styles from './Menu.module.css'

export function Menu() {
    const { addToast } = useToast()
    const [categories, setCategories] = useState<Category[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [isCreatingNew, setIsCreatingNew] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [catsData, prodsData] = await Promise.all([
                fetchApi<Category[]>('/categories'),
                fetchApi<Product[]>('/products')
            ])
            setCategories(catsData.sort((a, b) => a.order - b.order))
            setProducts(prodsData)
        } catch (error) {
            console.error('Error loading menu data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    const getProductsByCategory = (categoryId: number) => {
        return products.filter(p => p.categoryId === categoryId)
    }

    const handleCreate = () => {
        const newProduct: Product = {
            categoryId: categories[0]?.id || 1,
            name: '',
            description: '',
            basePrice: 0,
            sizes: [],
            modifierGroups: [],
            isCombo: false,
            comboItems: [],
            isActive: true,
            createdAt: new Date()
        }
        setEditingProduct(newProduct)
        setIsCreatingNew(true)
        setShowEditModal(true)
    }

    const handleEdit = (product: Product) => {
        setEditingProduct({ ...product })
        setIsCreatingNew(false)
        setShowEditModal(true)
    }

    const handleDelete = async (product: Product) => {
        if (!product.id) return
        
        if (confirm(`¿Estás seguro de eliminar "${product.name}"?`)) {
            try {
                await fetchApi(`/products/${product.id}`, { method: 'DELETE' })
                addToast('success', 'Producto eliminado', `Se eliminó ${product.name} correctamente`)
                await loadData() // Recargar datos
            } catch (error) {
                console.error('Error al eliminar producto:', error)
                addToast('error', 'Error al eliminar', 'No se pudo eliminar el producto')
            }
        }
    }

    const handleAddModifierGroup = () => {
        if (!editingProduct) return
        setEditingProduct({
            ...editingProduct,
            modifierGroups: [
                ...editingProduct.modifierGroups,
                {
                    name: '',
                    minSelect: 0,
                    maxSelect: 1,
                    modifiers: []
                }
            ]
        })
    }

    const handleRemoveModifierGroup = (index: number) => {
        if (!editingProduct) return
        const newGroups = [...editingProduct.modifierGroups]
        newGroups.splice(index, 1)
        setEditingProduct({ ...editingProduct, modifierGroups: newGroups })
    }

    const handleUpdateGroup = (index: number, field: string, value: any) => {
        if (!editingProduct) return
        const newGroups = [...editingProduct.modifierGroups]
        newGroups[index] = { ...newGroups[index], [field]: value }
        setEditingProduct({ ...editingProduct, modifierGroups: newGroups })
    }

    const handleAddModifier = (groupIndex: number) => {
        if (!editingProduct) return
        const newGroups = [...editingProduct.modifierGroups]
        newGroups[groupIndex].modifiers.push({
            id: String(Date.now()),
            name: '',
            priceModifier: 0,
            isDefault: false
        })
        setEditingProduct({ ...editingProduct, modifierGroups: newGroups })
    }

    const handleRemoveModifier = (groupIndex: number, modIndex: number) => {
        if (!editingProduct) return
        const newGroups = [...editingProduct.modifierGroups]
        newGroups[groupIndex].modifiers.splice(modIndex, 1)
        setEditingProduct({ ...editingProduct, modifierGroups: newGroups })
    }

    const handleUpdateModifier = (groupIndex: number, modIndex: number, field: string, value: any) => {
        if (!editingProduct) return
        const newGroups = [...editingProduct.modifierGroups]
        newGroups[groupIndex].modifiers[modIndex] = { 
            ...newGroups[groupIndex].modifiers[modIndex], 
            [field]: value 
        }
        setEditingProduct({ ...editingProduct, modifierGroups: newGroups })
    }

    const handleSave = async () => {
        if (!editingProduct) return

        if (!editingProduct.name.trim()) {
            addToast('error', 'Faltan datos', 'El nombre del producto es requerido')
            return
        }

        if (editingProduct.basePrice <= 0) {
            addToast('error', 'Precio inválido', 'El precio debe ser mayor a 0')
            return
        }

        // Validar grupos de modificadores
        for (const group of editingProduct.modifierGroups) {
            if (!group.name.trim()) {
                addToast('error', 'Faltan datos', 'Todos los grupos de modificadores deben tener nombre')
                return
            }
            for (const mod of group.modifiers) {
                if (!mod.name.trim()) {
                    addToast('error', 'Faltan datos', `Todas las opciones del grupo "${group.name}" deben tener nombre`)
                    return
                }
            }
        }

        setIsSaving(true)
        try {
            if (isCreatingNew) {
                // Crear nuevo producto
                await fetchApi('/products', {
                    method: 'POST',
                    body: JSON.stringify(editingProduct)
                })
                addToast('success', 'Producto creado', `${editingProduct.name} se ha creado exitosamente`)
            } else {
                // Actualizar producto existente
                if (!editingProduct.id) return
                await fetchApi(`/products/${editingProduct.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(editingProduct)
                })
                addToast('success', 'Producto actualizado', `${editingProduct.name} se ha actualizado exitosamente`)
            }
            setShowEditModal(false)
            setEditingProduct(null)
            setIsCreatingNew(false)
            setHasUnsavedChanges(false)
            await loadData() // Recargar datos
        } catch (error) {
            console.error('Error al guardar producto:', error)
            addToast('error', 'Error al guardar', 'Hubo un problema al guardar los cambios')
        } finally {
            setIsSaving(false)
        }
    }

    const handleCloseModal = () => {
        if (hasUnsavedChanges) {
            if (!confirm('¿Estás seguro de cancelar? Los cambios no guardados se perderán.')) {
                return
            }
        }
        setShowEditModal(false)
        setEditingProduct(null)
        setIsCreatingNew(false)
        setHasUnsavedChanges(false)
    }

    const handleProductChange = (updates: Partial<Product>) => {
        if (!editingProduct) return
        setEditingProduct({ ...editingProduct, ...updates })
        setHasUnsavedChanges(true)
    }

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className={styles.spinner} />
                <p>Cargando menú...</p>
            </div>
        )
    }

    return (
        <div className={styles.menu}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Gestión de Menú</h1>
                    <p className={styles.subtitle}>
                        {products.length} productos en {categories.length} categorías
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.addButtonInline} onClick={handleCreate}>
                        <Plus size={18} />
                        <span>Agregar producto</span>
                    </button>
                </div>
            </header>

            <div className={styles.content}>
                {categories.map(category => (
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
                                            {Boolean(product.isCombo) && <span className={styles.comboBadge}>Combo</span>}
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
                                            <button
                                                className={styles.editBtn}
                                                title="Editar"
                                                onClick={() => handleEdit(product)}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                title="Eliminar"
                                                onClick={() => handleDelete(product)}
                                            >
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

            {/* Modal de Edición/Creación */}
            {showEditModal && editingProduct && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{isCreatingNew ? 'Crear Nuevo Producto' : 'Editar Producto'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Datos Básicos */}
                            <div className={styles.formSection}>
                                <h3>Información Básica</h3>

                                <div className={styles.formGroup}>
                                    <label>Nombre del Producto <span className={styles.required}>*</span></label>
                                    <input
                                        type="text"
                                        value={editingProduct.name}
                                        onChange={(e) => handleProductChange({ name: e.target.value })}
                                        placeholder="Ej: Hamburguesa Clásica"
                                        autoFocus
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Descripción</label>
                                    <textarea
                                        value={editingProduct.description}
                                        onChange={(e) => handleProductChange({ description: e.target.value })}
                                        rows={2}
                                        placeholder="Describe brevemente el producto..."
                                    />
                                </div>

                                <div className={styles.grid2}>
                                    <div className={styles.formGroup}>
                                        <label>Categoría <span className={styles.required}>*</span></label>
                                        <select
                                            value={editingProduct.categoryId}
                                            onChange={(e) => handleProductChange({ categoryId: Number(e.target.value) })}
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.icon} {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Precio Base <span className={styles.required}>*</span></label>
                                        <input
                                            type="number"
                                            value={editingProduct.basePrice}
                                            onChange={(e) => handleProductChange({ basePrice: Number(e.target.value) })}
                                            min="0"
                                            step="500"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Personalización */}
                            <div className={styles.formSection}>
                                <div className={styles.sectionHeader}>
                                    <h3>Personalización y Adiciones</h3>
                                    <button className={styles.addSmallBtn} onClick={handleAddModifierGroup}>
                                        <Plus size={16} /> Agregar Grupo
                                    </button>
                                </div>
                                
                                {editingProduct.modifierGroups.length === 0 && (
                                    <p className={styles.emptyText}>No hay grupos de personalización.</p>
                                )}

                                {editingProduct.modifierGroups.map((group, groupIndex) => (
                                    <div key={groupIndex} className={styles.modifierGroupCard}>
                                        <div className={styles.groupHeader}>
                                            <input
                                                type="text"
                                                className={styles.groupNameInput}
                                                value={group.name}
                                                onChange={(e) => handleUpdateGroup(groupIndex, 'name', e.target.value)}
                                                placeholder="Nombre del Grupo (Ej: Salsas, Adiciones)"
                                            />
                                            <button 
                                                className={styles.removeBtn}
                                                onClick={() => handleRemoveModifierGroup(groupIndex)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        
                                        <div className={styles.groupSettings}>
                                            <label>
                                                Mínimo:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={group.minSelect}
                                                    onChange={(e) => handleUpdateGroup(groupIndex, 'minSelect', Number(e.target.value))}
                                                />
                                            </label>
                                            <label>
                                                Máximo:
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={group.maxSelect}
                                                    onChange={(e) => handleUpdateGroup(groupIndex, 'maxSelect', Number(e.target.value))}
                                                />
                                            </label>
                                        </div>

                                        <div className={styles.modifiersList}>
                                            {group.modifiers.map((mod, modIndex) => (
                                                <div key={modIndex} className={styles.modifierRow}>
                                                    <input
                                                        type="text"
                                                        placeholder="Opción (Ej: Sin Salsa)"
                                                        value={mod.name}
                                                        onChange={(e) => handleUpdateModifier(groupIndex, modIndex, 'name', e.target.value)}
                                                        style={{ flex: 2 }}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Precio (0 = Gratis)"
                                                        value={mod.priceModifier}
                                                        onChange={(e) => handleUpdateModifier(groupIndex, modIndex, 'priceModifier', Number(e.target.value))}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <button 
                                                        className={styles.removeSmallBtn}
                                                        onClick={() => handleRemoveModifier(groupIndex, modIndex)}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                className={styles.addOptionBtn}
                                                onClick={() => handleAddModifier(groupIndex)}
                                            >
                                                <Plus size={14} /> Agregar Opción
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={editingProduct.isActive}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                                    />
                                    <span>Producto Activo</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelBtn}
                                onClick={handleCloseModal}
                                disabled={isSaving}
                            >
                                <X size={18} />
                                Cancelar
                            </button>
                            <button
                                className={styles.saveBtn}
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className={styles.spinner} size={18} />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Botón flotante para agregar productos */}
            <button className={styles.addButton} onClick={handleCreate} title="Agregar Producto">
                <Plus size={24} />
            </button>
        </div>
    )
}
