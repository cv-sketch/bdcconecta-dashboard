import React, { useEffect, useState } from 'react'
import { getPerfiles, actualizarPerfil, type Perfil } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { UserPlus, Shield, User, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function AdminUsuarios() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'usuario' as 'admin' | 'usuario' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function cargar() {
    setLoading(true)
    try { setPerfiles(await getPerfiles()) } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('crear_usuario', {
        p_email: form.email,
        p_password: form.password,
        p_nombre: form.nombre,
        p_rol: form.rol
      })
      if (rpcError) throw new Error(rpcError.message)
      if (data?.error) throw new Error(data.error)
      setSuccess('Usuario creado correctamente')
      setShowForm(false)
      setForm({ email: '', password: '', nombre: '', rol: 'usuario' })
      await cargar()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally { setSaving(false) }
  }

  async function toggleActivo(p: Perfil) {
    await actualizarPerfil(p.id, { activo: !p.activo })
    await cargar()
  }

  async function cambiarRol(p: Perfil, rol: 'admin' | 'usuario') {
    await actualizarPerfil(p.id, { rol })
    await cargar()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-blue-400" size={28} />
            Administración de Usuarios
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de acceso al dashboard</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus size={18} />
            Nuevo usuario
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-400 flex items-center gap-2">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      {showForm && (
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Crear nuevo usuario</h2>
          {error && (
            <div className="mb-3 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleCrear} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Rol</label>
              <select
                value={form.rol}
                onChange={e => setForm(f => ({ ...f, rol: e.target.value as 'admin' | 'usuario' }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="usuario">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Crear usuario
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Usuario</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Rol</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Creado</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400"><Loader2 className="animate-spin mx-auto" /></td></tr>
            ) : perfiles.map(p => (
              <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {p.nombre ? p.nombre[0].toUpperCase() : <User size={14} />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.nombre || '—'}</p>
                      <p className="text-gray-400 text-xs">{p.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.rol}
                    onChange={e => cambiarRol(p, e.target.value as 'admin' | 'usuario')}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="usuario">Usuario</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {p.activo
                    ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle size={14} /> Activo</span>
                    : <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle size={14} /> Inactivo</span>
                  }
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {new Date(p.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActivo(p)}
                    className={`text-sm px-3 py-1 rounded border transition-colors ${
                      p.activo
                        ? 'border-red-700 text-red-400 hover:bg-red-900/30'
                        : 'border-green-700 text-green-400 hover:bg-green-900/30'
                    }`}
                  >
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
