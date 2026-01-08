import { useState, useEffect, useCallback, useMemo } from 'react'
import { ordersApi, productsApi, categoriesApi } from '@/services/api'
import * as XLSX from 'xlsx'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Cell, PieChart, Pie, Legend
} from 'recharts'
import {
    TrendingUp,
    ShoppingBag,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Calendar,
    Loader2,
    RefreshCw,
    CreditCard,
    LayoutGrid,
    X,
    FileSpreadsheet,
    Send
} from 'lucide-react'
import type { Order, Product, Category } from '@/types'
import styles from './Reports.module.css'

type Period = 'today' | 'week' | 'month' | 'all'

export function Reports() {
    const [period, setPeriod] = useState<Period>('today')
    const [allCompletedOrders, setAllCompletedOrders] = useState<Order[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)

    const handleExportExcel = () => {
        if (completedOrders.length === 0) return

        // 1. Datos de Pedidos
        const ordersData = completedOrders.map(order => {
            const orderTimestamp = new Date(order.completedAt || order.confirmedAt || order.createdAt)
            return ({
                'Pedido': `#${order.orderNumber}`,
                'Fecha': orderTimestamp.toLocaleDateString(),
                'Hora': orderTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                'Tipo': order.type === 'dine-in' ? 'Sal¢n' : order.type === 'takeout' ? 'Para llevar' : 'Domicilio',
                'Mesa': order.tableName || order.tableId || '-',
                'M‚todo Pago': order.paymentMethod === 'cash' ? 'Efectivo' :
                               order.paymentMethod === 'card' ? 'Tarjeta' :
                               order.paymentMethod === 'transfer' ? 'Transferencia' :
                               order.paymentMethod === 'nequi' ? 'Nequi' :
                               order.paymentMethod === 'daviplata' ? 'DaviPlata' : 'Mixto',
                'Subtotal': order.subtotal,
                'Descuento': order.discount,
                'Impuestos': order.tax,
                'Total': order.total
            })
        })

        // 2. Datos de Productos (Resumen)
        const productsSummary: Record<string, any> = {}
        completedOrders.forEach(order => {
            order.items.forEach(item => {
                if (!productsSummary[item.productName]) {
                    productsSummary[item.productName] = {
                        'Producto': item.productName,
                        'Cantidad': 0,
                        'Ventas Totales': 0
                    }
                }
                productsSummary[item.productName]['Cantidad'] += item.quantity
                productsSummary[item.productName]['Ventas Totales'] += item.totalPrice
            })
        })

        // 3. Crear Libro de Excel
        const wb = XLSX.utils.book_new()
        
        const wsOrders = XLSX.utils.json_to_sheet(ordersData)
        const wsProducts = XLSX.utils.json_to_sheet(Object.values(productsSummary))
        
        // Formato para el resumen general
        const summaryData = [
            ['Reporte de Ventas Malulos POS'],
            ['Período:', periodLabels[period]],
            ['Fecha Generación:', new Date().toLocaleString()],
            [''],
            ['Métrica', 'Valor'],
            ['Ventas Totales', totalSales],
            ['Pedidos Totales', totalOrders],
            ['Ticket Promedio', avgOrderValue]
        ]
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen')
        XLSX.utils.book_append_sheet(wb, wsOrders, 'Detalle Pedidos')
        XLSX.utils.book_append_sheet(wb, wsProducts, 'Ventas por Producto')

        // 4. Descargar
        const fileName = `Reporte_Malulos_${period}_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, fileName)
    }

    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const [ordersResponse, productsResponse, categoriesResponse] = await Promise.all([
                ordersApi.getAll(),
                productsApi.getAll(),
                categoriesApi.getAll()
            ])

            setAllCompletedOrders(ordersResponse)
            setProducts(productsResponse)
            setCategories(categoriesResponse)
        } catch (error) {
            console.error('Error loading reports data:', error)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [period])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Memorizar órdenes filtradas por el período actual
    const paidOrders = useMemo(() => {
        return allCompletedOrders.filter(order => order.paymentStatus === 'paid')
    }, [allCompletedOrders])

    const completedOrders = useMemo(() => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const getOrderTimestamp = (order: Order) =>
            new Date(order.completedAt || order.confirmedAt || order.createdAt)

        switch (period) {
            case 'today':
                return paidOrders.filter(order => {
                    const orderDate = getOrderTimestamp(order)
                    return orderDate >= today
                })
            case 'week':
                const weekAgo = new Date(today)
                weekAgo.setDate(weekAgo.getDate() - 7)
                return paidOrders.filter(order => getOrderTimestamp(order) >= weekAgo)
            case 'month':
                const monthAgo = new Date(today)
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                return paidOrders.filter(order => getOrderTimestamp(order) >= monthAgo)
            case 'all':
            default:
                return paidOrders
        }
    }, [paidOrders, period])

    // Métricas generales
    const totalSales = completedOrders.reduce((acc, curr) => acc + curr.total, 0)
    const totalOrders = completedOrders.length
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // Comparación con ayer
    const yesterdayComparison = useMemo(() => {
        if (period !== 'today') return null

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const todaySales = completedOrders.reduce((acc, curr) => acc + curr.total, 0)
        const yesterdaySales = paidOrders
            .filter(order => {
                const orderDate = new Date(order.completedAt || order.confirmedAt || order.createdAt)
                return orderDate >= yesterday && orderDate < today
            })
            .reduce((acc, curr) => acc + curr.total, 0)

        if (yesterdaySales === 0) return null

        const percentChange = ((todaySales - yesterdaySales) / yesterdaySales) * 100
        return {
            percentChange,
            isPositive: percentChange >= 0
        }
    }, [completedOrders, paidOrders, period])

    // Datos para Ventas por Hora
    const hourlyData = useMemo(() => {
        const hourlySales = completedOrders.reduce((acc: Record<string, number>, order) => {
            const hour = new Date(order.completedAt || order.confirmedAt || order.createdAt).getHours()
            const hourLabel = `${hour}:00`
            acc[hourLabel] = (acc[hourLabel] || 0) + order.total
            return acc
        }, {})

        return Object.entries(hourlySales)
            .map(([hour, amount]) => ({ hour, amount }))
            .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    }, [completedOrders])

    // Datos para Productos Estrella
    const topProductsData = useMemo(() => {
        const productSales = completedOrders.reduce((acc: Record<string, number>, order) => {
            order.items.forEach(item => {
                acc[item.productName] = (acc[item.productName] || 0) + item.quantity
            })
            return acc
        }, {})

        return Object.entries(productSales)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5)
    }, [completedOrders])

    // Datos para Ventas por Categoría
    const categoryData = useMemo(() => {
        if (products.length === 0 || categories.length === 0) return []

        const productToCategory = products.reduce((acc: Record<number, number>, p) => {
            if (p.id) acc[p.id] = p.categoryId
            return acc
        }, {})

        const categorySales = completedOrders.reduce((acc: Record<number, number>, order) => {
            order.items.forEach(item => {
                const catId = productToCategory[item.productId]
                if (catId) {
                    acc[catId] = (acc[catId] || 0) + item.totalPrice
                }
            })
            return acc
        }, {})

        return Object.entries(categorySales)
            .map(([catId, amount]) => {
                const category = categories.find(c => c.id === parseInt(catId))
                return {
                    name: category ? category.name : 'Otros',
                    value: amount
                }
            })
            .sort((a, b) => b.value - a.value)
    }, [completedOrders, products, categories])

    // Datos para Método de Pago
    const paymentMethodData = useMemo(() => {
        const methods = completedOrders.reduce((acc: Record<string, number>, order) => {
            const method = order.paymentMethod || 'cash'
            acc[method] = (acc[method] || 0) + order.total
            return acc
        }, {})

        const labels: Record<string, string> = {
            cash: 'Efectivo',
            card: 'Tarjeta',
            transfer: 'Transferencia',
            nequi: 'Nequi',
            daviplata: 'DaviPlata',
            mixed: 'Mixto'
        }

        return Object.entries(methods).map(([method, value]) => ({
            name: labels[method] || method,
            value
        }))
    }, [completedOrders])

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    const getTableLabel = (order: Order) => {
        if (order.origin === 'telegram') return '-'
        if (order.tableName) return order.tableName
        if (order.tableId) return `Mesa ${order.tableId}`
        return '-'
    }

    const COLORS = ['#FF6B35', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#EF476F']

    const periodLabels = {
        today: 'Hoy',
        week: 'Semana',
        month: 'Mes',
        all: 'Todo'
    }

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <Loader2 className={styles.spinner} />
                <p>Cargando reportes...</p>
            </div>
        )
    }

    return (
        <div className={styles.reportsPage}>
            <header className={styles.header}>
                <div>
                    <h1>Análisis y Reportes</h1>
                    <p>Resumen de rendimiento del negocio</p>
                </div>
                <div className={styles.headerActions}>
                    <button 
                        className={styles.exportBtn} 
                        onClick={handleExportExcel}
                        title="Exportar a Excel"
                        disabled={completedOrders.length === 0}
                    >
                        <FileSpreadsheet size={18} />
                        <span>Excel</span>
                    </button>
                    <button 
                        className={styles.refreshBtn} 
                        onClick={() => loadData(true)}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={18} className={isRefreshing ? styles.spinning : ''} />
                    </button>
                    <div className={styles.periodSelector}>
                        <Calendar size={18} />
                        {(Object.keys(periodLabels) as Period[]).map((p) => (
                            <button
                                key={p}
                                className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
                                onClick={() => setPeriod(p)}
                            >
                                {periodLabels[p]}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* KPI Cards */}
            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                    <div className={`${styles.kpiIcon} ${styles.blue}`}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiLabel}>Ventas Totales</span>
                        <span className={styles.kpiValue}>{formatPrice(totalSales)}</span>
                        {yesterdayComparison && (
                            <span className={styles.kpiTarget}>
                                {yesterdayComparison.isPositive ? (
                                    <ArrowUpRight size={14} />
                                ) : (
                                    <ArrowDownRight size={14} />
                                )}
                                {yesterdayComparison.isPositive ? '+' : ''}
                                {yesterdayComparison.percentChange.toFixed(1)}% vs ayer
                            </span>
                        )}
                        {!yesterdayComparison && period === 'today' && (
                            <span className={styles.kpiTarget}>Sin datos de ayer</span>
                        )}
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={`${styles.kpiIcon} ${styles.green}`}>
                        <ShoppingBag size={24} />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiLabel}>Pedidos Totales</span>
                        <span className={styles.kpiValue}>{totalOrders}</span>
                        <span className={styles.kpiTarget}>{periodLabels[period]}</span>
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={`${styles.kpiIcon} ${styles.yellow}`}>
                        <Clock size={24} />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiLabel}>Ticket Promedio</span>
                        <span className={styles.kpiValue}>{formatPrice(avgOrderValue)}</span>
                        <span className={styles.kpiTarget}>Por pedido</span>
                    </div>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                {/* Ventas por Hora */}
                <div className={styles.chartCard}>
                    <h3><Clock size={18} /> Ventas por Hora</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={hourlyData}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="var(--color-border)"
                                    strokeOpacity={0.4}
                                />
                                <XAxis
                                    dataKey="hour"
                                    stroke="var(--color-border)"
                                    tick={{ fill: 'var(--color-text-muted)' }}
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="var(--color-border)"
                                    tick={{ fill: 'var(--color-text-muted)' }}
                                    fontSize={12}
                                    tickFormatter={(v) => `$${v / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-card)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        color: 'var(--color-text)'
                                    }}
                                    itemStyle={{ color: 'var(--color-text)' }}
                                    formatter={(value: any) => [formatPrice(value), 'Ventas']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#FF6B35"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#FF6B35' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Productos Estrella */}
                <div className={styles.chartCard}>
                    <h3><TrendingUp size={18} /> Productos Estrella</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topProductsData} layout="vertical">
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={false}
                                    stroke="var(--color-border)"
                                    strokeOpacity={0.4}
                                />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="var(--color-border)"
                                    tick={{ fill: 'var(--color-text-muted)' }}
                                    fontSize={10}
                                    width={100}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-card)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        color: 'var(--color-text)'
                                    }}
                                    itemStyle={{ color: 'var(--color-text)' }}
                                    formatter={(value: any) => [value, 'Unidades']}
                                />
                                <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                                    {topProductsData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ventas por Categoría */}
                <div className={styles.chartCard}>
                    <h3><LayoutGrid size={18} /> Ventas por Categoría</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-card)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        color: 'var(--color-text)'
                                    }}
                                    itemStyle={{ color: 'var(--color-text)' }}
                                    formatter={(value: any) => [formatPrice(value), 'Total']}
                                />
                                <Legend formatter={(value) => (
                                    <span style={{ color: 'var(--color-text)' }}>{value}</span>
                                )} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Métodos de Pago */}
                <div className={styles.chartCard}>
                    <h3><CreditCard size={18} /> Métodos de Pago</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentMethodData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentMethodData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-card)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        color: 'var(--color-text)'
                                    }}
                                    itemStyle={{ color: 'var(--color-text)' }}
                                    formatter={(value: any) => [formatPrice(value), 'Total']}
                                />
                                <Legend formatter={(value) => (
                                    <span style={{ color: 'var(--color-text)' }}>{value}</span>
                                )} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

                        {/* Tabla de pedidos recientes */}

                        <div className={styles.recentOrders}>

                            <div className={styles.sectionHeader}>

                                <h3>Pedidos Recientes</h3>

                                <button 

                                    className={styles.viewAll}

                                    onClick={() => setIsHistoryOpen(true)}

                                >

                                    Ver todo <ChevronRight size={16} />

                                </button>

                            </div>

                            <div className={styles.tableContainer}>

                                <table className={styles.table}>

                                    <thead>

                                        <tr>

                                            <th>Pedido</th>

                                            <th>Hora</th>

                                            <th>Mesa</th>

                                            <th>Método</th>

                                            <th>Total</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {completedOrders.slice(-5).reverse().map((order) => (

                                            <tr key={order.id}>

                                                <td>

                                                    <div className={styles.orderId}>#{order.orderNumber}</div>

                                                </td>

                                                <td>{new Date(order.completedAt || order.confirmedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>

                                                <td>{getTableLabel(order)}</td>

                                                <td>

                                                    <span className={`${styles.badge} ${styles[order.paymentMethod || 'cash']}`}>

                                                        {order.paymentMethod === 'cash' ? 'Efectivo' :

                                                         order.paymentMethod === 'card' ? 'Tarjeta' :

                                                         order.paymentMethod === 'transfer' ? 'Transferencia' :

                                                         order.paymentMethod === 'nequi' ? 'Nequi' :

                                                         order.paymentMethod === 'daviplata' ? 'DaviPlata' : 'Mixto'}

                                                    </span>

                                                </td>

                                                <td className={styles.bold}>{formatPrice(order.total)}</td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        </div>

            

                        {/* Modal de Historial Completo */}

                        {isHistoryOpen && (

                            <div className={styles.modalOverlay} onClick={() => setIsHistoryOpen(false)}>

                                <div className={styles.historyModal} onClick={e => e.stopPropagation()}>

                                    <div className={styles.modalHeader}>

                                        <div>

                                            <h2>Historial de Pedidos</h2>

                                            <p>{periodLabels[period]} ({completedOrders.length} pedidos)</p>

                                        </div>

                                        <button className={styles.closeBtn} onClick={() => setIsHistoryOpen(false)}>

                                            <X size={24} />

                                        </button>

                                    </div>

                                    <div className={styles.modalContent}>

                                        <div className={styles.tableContainer}>

                                            <table className={styles.table}>

                                                                                    <thead>

                                                                                        <tr>

                                                                                            <th>Pedido</th>

                                                                                            <th>Origen</th>

                                                                                            <th>Fecha y Hora</th>

                                                                                            <th>Mesa</th>

                                                                                            <th>Tipo</th>

                                                                                            <th>Método</th>

                                                                                            <th>Total</th>

                                                                                        </tr>

                                                                                    </thead>

                                                                                    <tbody>

                                                                                        {[...completedOrders].reverse().map((order) => (

                                                                                            <tr key={order.id}>

                                                                                                <td>

                                                                                                    <div className={styles.orderId}>#{order.orderNumber}</div>

                                                                                                </td>

                                                                                                <td>

                                                                                                    {order.origin === 'telegram' ? (

                                                                                                        <span className={styles.originTelegram} title="Telegram">

                                                                                                            <Send size={14} />

                                                                                                        </span>

                                                                                                    ) : (

                                                                                                        <span className={styles.originPos} title="POS Local">

                                                                                                            <LayoutGrid size={14} />

                                                                                                        </span>

                                                                                                    )}

                                                                                                </td>

                                                                                                <td>

                                                

                                                                <div className={styles.dateTime}>

                                                                    <span>{new Date(order.completedAt || order.confirmedAt || order.createdAt).toLocaleDateString()}</span>

                                                                    <span className={styles.timeText}>{new Date(order.completedAt || order.confirmedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                                                                </div>

                                                            </td>

                                                            <td>{getTableLabel(order)}</td>

                                                            <td>

                                                                <span className={styles.orderTypeText}>

                                                                    {order.type === 'dine-in' ? 'Salón' :

                                                                     order.type === 'takeout' ? 'Para llevar' : 'Domicilio'}

                                                                </span>

                                                            </td>

                                                            <td>

                                                                <span className={`${styles.badge} ${styles[order.paymentMethod || 'cash']}`}>

                                                                    {order.paymentMethod === 'cash' ? 'Efectivo' :

                                                                     order.paymentMethod === 'card' ? 'Tarjeta' :

                                                                     order.paymentMethod === 'transfer' ? 'Transferencia' :

                                                                     order.paymentMethod === 'nequi' ? 'Nequi' :

                                                                     order.paymentMethod === 'daviplata' ? 'DaviPlata' : 'Mixto'}

                                                                </span>

                                                            </td>

                                                            <td className={styles.bold}>{formatPrice(order.total)}</td>

                                                        </tr>

                                                    ))}

                                                </tbody>

                                            </table>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        )}

                    </div>

                )

            }

            


