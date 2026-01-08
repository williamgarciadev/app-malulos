import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { Orders } from './pages/Orders'
import { Kitchen } from './pages/Kitchen'
import { Menu } from './pages/Menu'
import { Reports } from './pages/Reports'
import { Tables } from './pages/Tables'
import { Login } from './pages/Login'
import { CashRegister } from './pages/CashRegister'
import { TelegramOrders } from './pages/TelegramOrders'
import { Users } from './pages/Users'
import { ManageTables } from './pages/ManageTables'
import { Customers } from './pages/Customers'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { CashGuard } from './components/cash/CashGuard'

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
                <ProtectedRoute>
                    <Layout>
                        <Outlet />
                    </Layout>
                </ProtectedRoute>
            }>
                {/* Rutas que requieren caja abierta */}
                <Route element={<CashGuard><Outlet /></CashGuard>}>
                    <Route index element={<Home />} />
                    <Route path="tables" element={<Tables />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:tableId" element={<Orders />} />
                </Route>

                <Route path="kitchen" element={<Kitchen />} />
                <Route path="customers" element={<Customers />} />

                <Route path="telegram-orders" element={
                    <ProtectedRoute permission="canManageCash">
                        <TelegramOrders />
                    </ProtectedRoute>
                } />

                <Route path="cash" element={
                    <ProtectedRoute permission="canManageCash">
                        <CashRegister />
                    </ProtectedRoute>
                } />

                <Route path="menu" element={
                    <ProtectedRoute permission="canManageMenu">
                        <Menu />
                    </ProtectedRoute>
                } />

                <Route path="reports" element={
                    <ProtectedRoute permission="canViewReports">
                        <Reports />
                    </ProtectedRoute>
                } />

                <Route path="users" element={
                    <ProtectedRoute permission="canManageUsers">
                        <Users />
                    </ProtectedRoute>
                } />

                <Route path="manage-tables" element={
                    <ProtectedRoute permission="canManageMenu">
                        <ManageTables />
                    </ProtectedRoute>
                } />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
