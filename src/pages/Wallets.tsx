import { useState } from 'react'
import { useStore } from '../store/useStore'
import { bdcService } from '../services/bdcService'

export default function Wallets() {
  const { wallets, clientes, addWallet, updateWalletEstado } = useStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)

  const getCliente = (clienteId: string) =>
    clientes.find(c => c.id === clienteId)

  const filtered = wallets.filter(w => {
    const c = getCliente(w.clienteId)
    return `${c?.nombre} ${c?.apellido} ${w.cvu} ${w.alias}`
      .toLowerCase().includes(search.toLowerCase())
  })

  const crearWalletSinCliente = async () => {
    if (clientes.length === 0) {
      alert('Primero creá un cliente en la sección Clientes')
      return
    }
    const sinWallet = clientes.filter(c => !wallets.some(w => w.clienteId === c.id))
    if (sinWallet.length === 0) {
      alert('Todos los clientes ya tienen wallet')
      return
    }
    const cliente = sinWallet[0]
    setLoading('new')
    try {
      const res = await bdcService.crearWallet({
        originId: cliente.id,
        cuit: cliente.cuit,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        tipoPersona: cliente.tipoPersona
      })
      if (res.ok && res.wallet) {
        addWallet(res.wallet)
        setMsg({ tipo: 'ok', texto: `Wallet creada para ${cliente.nombre} ${cliente.apellido} — CVU: ${res.wallet.cvu}` })
      } else {
        setMsg({ tipo: 'err', texto: res.message || 'Error al crear wallet' })
      }
    } finally {
      setLoading(null)
    }
  }

  const toggleEstado = async (walletId: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activa' ? 'suspendida' : 'activa'
    setLoading(walletId)
    await new Promise(r => setTimeout(r, 800))
    updateWalletEstado(walletId, nuevoEstado as any)
    setLoading(null)
    setMsg({ tipo: 'ok', texto: `Wallet ${nuevoEstado === 'activa' ? 'activada' : 'suspendida'} correctamente` })
  }

  const estadoColor = (estado: string) => {
    if (estado === 'activa') return { bg: '#065F46', color: '#10B981', text: 'Activa' }
    if (estado === 'suspendida') return { bg: '#7F1D1D', color: '#EF4444', text: 'Suspendida' }
    return { bg: '#1F2937', color: '#6B7280', text: estado }
  }

  const totalSaldo = wallets.reduce((acc, w) => acc + w.saldo, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Wallets / CVU</h1>
          <p style={{ color: '#6B7280', margin: '4px 0 0' }}>{wallets.length} wallets generadas</p>
        </div>
        <button
          onClick={crearWalletSinCliente}
          disabled={loading === 'new'}
          style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          {loading === 'new' ? 'Generando...' : '+ Nueva Wallet'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Wallets', value: wallets.length, color: '#2563EB' },
          { label: 'Wallets Activas', value: wallets.filter(w => w.estado === 'activa').length, color: '#10B981' },
          { label: 'Saldo Total', value: `$${totalSaldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, color: '#F59E0B' },
        ].map(k => (
          <div key={k.label} style={{ background: '#1F2937', borderRadius: 10, padding: '20px 24px', border: '1px solid #374151' }}>
            <p style={{ color: '#9CA3AF', fontSize: 13, margin: '0 0 8px' }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: 28, fontWeight: 700, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ background: msg.tipo === 'ok' ? '#065F46' : '#7F1D1D', border: `1px solid ${msg.tipo === 'ok' ? '#10B981' : '#EF4444'}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: msg.tipo === 'ok' ? '#10B981' : '#EF4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{msg.texto}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Buscador */}
      <div style={{ background: '#1F2937', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Buscar por titular, CVU o alias..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Cards de wallets */}
      {filtered.length === 0 ? (
        <div style={{ background: '#1F2937', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6B7280' }}>
          <p style={{ fontSize: 48, margin: '0 0 12px' }}>💳</p>
          <p style={{ margin: 0, fontSize: 16 }}>No hay wallets aún. Creá clientes primero y generá sus CVUs.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(w => {
            const cliente = getCliente(w.clienteId)
            const est = estadoColor(w.estado)
            return (
              <div key={w.id} style={{ background: '#1F2937', borderRadius: 12, padding: 24, border: '1px solid #374151', position: 'relative' }}>
                {/* Badge estado */}
                <span style={{ position: 'absolute', top: 16, right: 16, background: est.bg, color: est.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                  {est.text}
                </span>

                {/* Titular */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 16 }}>
                    {cliente ? `${cliente.nombre[0]}${cliente.apellido[0]}` : 'N/A'}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                      {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Sin titular'}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: 12 }}>CUIT: {cliente?.cuit || '—'}</div>
                  </div>
                </div>

                {/* Saldo */}
                <div style={{ background: '#111827', borderRadius: 8, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
                  <p style={{ color: '#6B7280', fontSize: 12, margin: '0 0 4px' }}>Saldo disponible</p>
                  <p style={{ color: '#10B981', fontSize: 24, fontWeight: 700, margin: 0 }}>
                    ${w.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Datos CVU */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'CVU', value: w.cvu },
                    { label: 'Alias', value: w.alias },
                  ].map(d => (
                    <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6B7280', fontSize: 13 }}>{d.label}</span>
                      <span style={{ color: '#D1D5DB', fontSize: 13, fontFamily: 'monospace', background: '#111827', padding: '3px 8px', borderRadius: 4 }}>{d.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontSize: 13 }}>Creada</span>
                    <span style={{ color: '#D1D5DB', fontSize: 13 }}>{new Date(w.createdAt).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>

                {/* Botón toggle */}
                <button
                  onClick={() => toggleEstado(w.id, w.estado)}
                  disabled={loading === w.id}
                  style={{
                    width: '100%', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 600, cursor: 'pointer', fontSize: 13,
                    background: w.estado === 'activa' ? '#7F1D1D' : '#065F46',
                    color: w.estado === 'activa' ? '#EF4444' : '#10B981',
                  }}
                >
                  {loading === w.id ? 'Procesando...' : w.estado === 'activa' ? '⏸ Suspender Wallet' : '▶ Activar Wallet'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}