import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCashStore } from '@/stores/cashStore'

interface CashGuardProps {
    children: JSX.Element
}

export function CashGuard({ children }: CashGuardProps) {
    const { currentSession, checkActiveSession, isLoading } = useCashStore()
    const location = useLocation()

    useEffect(() => {
        checkActiveSession()
    }, [])

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#1a1a2e',
                color: '#fff'
            }}>
                Verificando estado de caja...
            </div>
        )
    }

    // Si no hay sesión activa y no estamos en la página de caja, redirigir
    if (!currentSession && location.pathname !== '/cash') {
        return <Navigate to="/cash" replace />
    }

    return children
}
