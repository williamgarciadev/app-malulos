import { useState, useEffect } from 'react'
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

    const handleNumberClick = (num: number) => {
        if (pin.length < 4 && !loading) {
            setPin(prev => prev + num)
        }
    }

    const handleDelete = () => {
        if (!loading) {
            setPin(prev => prev.slice(0, -1))
        }
    }

    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]

    return (
        <div className={styles.pinPad}>
            <div className={styles.display}>
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`${styles.dot} ${pin.length > i ? styles.dotActive : ''} ${error ? styles.dotError : ''}`}
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
                    >
                        {num}
                    </button>
                ))}

                <button
                    className={`${styles.numBtn} ${styles.actionBtn}`}
                    onClick={onCancel}
                    disabled={loading}
                >
                    <X size={24} />
                </button>

                <button
                    className={styles.numBtn}
                    onClick={() => handleNumberClick(0)}
                    disabled={loading}
                >
                    0
                </button>

                <button
                    className={`${styles.numBtn} ${styles.actionBtn}`}
                    onClick={handleDelete}
                    disabled={loading}
                >
                    <Delete size={24} />
                </button>
            </div>

            {loading && <div className={styles.loader}>Verificando...</div>}
        </div>
    )
}
