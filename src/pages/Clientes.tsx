import { useState } from 'react'
import { useStore } from '../store/useStore'
import { bdcService } from '../services/bdcService'

const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  cuit: '',
  email: '',
  telefono: '',
  tipoPersona: 'fisica' as 'fisica' | 'juridica',
}

export default function Clientes() {
  const { clientes, addCliente, deleteCliente, wallets, addWallet } = useStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [clienteAEliminar, setClienteAEliminar] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)

  const filtered = clientes.filter(c =>
    `${c.nombre} ${c.apellido} ${c.cuit} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const nuevo = await addCliente(form)
      setMsg({ tipo: 'ok', texto: `Cliente ${nuevo.nombre} ${nuevo.apellido} creado con ID ${nuevo.id}` })
      setForm(EMPTY_FORM)
      setShowModal(false)
    } catch {
      setMsg({ tipo: 'err', texto: 'Error al crear el cliente' })
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (clienteId: string) => {
    try {
      await deleteCliente(clienteId)
      setMsg({ tipo: 'ok', texto: 'Cliente eliminado correctamente' })
    } catch {
      setMsg({ tipo: 'err', texto: 'Error al eliminar el cliente' })
    }
    setClienteAEliminar(null)
  }

  const crearWallet = async (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente) return
    const yaExiste = wallets.some(w => w.clienteId === clienteId)
    if (yaExiste) {
      alert('Este cliente ya tiene una wallet')
      return
    }
    setLoading(true)
    try {
      const res = await bdcService.crearWallet({
        originId: clienteId,
        cuit: cliente.cuit,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        tipoPersona: cliente.tipoPersona,
      })
      if (res.ok && res.wallet) {
        addWallet(res.wallet)
        alert(`Wallet creada! CVU: ${res.wallet.cvu}`)
      } else {
        alert('Error al crear wallet: ' + res.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const tieneWallet = (clienteId: string) => wallets.some(w => w.clienteId === clienteId)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Clientes</h1>
          <p style={{ color: '#6B7280', margin: '4px 0 0' }}>{clientes.length} clientes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            + Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ background: msg.tipo === 'ok' ? '#065F46' : '#7F1D1D', border: `1px solid ${msg.tipo === 'ok' ? '#10B981' : '#EF4444'}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#fff' }}>
          {msg.texto}
        </div>
      )}

      {/* Buscador */}
      <div style={{ background: '#1F2937', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Buscar por nombre, CUIT o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Tabla */}
      <div style={{ background: '#1F2937', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #374151' }}>
              {['Cliente', 'CUIT', 'Email', 'Teléfono', 'Tipo', 'Wallet', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>No hay clientes. Creá el primero con "+ Nuevo Cliente"</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #374151', background: i % 2 === 0 ? 'transparent' : '#111827' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                      {c.nombre[0]}{c.apellido[0]}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{c.nombre} {c.apellido}</div>
                      <div style={{ color: '#6B7280', fontSize: 12 }}>ID: {c.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#D1D5DB', fontFamily: 'monospace' }}>{c.cuit}</td>
                <td style={{ padding: '12px 16px', color: '#D1D5DB' }}>{c.email}</td>
                <td style={{ padding: '12px 16px', color: '#D1D5DB' }}>{c.telefono || '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: c.tipoPersona === 'juridica' ? '#1E3A5F' : '#1A2E1A', color: c.tipoPersona === 'juridica' ? '#60A5FA' : '#4ADE80', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                    {c.tipoPersona === 'juridica' ? 'Jurídica' : 'Física'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {tieneWallet(c.id)
                    ? <span style={{ color: '#10B981', fontSize: 13 }}>✓ Activa</span>
                    : <span style={{ color: '#6B7280', fontSize: 13 }}>Sin wallet</span>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!tieneWallet(c.id) && (
                      <button onClick={() => crearWallet(c.id)} disabled={loading} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        + Wallet
                      </button>
                    )}
                    <button
                      onClick={() => setClienteAEliminar(c.id)}
                      style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal confirmar eliminar */}
      {clienteAEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1F2937', borderRadius: 12, padding: 32, width: 400, maxWidth: '90vw', border: '1px solid #374151' }}>
            <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>Confirmar eliminación</h2>
            <p style={{ color: '#9CA3AF', marginBottom: 24 }}>
              ¿Estás seguro que querés eliminar al cliente{' '}
              <strong style={{ color: '#fff' }}>
                {clientes.find(c => c.id === clienteAEliminar)?.nombre} {clientes.find(c => c.id === clienteAEliminar)?.apellido}
              </strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setClienteAEliminar(null)}
                style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleEliminar(clienteAEliminar)}
                disabled={loading}
                style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo cliente */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1F2937', borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw', border: '1px solid #374151' }}>
            <h2 style={{ color: '#fff', margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Nuevo Cliente</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Nombre', key: 'nombre', placeholder: 'Juan' },
                  { label: 'Apellido', key: 'apellido', placeholder: 'Pérez' },
                  { label: 'CUIT', key: 'cuit', placeholder: '20-12345678-9' },
                  { label: 'Email', key: 'email', placeholder: 'juan@empresa.com' },
                  { label: 'Teléfono', key: 'telefono', placeholder: '+54 11 1234-5678' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.key === 'email' ? '1 / -1' : undefined }}>
                    <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 4 }}>{f.label}</label>
                    <input
                      type="text"
                      value={(form as any)[f.key] || ''}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      required={f.key !== 'telefono'}
                      style={{ width: '100%', padding: '10px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 4 }}>Tipo de persona</label>
                  <select
                    value={form.tipoPersona}
                    onChange={e => setForm({ ...form, tipoPersona: e.target.value as 'fisica' | 'juridica' })}
                    style={{ width: '100%', padding: '10px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                  >
                    <option value="fisica">Física</option>
                    <option value="juridica">Jurídica</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}
                  style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}