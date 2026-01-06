import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserPermissions } from '@/types'

interface ProtectedRouteProps {
    children: JSX.Element
    permission?: keyof UserPermissions
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
    const { isAuthenticated, hasPermission } = useAuthStore()
    const location = useLocation()

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (permission && !hasPermission(permission)) {
        return <Navigate to="/" replace />
    }

    return children
}
