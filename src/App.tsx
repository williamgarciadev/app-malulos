import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { Orders } from './pages/Orders'
import { Kitchen } from './pages/Kitchen'
import { Menu } from './pages/Menu'
import { Tables } from './pages/Tables'
import { seedDatabase } from './db/database'

function App() {
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        seedDatabase()
            .then(() => setIsReady(true))
            .catch(err => {
                console.error('Error seeding database:', err)
                setIsReady(true)
            })
    }, [])

    if (!isReady) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#1a1a2e',
                color: '#fff',
                fontSize: '1.5rem'
            }}>
                Cargando...
            </div>
        )
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:tableId" element={<Orders />} />
                <Route path="/kitchen" element={<Kitchen />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/tables" element={<Tables />} />
            </Routes>
        </Layout>
    )
}

export default App
