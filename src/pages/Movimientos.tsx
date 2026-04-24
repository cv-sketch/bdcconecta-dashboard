import { useState } from 'react'
import { useStore } from '../store/useStore'
import { bdcService } from '../services/bdcService'

export default function Movimientos() {
  const { wallets, clientes, movimientos, addMovimiento } = useStore()
  const [walletSeleccionada, setWalletSeleccionada] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'credito' | 'debito'>('todos')
  const [showSimular, setShowSimular] = useState(false)
  const [simForm, setSimForm] = useState({ amount: '', tipo: 'credito', description: '' })

  const getCliente = (clienteId: string) =>
    clientes.find(c => c.id === clienteId)

  const wallet = wallets.find(w => w.id === walletSeleccionada)

  const movimientosFiltrados = movimientos
    .filter(m => walletSeleccionada ? m.walletId === walletSeleccionada : true)
    .filter(m => filtroTipo === 'todos' ? true : m.tipo === filtroTipo)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const consultarMovimientos = async () => {
    if (!wallet) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await bdcService.consultarMovimientos(wallet.cvu)
      if (res.ok && res.movimientos) {
        res.movimientos.forEach((m: any) => addMovimiento({ ...m, walletId: wallet.id }))
        setMsg({ tipo: 'ok', texto: `${res.movimientos.length} movimientos cargados para CVU ${wallet.cvu.slice(-8)}` })
      }
    } finally {
      setLoading(false)
    }
  }

  const simularMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet) return
    const monto = parseFloat(simForm.amount)
    if (isNaN(monto) || monto <= 0) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    addMovimiento({
      walletId: wallet.id,
      cvu: wallet.cvu,
      tipo: simForm.tipo as 'credito' | 'debito',
      amount: monto,
      description: simForm.description || (simForm.tipo === 'credito' ? 'Transferencia recibida' : 'Transferencia enviada'),
      estado: 'completado',
      referencia: `REF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      createdAt: new Date().toISOString()
    })
    setMsg({ tipo: 'ok', texto: `Movimiento de ${simForm.tipo === 'credito' ? 'crédito' : 'débito'} por $${monto.toLocaleString('es-AR')} simulado` })
    setSimForm({ amount: '', tipo: 'credito', description: '' })
    setShowSimular(false)
    setLoading(false)
  }

  const totalCreditos = movimientosFiltrados.filter(m => m.tipo === 'credito').reduce((a, m) => a + m.amount, 0)
  const totalDebitos = movimientosFiltrados.filter(m => m.tipo === 'debito').reduce((a, m) => a + m.amount, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Movimientos</h1>
          <p style={{ color: '#6B7280', margin: '4px 0 0' }}>Historial de créditos y débitos por cuenta</p>
        </div>
        {walletSeleccionada && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowSimular(true)}
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              + Simular Movimiento
            </button>
            <button
              onClick={consultarMovimientos}
              disabled={loading}
              style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              {loading ? '⏳ Cargando...' : '🔄 Actualizar'}
            </button>
          </div>
        )}
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ background: msg.tipo === 'ok' ? '#065F46' : '#7F1D1D', border: `1px solid ${msg.tipo === 'ok' ? '#10B981' : '#EF4444'}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: msg.tipo === 'ok' ? '#10B981' : '#EF4444', display: 'flex', justifyContent: 'space-between' }}>
          <span>{msg.texto}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Selector de wallet */}
      <div style={{ background: '#1F2937', borderRadius: 10, padding: 20, marginBottom: 20, border: '1px solid #374151' }}>
        <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>SELECCIONAR CUENTA / WALLET</label>
        <select
          value={walletSeleccionada}
          onChange={e => { setWalletSeleccionada(e.target.value); setMsg(null) }}
          style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
        >
          <option value="">— Ver todos los movimientos —</option>
          {wallets.map(w => {
            const c = getCliente(w.clienteId)
            return (
              <option key={w.id} value={w.id}>
                {c ? `${c.nombre} ${c.apellido}` : 'Sin titular'} | CVU: {w.cvu} | Saldo: ${w.saldo.toLocaleString('es-AR')}
              </option>
            )
          })}
        </select>

        {/* Info de wallet seleccionada */}
        {wallet && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
            {[
              { label: 'CVU', value: wallet.cvu, mono: true },
              { label: 'Alias', value: wallet.alias, mono: true },
              { label: 'Saldo', value: `$${wallet.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, color: '#10B981' },
            ].map(d => (
              <div key={d.label} style={{ background: '#111827', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ color: '#6B7280', fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase' }}>{d.label}</p>
                <p style={{ color: d.color || '#D1D5DB', fontSize: 13, margin: 0, fontFamily: d.mono ? 'monospace' : undefined, fontWeight: d.color ? 700 : 400 }}>{d.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros + KPIs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        {/* Filtros tipo */}
        <div style={{ display: 'flex', gap: 8, background: '#1F2937', padding: 4, borderRadius: 8 }}>
          {(['todos', 'credito', 'debito'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroTipo(f)}
              style={{
                padding: '6px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: filtroTipo === f ? (f === 'credito' ? '#065F46' : f === 'debito' ? '#7F1D1D' : '#2563EB') : 'transparent',
                color: filtroTipo === f ? (f === 'credito' ? '#10B981' : f === 'debito' ? '#EF4444' : '#fff') : '#6B7280'
              }}
            >
              {f === 'todos' ? 'Todos' : f === 'credito' ? '↑ Créditos' : '↓ Débitos'}
            </button>
          ))}
        </div>

        {/* Mini KPIs */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: '#065F46', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ color: '#6EE7B7', fontSize: 11 }}>CRÉDITOS</div>
            <div style={{ color: '#10B981', fontWeight: 700 }}>${totalCreditos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={{ background: '#7F1D1D', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ color: '#FCA5A5', fontSize: 11 }}>DÉBITOS</div>
            <div style={{ color: '#EF4444', fontWeight: 700 }}>${totalDebitos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={{ background: '#1E3A5F', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ color: '#93C5FD', fontSize: 11 }}>NETO</div>
            <div style={{ color: totalCreditos - totalDebitos >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
              ${(totalCreditos - totalDebitos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div style={{ background: '#1F2937', borderRadius: 12, overflow: 'hidden', border: '1px solid #374151' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #374151' }}>
              {['Fecha', 'Tipo', 'Descripción', 'Referencia', 'CVU', 'Monto', 'Estado'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movimientosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#6B7280' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <div>{walletSeleccionada ? 'Sin movimientos para esta wallet. Usá "Simular Movimiento" o "Actualizar".' : 'Seleccioná una wallet o generá movimientos desde Transferencias.'}</div>
                </td>
              </tr>
            ) : movimientosFiltrados.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #374151', background: i % 2 === 0 ? 'transparent' : '#111827' }}>
                <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 13 }}>
                  {new Date(m.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: m.tipo === 'credito' ? '#065F46' : '#7F1D1D',
                    color: m.tipo === 'credito' ? '#10B981' : '#EF4444',
                    borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600
                  }}>
                    {m.tipo === 'credito' ? '↑ Crédito' : '↓ Débito'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#D1D5DB', fontSize: 13 }}>{m.description}</td>
                <td style={{ padding: '12px 16px', color: '#6B7280', fontFamily: 'monospace', fontSize: 12 }}>{m.referencia || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6B7280', fontFamily: 'monospace', fontSize: 12 }}>{m.cvu ? m.cvu.slice(-8) : '—'}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 15, color: m.tipo === 'credito' ? '#10B981' : '#EF4444' }}>
                  {m.tipo === 'credito' ? '+' : '-'}${m.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#065F46', color: '#10B981', borderRadius: 20, padding: '4px 10px', fontSize: 11 }}>{m.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal simular movimiento */}
      {showSimular && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1F2937', borderRadius: 12, padding: 32, width: 420, maxWidth: '90vw', border: '1px solid #374151' }}>
            <h2 style={{ color: '#fff', margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Simular Movimiento</h2>
            <form onSubmit={simularMovimiento} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>Tipo</label>
                <select
                  value={simForm.tipo}
                  onChange={e => setSimForm(p => ({ ...p, tipo: e.target.value }))}
                  style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                >
                  <option value="credito">↑ Crédito (ingreso)</option>
                  <option value="debito">↓ Débito (egreso)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>Monto (ARS)</label>
                <input
                  type="number" min="1" step="0.01" placeholder="0.00" required
                  value={simForm.amount}
                  onChange={e => setSimForm(p => ({ ...p, amount: e.target.value }))}
                  style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>Descripción (opcional)</label>
                <input
                  type="text" placeholder="Ej: Pago de factura..."
                  value={simForm.description}
                  onChange={e => setSimForm(p => ({ ...p, description: e.target.value }))}
                  style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowSimular(false)} style={{ flex: 1, background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 600 }}>
                  {loading ? 'Simulando...' : 'Simular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}