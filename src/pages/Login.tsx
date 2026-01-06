import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PinPad } from '@/components/auth/PinPad'
import { useAuthStore } from '@/stores/authStore'
import styles from './Login.module.css'

export function Login() {
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)
    const login = useAuthStore(state => state.login)
    const navigate = useNavigate()
    const location = useLocation()

    const from = (location.state as any)?.from?.pathname || '/'

    const handlePinComplete = async (pin: string) => {
        setLoading(true)
        setError(false)

        const success = await login(pin)

        if (success) {
            setTimeout(() => {
                navigate(from, { replace: true })
            }, 500)
        } else {
            setError(true)
            setLoading(false)
        }
    }

    return (
        <div className={styles.loginPage}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.logo}>🍔</div>
                    <h1 className={styles.title}>Malulos POS</h1>
                    <p className={styles.subtitle}>Ingresa tu PIN de acceso</p>
                </div>

                <PinPad
                    onComplete={handlePinComplete}
                    error={error}
                    loading={loading}
                />

                {error && (
                    <p className={styles.errorMsg}>PIN incorrecto. Intenta de nuevo.</p>
                )}

                <div className={styles.footer}>
                    <p>Demo: 1234 (Admin) | 2222 (Cajero) | 3333 (Mesero)</p>
                </div>
            </div>
        </div>
    )
}
