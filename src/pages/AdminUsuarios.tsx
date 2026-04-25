import React, { useEffect, useState } from 'react'
import { getPerfiles, actualizarPerfil, crearUsuario, type Perfil } from '../lib/auth'
import { UserPlus, Shield, User, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react'

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
      await crearUsuario(form.email, form.password, form.nombre, form.rol)
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
    setPerfiles((prev) => prev.map((x) => x.id === p.id ? { ...x, activo: !p.activo } : x))
  }

  async function cambiarRol(p: Perfil, rol: 'admin' | 'usuario') {
    await actualizarPerfil(p.id, { rol })
    setPerfiles((prev) => prev.map((x) => x.id === p.id ? { ...x, rol } : x))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" /> Administración de Usuarios
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de acceso al dashboard</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {success && (
        <div className="bg-green-900/40 border border-green-500/50 text-green-300 text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCrear} className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Crear nuevo usuario</h3>
          {error && <div className="text-red-400 text-sm mb-3 bg-red-900/30 px-3 py-2 rounded">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Contraseña</label>
              <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as 'admin' | 'usuario' })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="usuario">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : 'Crear usuario'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Usuario</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Rol</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Estado</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Creado</th>
              <th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </td></tr>
            ) : perfiles.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500 text-sm">No hay usuarios registrados</td></tr>
            ) : perfiles.map((p) => (
              <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center">
                      {p.rol === 'admin' ? <Shield className="w-4 h-4 text-blue-400" /> : <User className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.nombre || '—'}</p>
                      <p className="text-gray-400 text-xs">{p.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select value={p.rol} onChange={(e) => cambiarRol(p, e.target.value as 'admin' | 'usuario')}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500">
                    <option value="usuario">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${p.activo ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                    {p.activo ? <><CheckCircle className="w-3 h-3" /> Activo</> : <><XCircle className="w-3 h-3" /> Inactivo</>}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActivo(p)}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${p.activo ? 'border-red-500/50 text-red-400 hover:bg-red-900/20' : 'border-green-500/50 text-green-400 hover:bg-green-900/20'}`}>
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
