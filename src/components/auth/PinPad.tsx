import { useState, useEffect, useCallback } from 'react'
import { Delete, X } from 'lucide-react'
import styles from './PinPad.module.css'

interface PinPadProps {
    onComplete: (pin: string) => void
    onCancel?: () => void
    error?: boolean
    loading?: boolean
}

export function PinPad({ onComplete, onCancel, error, loading }: PinPadProps) {
    const [pin, setPin] = useState('')

    useEffect(() => {
        if (pin.length === 4) {
            onComplete(pin)
            // No limpiamos el pin inmediatamente para dar feedback visual
        }
    }, [pin, onComplete])

    useEffect(() => {
        if (error) {
            setPin('')
        }
    }, [error])

    const handleNumberClick = useCallback((num: number) => {
        if (pin.length < 4 && !loading) {
            setPin(prev => prev + num)
        }
    }, [loading, pin.length])

    const handleDelete = useCallback(() => {
        if (!loading) {
            setPin(prev => prev.slice(0, -1))
        }
    }, [loading])

    const clearPin = useCallback(() => {
        if (!loading) {
            setPin('')
        }
    }, [loading])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (loading) return

            if (/^\d$/.test(event.key)) {
                handleNumberClick(Number(event.key))
                return
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
                handleDelete()
                return
            }

            if (event.key === 'Escape') {
                clearPin()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [clearPin, handleDelete, handleNumberClick, loading])

    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]

    return (
        <div className={styles.pinPad} aria-label="Ingreso de PIN">
            <div
                className={styles.display}
                role="status"
                aria-live="polite"
                aria-label={`PIN ${pin.length} de 4`}
            >
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`${styles.dot} ${pin.length > i ? styles.dotActive : ''} ${error ? styles.dotError : ''}`}
                        aria-hidden="true"
                    />
                ))}
            </div>

            <div className={styles.grid}>
                {numbers.map(num => (
                    <button
                        key={num}
                        className={styles.numBtn}
                        onClick={() => handleNumberClick(num)}
                        disabled={loading}
                        type="button"
                        aria-label={`Número ${num}`}
                    >
                        {num}
                    </button>
                ))}

                {onCancel ? (
                    <button
                        className={`${styles.numBtn} ${styles.actionBtn}`}
                        onClick={onCancel}
                        disabled={loading}
                        type="button"
                        aria-label="Cancelar"
                    >
                        <X size={24} />
                    </button>
                ) : (
                    <div className={styles.spacer} aria-hidden="true" />
                )}

                <button
                    className={styles.numBtn}
                    onClick={() => handleNumberClick(0)}
                    disabled={loading}
                    type="button"
                    aria-label="Número 0"
                >
                    0
                </button>

                <button
                    className={`${styles.numBtn} ${styles.actionBtn}`}
                    onClick={handleDelete}
                    disabled={loading}
                    type="button"
                    aria-label="Borrar"
                >
                    <Delete size={24} />
                </button>
            </div>

            {loading && <div className={styles.loader}>Verificando...</div>}
        </div>
    )
}
