import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Wallets from './pages/Wallets'
import Transferencias from './pages/Transferencias'
import Movimientos from './pages/Movimientos'

export default function App() {
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