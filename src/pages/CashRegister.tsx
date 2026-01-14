import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCashStore } from '@/stores/cashStore'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/context/ToastContext'
import { fetchApi, cashMovementsApi } from '@/services/api'
import { usePolling } from '@/hooks/usePolling'
import type { CashMovement, Order } from '@/types'
import {
    ArrowUpRight,
    Lock,
    Unlock,
    CheckCircle2,
    AlertTriangle,
    UtensilsCrossed,
    Receipt
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import styles from './CashRegister.module.css'

export function CashRegister() {
    const { currentSession, openSession, closeSession, addMovement, checkActiveSession, isLoading } = useCashStore()
    const { user } = useAuthStore()
    const { addToast } = useToast()
    const navigate = useNavigate()

    const [openingBase, setOpeningBase] = useState('100000')
    const [movementAmount, setMovementAmount] = useState('')
    const [movementReason, setMovementReason] = useState('')
    const [closingActual, setClosingActual] = useState('')
    const [openError, setOpenError] = useState('')
    const [closeErrorDetail, setCloseErrorDetail] = useState<string | null>(null)
    const [movements, setMovements] = useState<CashMovement[]>([])
    const [isMovementsLoading, setIsMovementsLoading] = useState(false)
    const [pendingOrders, setPendingOrders] = useState<Order[]>([])
    const [isPendingLoading, setIsPendingLoading] = useState(false)

    const parseMoneyInput = (value: string) => {
        const normalized = value.replace(/[^0-9]/g, '')
        if (!normalized) return NaN
        return Number(normalized)
    }

    const formatMoneyInput = (value: string) => {
        const amount = parseMoneyInput(value)
        if (!Number.isFinite(amount)) return ''
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    useEffect(() => {
        checkActiveSession()
    }, [])

    const loadMovements = useCallback(async (sessionId: number) => {
        setIsMovementsLoading(true)
        try {
            const data = await cashMovementsApi.getBySession(sessionId)
            setMovements(data)
        } catch (error) {
            console.error('Error loading cash movements:', error)
        } finally {
            setIsMovementsLoading(false)
        }
    }, [])

    const loadPendingOrders = useCallback(async () => {
        setIsPendingLoading(true)
        try {
            const data = await fetchApi<Order[]>('/orders?active=true')
            const pending = data.filter(order =>
                order.paymentStatus !== 'paid' &&
                order.status !== 'cancelled' &&
                order.status !== 'completed'
            )
            setPendingOrders(pending)
        } catch (error) {
            console.error('Error loading pending orders:', error)
        } finally {
            setIsPendingLoading(false)
        }
    }, [])

    const handleOpen = async () => {
        if (!user) return
        const amount = parseMoneyInput(openingBase)
        if (!Number.isFinite(amount) || amount < 0) return
        try {
            await openSession(user.id!, user.name, amount)
            setOpenError('')
            addToast('success', 'Caja abierta', 'La caja quedo disponible para el turno.')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo abrir la caja'
            setOpenError(message)
            addToast('error', 'No se pudo abrir', message)
        }
    }

    const handleClose = async () => {
        const amount = parseMoneyInput(closingActual)
        if (!Number.isFinite(amount) || amount < 0) return
        try {
            await closeSession(amount)
            setClosingActual('')
            setMovements([])
            setCloseErrorDetail(null)
            addToast('success', 'Caja cerrada', 'El turno fue cerrado correctamente.')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo cerrar la caja'
            setCloseErrorDetail(message)
            addToast('error', 'No se pudo cerrar', message)
        }
    }

    const handleManualMovement = async (type: 'in' | 'out') => {
        if (!user || !movementReason.trim()) return
        const amount = parseMoneyInput(movementAmount)
        if (!Number.isFinite(amount) || amount <= 0) return
        try {
            await addMovement(type, amount, movementReason, user.id!, user.name)
            setMovementAmount('')
            setMovementReason('')
            if (currentSession?.id) {
                await loadMovements(currentSession.id)
            }
            addToast('success', 'Movimiento registrado', 'El movimiento se aplico en la caja.')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo registrar el movimiento'
            addToast('error', 'Movimiento fallido', message)
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    useEffect(() => {
        if (currentSession?.id) {
            loadMovements(currentSession.id)
        }
    }, [currentSession?.id, loadMovements])

    useEffect(() => {
        loadPendingOrders()
    }, [loadPendingOrders])

    usePolling(loadPendingOrders, 10000)

    const movementSummary = useMemo(() => {
        return movements.reduce(
            (acc, movement) => {
                if (movement.type === 'in') acc.totalIn += movement.amount
                else acc.totalOut += movement.amount
                return acc
            },
            { totalIn: 0, totalOut: 0 }
        )
    }, [movements])

    if (isLoading) return <div className={styles.loading}>Cargando estado de caja...</div>

    if (!currentSession) {
        const openingAmount = parseMoneyInput(openingBase)
        const canOpen = Number.isFinite(openingAmount) && openingAmount >= 0
        const showOpenError = openingBase.trim() !== '' && !canOpen
        return (
            <div className={styles.closedView}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <Lock className={styles.lockIcon} size={48} />
                        <h2>Caja Cerrada</h2>
                        <p>Ingresa la base inicial para comenzar el turno</p>
                    </div>

                    <div className={styles.openingForm}>
                        <div className={styles.inputGroup}>
                            <label>Monto Base Inicial</label>
                            <div className={styles.inputWrapper}>
                                <div className={styles.currencyBox}>$</div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={openingBase}
                                    onChange={e => setOpeningBase(formatMoneyInput(e.target.value))}
                                    placeholder="0"
                                />
                            </div>
                            {showOpenError && (
                                <p className={styles.validation}>Ingresa un monto valido.</p>
                            )}
                        </div>

                        <button className={styles.openBtn} onClick={handleOpen} disabled={!canOpen}>
                            <Unlock size={20} />
                            Abrir Caja
                        </button>
                        {openError && (
                            <p className={styles.sessionAlert}>{openError}</p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Parseo seguro de valores
    const openingAmount = Number(currentSession.openingAmount) || 0
    const cashSales = Number(currentSession.cashSales) || 0
    const cardSales = Number(currentSession.cardSales) || 0
    const transferSales = Number(currentSession.transferSales) || 0
    const nequiSales = Number(currentSession.nequiSales) || 0
    const daviplataSales = Number(currentSession.davipplataSales) || 0
    
    const expectedTotal = openingAmount + cashSales
    const openedAtDate = currentSession.openedAt ? new Date(currentSession.openedAt) : new Date()
    const today = new Date()
    const isPreviousDay = openedAtDate.getFullYear() !== today.getFullYear()
        || openedAtDate.getMonth() !== today.getMonth()
        || openedAtDate.getDate() !== today.getDate()

    const movementParsed = parseMoneyInput(movementAmount)
    const canMove = Boolean(movementReason.trim()) && Number.isFinite(movementParsed) && movementParsed > 0
    const showMoveError = (movementAmount.trim() !== '' || movementReason.trim() !== '') && !canMove
    const closingParsed = parseMoneyInput(closingActual)
    const canClose = Number.isFinite(closingParsed) && closingParsed >= 0
    const showCloseError = closingActual.trim() !== '' && !canClose
    const totalNet = movementSummary.totalIn - movementSummary.totalOut
    const getPendingLabel = (order: Order) => {
        if (order.tableName) return order.tableName
        if (order.tableId) return `Mesa ${order.tableId}`
        if (order.type === 'delivery') return 'Domicilio'
        if (order.type === 'takeout') return 'Para llevar'
        if (order.origin === 'telegram') return 'Telegram'
        return 'Pedido'
    }
    const closeErrorSummary = closeErrorDetail
        ? closeErrorDetail.replace('No se puede cerrar la caja, hay ', '')
        : null
    const closeErrorTablesMatch = closeErrorSummary?.match(/mesas no disponibles \(\d+\): (.*?)(?: y pedidos sin pagar|$)/)
    const closeErrorOrdersMatch = closeErrorSummary?.match(/pedidos sin pagar \(\d+\): (.*)$/)
    const closeErrorTables = closeErrorTablesMatch?.[1]
        ? closeErrorTablesMatch[1].split(', ').filter(Boolean)
        : []
    const closeErrorOrders = closeErrorOrdersMatch?.[1]
        ? closeErrorOrdersMatch[1].split(', ').filter(Boolean)
        : []
    const hasStructuredCloseDetail = closeErrorTables.length > 0 || closeErrorOrders.length > 0
    const handleCloseIssueNavigate = (path: string) => {
        setCloseErrorDetail(null)
        navigate(path)
    }

    return (
        <div className={styles.openView}>
            <header className={styles.header}>
                <div className={styles.sessionInfo}>
                    <h1>Control de Caja</h1>
                    <p>Responsable: <strong>{currentSession.userName}</strong> | Abierta: {!isNaN(openedAtDate.getTime()) ? openedAtDate.toLocaleTimeString() : 'Hora desconocida'}</p>
                </div>
                <div className={styles.statusBadge}>
                    <Unlock size={14} />
                    Abierta
                </div>
            </header>
            {isPreviousDay && (
                <div className={styles.sessionAlert}>
                    Caja abierta desde un dia anterior. Cierra la caja para iniciar el nuevo turno.
                </div>
            )}

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Base Inicial</span>
                    <span className={styles.statValue}>{formatPrice(openingAmount)}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Efectivo</span>
                    <span className={styles.statValue}>{formatPrice(cashSales)}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Tarjeta</span>
                    <span className={styles.statValue}>{formatPrice(cardSales)}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Transferencia</span>
                    <span className={styles.statValue}>{formatPrice(transferSales)}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statNequi}`}>
                    <span className={styles.statLabel}>Nequi</span>
                    <span className={styles.statValue}>{formatPrice(nequiSales)}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statDaviplata}`}>
                    <span className={styles.statLabel}>DaviPlata</span>
                    <span className={styles.statValue}>{formatPrice(daviplataSales)}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statPrimary}`}>
                    <span className={styles.statLabel}>Total Esperado en Caja</span>
                    <span className={styles.statValue}>{formatPrice(expectedTotal)}</span>
                </div>
            </div>

            <section className={styles.pendingSection}>
                <div className={styles.pendingHeader}>
                    <div>
                        <h3>Pedidos pendientes de pago</h3>
                        <p>Revisa takeout, domicilios o pedidos sin pago confirmado.</p>
                    </div>
                    <div className={styles.pendingActions}>
                        <span className={styles.pendingCount}>{pendingOrders.length}</span>
                        {pendingOrders.length > 0 && (
                            <button
                                className={styles.pendingLink}
                                onClick={() => navigate('/orders')}
                                type="button"
                            >
                                Ir a Pedidos
                            </button>
                        )}
                    </div>
                </div>
                {isPendingLoading ? (
                    <div className={styles.pendingEmpty}>Cargando pendientes...</div>
                ) : pendingOrders.length === 0 ? (
                    <div className={styles.pendingEmpty}>Todo al día. No hay pedidos pendientes.</div>
                ) : (
                    <div className={styles.pendingList}>
                        {pendingOrders.slice(0, 6).map(order => (
                            <div key={order.id} className={styles.pendingItem}>
                                <div>
                                    <span className={styles.pendingOrder}>Pedido {order.orderNumber}</span>
                                    <span className={styles.pendingMeta}>{getPendingLabel(order)}</span>
                                </div>
                                <span className={styles.pendingTotal}>{formatPrice(order.total)}</span>
                            </div>
                        ))}
                        {pendingOrders.length > 6 && (
                            <span className={styles.pendingMore}>Y {pendingOrders.length - 6} más...</span>
                        )}
                    </div>
                )}
            </section>

            <div className={styles.actionsGrid}>
                {/* Entradas/Salidas Manuales */}
                <section className={styles.section}>
                    <h3><ArrowUpRight size={18} /> Movimiento Manual</h3>
                    <div className={styles.movementForm}>
                        <input
                            type="text"
                            placeholder="Motivo (ej: Compra de hielo)"
                            value={movementReason}
                            onChange={e => setMovementReason(e.target.value)}
                            className={styles.movementReasonInput}
                        />
                        <div className={styles.inputWrapper}>
                            <div className={styles.currencyBox}>$</div>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Monto"
                                value={movementAmount}
                                onChange={e => setMovementAmount(formatMoneyInput(e.target.value))}
                            />
                        </div>
                        {showMoveError && (
                            <p className={styles.validation}>Completa motivo y monto mayor a 0.</p>
                        )}
                        <div className={styles.moveBtns}>
                            <button
                                className={styles.inBtn}
                                onClick={() => handleManualMovement('in')}
                                disabled={!canMove}
                            >
                                Ingreso
                            </button>
                            <button
                                className={styles.outBtn}
                                onClick={() => handleManualMovement('out')}
                                disabled={!canMove}
                            >
                                Salida
                            </button>
                        </div>
                        <div className={styles.movementSummary}>
                            <div>
                                <span>Ingresos</span>
                                <strong>{formatPrice(movementSummary.totalIn)}</strong>
                            </div>
                            <div>
                                <span>Salidas</span>
                                <strong>{formatPrice(movementSummary.totalOut)}</strong>
                            </div>
                            <div>
                                <span>Balance</span>
                                <strong>{formatPrice(totalNet)}</strong>
                            </div>
                        </div>
                        <div className={styles.movementList}>
                            {isMovementsLoading ? (
                                <div className={styles.movementEmpty}>Cargando movimientos...</div>
                            ) : movements.length === 0 ? (
                                <div className={styles.movementEmpty}>Sin movimientos manuales.</div>
                            ) : (
                                movements.slice(0, 6).map(movement => (
                                    <div key={movement.id} className={styles.movementItem}>
                                        <div>
                                            <span className={styles.movementReason}>{movement.reason}</span>
                                            <span className={styles.movementMeta}>
                                                {new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {movement.userName}
                                            </span>
                                        </div>
                                        <span className={movement.type === 'in' ? styles.movementIn : styles.movementOut}>
                                            {movement.type === 'in' ? '+' : '-'}{formatPrice(movement.amount)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {/* Cierre de Caja */}
                <section className={styles.section}>
                    <h3><CheckCircle2 size={18} /> Cierre de Turno</h3>
                    <div className={styles.closeForm}>
                        <p>Cuenta el efectivo real en caja e ingresalo:</p>
                        <div className={styles.inputWrapper}>
                            <div className={styles.currencyBox}>$</div>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Monto real contado"
                                value={closingActual}
                                onChange={e => setClosingActual(formatMoneyInput(e.target.value))}
                            />
                        </div>
                        {showCloseError && (
                            <p className={styles.validation}>Ingresa un monto valido.</p>
                        )}

                        {closingActual.trim() !== '' && Number.isFinite(closingParsed) && (
                            <div className={`${styles.previewDiff} ${closingParsed >= expectedTotal ? styles.diffPositive : styles.diffNegative}`}>
                                Diferencia: {formatPrice(closingParsed - expectedTotal)}
                            </div>
                        )}

                        <button className={styles.closeBtn} onClick={handleClose} disabled={!canClose}>
                            <Lock size={20} />
                            Cerrar Caja
                        </button>
                    </div>
                </section>
            </div>
            <Dialog open={Boolean(closeErrorDetail)} onOpenChange={open => !open && setCloseErrorDetail(null)}>
                <DialogContent className="max-w-2xl border border-[var(--color-border)] bg-bgCard p-0 text-textPrimary shadow-2xl">
                    <DialogHeader className="border-b border-[var(--color-border)] px-6 py-5">
                        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-textMuted">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)]">
                                <AlertTriangle size={16} />
                            </span>
                            Cierre bloqueado
                        </div>
                        <DialogTitle className="mt-4 text-2xl font-semibold text-textPrimary">
                            Revisar mesas y pagos
                        </DialogTitle>
                        <DialogDescription className="mt-2 text-sm text-textMuted">
                            Antes de cerrar la caja, asegúrate de que todo esté disponible y pagado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5">
                        <div className="rounded-2xl border border-[var(--color-warning-border)] bg-[var(--color-warning-soft)] p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-warning)]">
                                    <AlertTriangle size={16} />
                                    Pendientes detectados
                                </div>
                                <span className="text-xs text-textMuted">
                                    {closeErrorTables.length + closeErrorOrders.length} en total
                                </span>
                            </div>
                            <div className="mt-4 grid gap-3">
                                {!hasStructuredCloseDetail && closeErrorDetail && (
                                    <p className="text-sm text-textPrimary">{closeErrorDetail}</p>
                                )}
                                {closeErrorTables.length > 0 && (
                                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 shadow-sm">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
                                            <UtensilsCrossed className="text-[var(--color-success)]" size={16} />
                                            Mesas no disponibles
                                            <span className="ml-auto text-xs text-textMuted">{closeErrorTables.length}</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {closeErrorTables.map(table => (
                                                <span
                                                    key={table}
                                                    className="rounded-full bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--color-success)]"
                                                >
                                                    {table}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {closeErrorOrders.length > 0 && (
                                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 shadow-sm">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
                                            <Receipt className="text-[var(--color-danger)]" size={16} />
                                            Pedidos sin pagar
                                            <span className="ml-auto text-xs text-textMuted">{closeErrorOrders.length}</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {closeErrorOrders.map(order => (
                                                <span
                                                    key={order}
                                                    className="rounded-full bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--color-danger)]"
                                                >
                                                    {order}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-hover)] p-4 text-xs text-textMuted">
                            Cierra las mesas pendientes y confirma los pagos antes de finalizar el turno.
                        </div>
                    </div>
                    <DialogFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                className="rounded-lg border border-[var(--color-border)] bg-bgCard px-4 py-2 text-sm font-semibold text-textPrimary transition hover:bg-bgHover"
                                onClick={() => handleCloseIssueNavigate('/tables')}
                                type="button"
                            >
                                Ir a Mesas
                            </button>
                            <button
                                className="rounded-lg border border-[var(--color-border)] bg-bgCard px-4 py-2 text-sm font-semibold text-textPrimary transition hover:bg-bgHover"
                                onClick={() => handleCloseIssueNavigate('/orders')}
                                type="button"
                            >
                                Ir a Pedidos
                            </button>
                        </div>
                        <button
                            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-dark)] transition hover:bg-[var(--color-primary-dark)]"
                            onClick={() => setCloseErrorDetail(null)}
                            type="button"
                        >
                            Entendido
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
