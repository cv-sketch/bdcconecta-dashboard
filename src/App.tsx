import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Wallets from './pages/Wallets'
import Transferencias from './pages/Transferencias'
import Movimientos from './pages/Movimientos'
import Login from './pages/Login'
import AdminUsuarios from './pages/AdminUsuarios'
import { useStore } from './store/useStore'

export default function App() {
  const loadAll = useStore((s) => s.loadAll)

  useEffect(() => { loadAll() }, [loadAll])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/clientes" element={
        <ProtectedRoute>
          <Layout><Clientes /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/wallets" element={
        <ProtectedRoute>
          <Layout><Wallets /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/transferencias" element={
        <ProtectedRoute>
          <Layout><Transferencias /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/movimientos" element={
        <ProtectedRoute>
          <Layout><Movimientos /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/usuarios" element={
        <ProtectedRoute soloAdmin>
          <Layout><AdminUsuarios /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
