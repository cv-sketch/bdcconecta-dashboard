import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../store/useStore'

const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const mockChart = dias.map(d => ({
  dia: d,
  creditos: Math.floor(Math.random() * 500000) + 50000,
  debitos: Math.floor(Math.random() * 300000) + 30000,
  volumen: Math.floor(Math.random() * 800000) + 100000,
}))

export default function Dashboard() {
  const { clientes, wallets, transferencias } = useStore()

  const walletsActivas = wallets.filter(w => w.estado === 'activa').length
  const saldoTotal = wallets.reduce((a, w) => a + w.saldo, 0)
  const volumenTotal = transferencias.filter(t => t.estado === 'completada').reduce((a, t) => a + t.amount, 0)

  const kpis = [
    { label: 'Clientes Activos', value: clientes.length, color: '#2563EB', icon: '👥', sub: 'Total registrados' },
    { label: 'Wallets Activas', value: walletsActivas, color: '#10B981', icon: '💳', sub: `de ${wallets.length} totales` },
    { label: 'Saldo Total', value: `$${saldoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, color: '#F59E0B', icon: '💰', sub: 'ARS consolidado' },
    { label: 'Volumen Procesado', value: `$${volumenTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, color: '#8B5CF6', icon: '🔄', sub: 'Transferencias OK' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#6B7280', margin: '6px 0 0' }}>
          Bienvenido al panel de gestión BDC Conecta — {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#1F2937', borderRadius: 12, padding: '20px 24px', border: '1px solid #374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>{k.icon}</span>
              <span style={{ background: '#111827', color: k.color, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>LIVE</span>
            </div>
            <div style={{ color: k.color, fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{k.value}</div>
            <div style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>{k.label}</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Area chart */}
        <div style={{ background: '#1F2937', borderRadius: 12, padding: 24, border: '1px solid #374151' }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Créditos vs Débitos (semana)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockChart}>
              <defs>
                <linearGradient id="gCred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDeb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="dia" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} formatter={(v: any) => [`$${Number(v).toLocaleString('es-AR')}`, '']} />
              <Area type="monotone" dataKey="creditos" stroke="#10B981" fill="url(#gCred)" strokeWidth={2} name="Créditos" />
              <Area type="monotone" dataKey="debitos" stroke="#EF4444" fill="url(#gDeb)" strokeWidth={2} name="Débitos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div style={{ background: '#1F2937', borderRadius: 12, padding: 24, border: '1px solid #374151' }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Volumen diario (ARS)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="dia" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} formatter={(v: any) => [`$${Number(v).toLocaleString('es-AR')}`, 'Volumen']} />
              <Bar dataKey="volumen" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Últimas transferencias */}
      <div style={{ background: '#1F2937', borderRadius: 12, padding: 24, border: '1px solid #374151', marginBottom: 24 }}>
        <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Últimas Transferencias</h3>
        {transferencias.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B7280' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔄</div>
            <p style={{ margin: 0 }}>No hay transferencias aún. Creá clientes, generá wallets y enviá tu primera transferencia.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151' }}>
                {['Fecha', 'Destino', 'Monto', 'Concepto', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transferencias.slice(0, 8).map(t => {
                const badge = t.estado === 'completada' ? { bg: '#065F46', color: '#10B981' } : t.estado === 'pendiente' ? { bg: '#1E3A5F', color: '#60A5FA' } : { bg: '#7F1D1D', color: '#EF4444' }
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #374151' }}>
                    <td style={{ padding: '10px 12px', color: '#9CA3AF', fontSize: 13 }}>{new Date(t.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '10px 12px', color: '#D1D5DB', fontFamily: 'monospace', fontSize: 12 }}>{t.toAddress.slice(0, 16)}...</td>
                    <td style={{ padding: '10px 12px', color: '#EF4444', fontWeight: 700 }}>-${t.amount.toLocaleString('es-AR')}</td>
                    <td style={{ padding: '10px 12px', color: '#9CA3AF', fontSize: 13 }}>{t.concept}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{t.estado}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Estado del sistema */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Transferencias Completadas', value: transferencias.filter(t => t.estado === 'completada').length, color: '#10B981', icon: '✅' },
          { label: 'Transferencias Pendientes', value: transferencias.filter(t => t.estado === 'pendiente').length, color: '#60A5FA', icon: '⏳' },
          { label: 'Wallets Suspendidas', value: wallets.filter(w => w.estado === 'suspendida').length, color: '#EF4444', icon: '⚠️' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1F2937', borderRadius: 10, padding: '16px 20px', border: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 32 }}>{s.icon}</span>
            <div>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}