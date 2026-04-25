import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Wallets from './pages/Wallets'
import Transferencias from './pages/Transferencias'
import Movimientos from './pages/Movimientos'
import { useStore } from './store/useStore'

export default function App() {
  const loadAll = useStore((s) => s.loadAll)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/transferencias" element={<Transferencias />} />
        <Route path="/movimientos" element={<Movimientos />} />
      </Routes>
    </Layout>
  )
}
