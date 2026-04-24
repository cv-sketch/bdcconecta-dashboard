import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const menu = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/clientes', label: 'Clientes', icon: '👥' },
  { path: '/wallets', label: 'Wallets / CVU', icon: '💳' },
  { path: '/transferencias', label: 'Transferencias', icon: '🔄' },
  { path: '/movimientos', label: 'Movimientos', icon: '📋' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111827', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 240,
        background: '#1F2937',
        borderRight: '1px solid #374151',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16, flexShrink: 0 }}>B</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>SecurePayNet</div>
              <div style={{ color: '#6B7280', fontSize: 11 }}>Dashboard v1.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menu.map(item => {
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: collapsed ? '12px' : '10px 12px',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? '#2563EB' : 'transparent',
                  color: active ? '#fff' : '#9CA3AF',
                  fontWeight: active ? 600 : 400,
                  fontSize: 14, textAlign: 'left', width: '100%',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* MOCK badge + collapse */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #374151' }}>
          {!collapsed && (
            <div style={{ background: '#065F46', border: '1px solid #10B981', borderRadius: 6, padding: '6px 10px', marginBottom: 8, textAlign: 'center' }}>
              <span style={{ color: '#10B981', fontSize: 11, fontWeight: 600 }}>🟢 MOCK MODE</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: '100%', background: '#374151', border: 'none', borderRadius: 6, color: '#9CA3AF', padding: '8px', cursor: 'pointer', fontSize: 16 }}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #374151', background: '#1F2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>
            {menu.find(m => m.path === location.pathname)?.icon} {menu.find(m => m.path === location.pathname)?.label || 'Dashboard'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#6B7280', fontSize: 13 }}>🟢 MOCK MODE activo</span>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>A</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24, flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  )
}