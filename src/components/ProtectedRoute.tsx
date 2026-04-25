import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getPerfil, type Perfil } from '../lib/auth'
import type { Session } from '@supabase/supabase-js'

interface Props {
  children: React.ReactNode
  soloAdmin?: boolean
}

export default function ProtectedRoute({ children, soloAdmin = false }: Props) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        getPerfil(data.session.user.id).then(setPerfil)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) getPerfil(s.user.id).then(setPerfil)
      else setPerfil(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">Cargando...</div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (perfil && !perfil.activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-red-400 text-lg">Tu cuenta esta desactivada. Contacta al administrador.</div>
      </div>
    )
  }

  if (soloAdmin && perfil?.rol !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}
