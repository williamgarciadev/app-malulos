import { useState, useEffect } from 'react'
import { useCashStore } from '@/stores/cashStore'
import { useAuthStore } from '@/stores/authStore'
import {
    ArrowUpRight,
    Lock,
    Unlock,
    CheckCircle2
} from 'lucide-react'
import styles from './CashRegister.module.css'

export function CashRegister() {
    const { currentSession, openSession, closeSession, addMovement, checkActiveSession, isLoading } = useCashStore()
    const { user } = useAuthStore()

    const [openingBase, setOpeningBase] = useState('100000')
    const [movementAmount, setMovementAmount] = useState('')
    const [movementReason, setMovementReason] = useState('')
    const [closingActual, setClosingActual] = useState('')

    useEffect(() => {
        checkActiveSession()
    }, [])

    const handleOpen = async () => {
        if (!user) return
        const amount = parseFloat(openingBase) || 0
        await openSession(user.id!, user.name, amount)
    }

    const handleClose = async () => {
        const amount = parseFloat(closingActual) || 0
        await closeSession(amount)
        setClosingActual('')
    }

    const handleManualMovement = async (type: 'in' | 'out') => {
        if (!user || !movementAmount || !movementReason) return
        const amount = parseFloat(movementAmount)
        await addMovement(type, amount, movementReason, user.id!, user.name)
        setMovementAmount('')
        setMovementReason('')
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price)
    }

    if (isLoading) return <div className={styles.loading}>Cargando estado de caja...</div>

    if (!currentSession) {
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
                                <span className={styles.currency}>$</span>
                                <input
                                    type="number"
                                    value={openingBase}
                                    onChange={e => setOpeningBase(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <button className={styles.openBtn} onClick={handleOpen}>
                            <Unlock size={20} />
                            Abrir Caja
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const expectedTotal = currentSession.openingAmount + currentSession.cashSales

    return (
        <div className={styles.openView}>
            <header className={styles.header}>
                <div className={styles.sessionInfo}>
                    <h1>Control de Caja</h1>
                    <p>Responsable: <strong>{currentSession.userName}</strong> | Abierta: {new Date(currentSession.openedAt).toLocaleTimeString()}</p>
                </div>
                <div className={styles.statusBadge}>
                    <Unlock size={14} />
                    Abierta
                </div>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Base Inicial</span>
                    <span className={styles.statValue}>{formatPrice(currentSession.openingAmount)}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Efectivo</span>
                    <span className={styles.statValue}>{formatPrice(currentSession.cashSales || 0)}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Tarjeta</span>
                    <span className={styles.statValue}>{formatPrice(currentSession.cardSales || 0)}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Transferencia</span>
                    <span className={styles.statValue}>{formatPrice(currentSession.transferSales || 0)}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statNequi}`}>
                    <span className={styles.statLabel}>Nequi</span>
                    <span className={styles.statValue}>{formatPrice(currentSession.nequiSales || 0)}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statDaviplata}`}>
                    <span className={styles.statLabel}>DaviPlata</span>
                    <span className={styles.statValue}>{formatPrice(currentSession.davipplataSales || 0)}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statPrimary}`}>
                    <span className={styles.statLabel}>Total Esperado en Caja</span>
                    <span className={styles.statValue}>{formatPrice(expectedTotal)}</span>
                </div>
            </div>

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
                        />
                        <div className={styles.inputWrapper}>
                            <span className={styles.currency}>$</span>
                            <input
                                type="number"
                                placeholder="Monto"
                                value={movementAmount}
                                onChange={e => setMovementAmount(e.target.value)}
                            />
                        </div>
                        <div className={styles.moveBtns}>
                            <button
                                className={styles.inBtn}
                                onClick={() => handleManualMovement('in')}
                            >
                                Ingreso
                            </button>
                            <button
                                className={styles.outBtn}
                                onClick={() => handleManualMovement('out')}
                            >
                                Salida
                            </button>
                        </div>
                    </div>
                </section>

                {/* Cierre de Caja */}
                <section className={styles.section}>
                    <h3><CheckCircle2 size={18} /> Cierre de Turno</h3>
                    <div className={styles.closeForm}>
                        <p>Cuenta el efectivo real en caja e ingresalo:</p>
                        <div className={styles.inputWrapper}>
                            <span className={styles.currency}>$</span>
                            <input
                                type="number"
                                placeholder="Monto real contado"
                                value={closingActual}
                                onChange={e => setClosingActual(e.target.value)}
                            />
                        </div>

                        {closingActual && (
                            <div className={`${styles.previewDiff} ${parseFloat(closingActual) >= expectedTotal ? styles.diffPositive : styles.diffNegative}`}>
                                Diferencia: {formatPrice(parseFloat(closingActual) - expectedTotal)}
                            </div>
                        )}

                        <button className={styles.closeBtn} onClick={handleClose}>
                            <Lock size={20} />
                            Cerrar Caja
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}
