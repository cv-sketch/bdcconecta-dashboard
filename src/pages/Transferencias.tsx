import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { Comprobante } from '../store/useStore'
import { bdcService } from '../services/bdcService'
import ComprobanteModal from '../components/ComprobanteModal'

const EMPTY_FORM = {
  fromWalletId: '',
  toAddress: '',
  toCuit: '',
  amount: '',
  concept: 'VAR',
  description: '',
}

export default function Transferencias() {
  const {
    wallets,
    clientes,
    transferencias,
    comprobantes,
    addTransferencia,
    addMovimiento,
    addComprobante,
    updateSaldo,
  } = useStore()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [tab, setTab] = useState<'nueva' | 'historial'>('nueva')
  const [comprobanteActivo, setComprobanteActivo] = useState<Comprobante | null>(null)

  const walletsActivas = wallets.filter((w) => w.estado === 'activa')
  const getCliente = (id: string) => clientes.find((c) => c.id === id)
  const walletOrigen = wallets.find((w) => w.id === form.fromWalletId)
  const findComprobantePorTransferencia = (trxId: string) =>
    comprobantes.find((c) => c.transferenciaId === trxId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletOrigen) return
    const monto = parseFloat(form.amount)
    if (isNaN(monto) || monto <= 0) {
      setMsg({ tipo: 'err', texto: 'El monto debe ser mayor a 0' })
      return
    }
    if (monto > walletOrigen.saldo) {
      setMsg({ tipo: 'err', texto: 'Saldo insuficiente. Disponible: $' + walletOrigen.saldo.toLocaleString('es-AR') })
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const cliente = getCliente(walletOrigen.clienteId)
      const oid = 'trx-' + Date.now()
      const res = await bdcService.enviarTransferencia({
        originId: oid,
        fromAddress: walletOrigen.cvu,
        fromCuit: cliente?.cuit || '',
        toAddress: form.toAddress,
        toCuit: form.toCuit,
        amount: monto,
        concept: form.concept,
        description: form.description,
      })

      const walletDestinoInterna = wallets.find(
        (w) => w.cvu === form.toAddress || w.alias === form.toAddress
      )
      const clienteDestino = walletDestinoInterna ? getCliente(walletDestinoInterna.clienteId) : null
      const titularOrigen = cliente ? `${cliente.nombre} ${cliente.apellido}`.trim() : (walletOrigen.titular || '—')
      const titularDestino = clienteDestino ? `${clienteDestino.nombre} ${clienteDestino.apellido}`.trim() : '—'

      if (res.ok) {
        const trx = await addTransferencia({
          originId: oid,
          fromWalletId: walletOrigen.id,
          fromCvu: walletOrigen.cvu,
          fromCuit: cliente?.cuit || '',
          toAddress: form.toAddress,
          toCuit: form.toCuit,
          amount: monto,
          concept: form.concept,
          description: form.description,
          estado: 'completada',
          coelsaId: res.coelsaId,
        })

        const debSaldo = await updateSaldo(walletOrigen.id, monto, 'debito')

        await addMovimiento({
          walletId: walletOrigen.id,
          cvu: walletOrigen.cvu,
          tipo: 'debito',
          amount: monto,
          description: form.description || `Transferencia a ${form.toAddress.slice(0, 14)}... (${form.concept})`,
          estado: 'completado',
          referencia: res.coelsaId || oid,
          saldoAnterior: debSaldo.anterior,
          saldoPosterior: debSaldo.posterior,
          transferenciaId: trx.id,
        })

        if (walletDestinoInterna) {
          const credSaldo = await updateSaldo(walletDestinoInterna.id, monto, 'credito')
          await addMovimiento({
            walletId: walletDestinoInterna.id,
            cvu: walletDestinoInterna.cvu,
            tipo: 'credito',
            amount: monto,
            description: form.description || `Transferencia recibida de ${walletOrigen.cvu.slice(-8)} (${form.concept})`,
            estado: 'completado',
            referencia: res.coelsaId || oid,
            saldoAnterior: credSaldo.anterior,
            saldoPosterior: credSaldo.posterior,
            transferenciaId: trx.id,
          })
        }

        // Generar y persistir comprobante
        const comp = await addComprobante({
          transferenciaId: trx.id,
          walletOrigenId: walletOrigen.id,
          walletDestinoId: walletDestinoInterna?.id || null,
          clienteId: walletOrigen.clienteId,
          titularOrigen,
          cuitOrigen: cliente?.cuit || '',
          cvuOrigen: walletOrigen.cvu,
          titularDestino,
          cuitDestino: form.toCuit,
          cvuDestino: form.toAddress,
          monto,
          moneda: 'ARS',
          concepto: form.concept,
          descripcion: form.description,
          coelsaId: res.coelsaId || '',
          originId: oid,
          saldoAnterior: debSaldo.anterior,
          saldoPosterior: debSaldo.posterior,
          banco: 'Banco de Comercio',
          payload: {
            origen: { titular: titularOrigen, cuit: cliente?.cuit, cvu: walletOrigen.cvu, walletId: walletOrigen.id },
            destino: { titular: titularDestino, cuit: form.toCuit, cvu: form.toAddress, interna: !!walletDestinoInterna },
            operacion: { monto, moneda: 'ARS', concepto: form.concept, descripcion: form.description, coelsaId: res.coelsaId, originId: oid },
            saldos: { anterior: debSaldo.anterior, posterior: debSaldo.posterior },
            timestamp: new Date().toISOString(),
          },
        })

        setMsg({ tipo: 'ok', texto: 'Transferencia enviada. Comprobante ' + comp.numero + (walletDestinoInterna ? ' (acreditado a wallet interna)' : '') })
        setComprobanteActivo(comp)
        setForm(EMPTY_FORM)
        setTab('historial')
      } else {
        await addTransferencia({
          originId: oid,
          fromWalletId: walletOrigen.id,
          fromCvu: walletOrigen.cvu,
          fromCuit: cliente?.cuit || '',
          toAddress: form.toAddress,
          toCuit: form.toCuit,
          amount: monto,
          concept: form.concept,
          description: form.description,
          estado: 'fallida',
        })
        setMsg({ tipo: 'err', texto: res.message || 'Error en la transferencia' })
      }
    } catch (err: any) {
      console.error('[Transferencias] handleSubmit error:', err)
      setMsg({ tipo: 'err', texto: 'Error al guardar la transferencia: ' + (err?.message || String(err)) })
    } finally {
      setLoading(false)
    }
  }

  const badge = (estado: string) => {
    const m: Record<string, { bg: string; color: string }> = {
      completada: { bg: '#065F46', color: '#10B981' },
      pendiente: { bg: '#1E3A5F', color: '#60A5FA' },
      fallida: { bg: '#7F1D1D', color: '#EF4444' },
    }
    return m[estado] || { bg: '#374151', color: '#9CA3AF' }
  }

  const volumen = transferencias.filter((t) => t.estado === 'completada').reduce((a, t) => a + t.amount, 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Transferencias</h1>
        <p style={{ color: '#6B7280', margin: '4px 0 0' }}>{transferencias.length} transferencias registradas</p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: '#1F2937', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {(['nueva', 'historial'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, background: tab === t ? '#2563EB' : 'transparent', color: tab === t ? '#fff' : '#9CA3AF' }}>
            {t === 'nueva' ? '+ Nueva Transferencia' : '📋 Historial'}
          </button>
        ))}
      </div>
      {msg && (
        <div style={{ background: msg.tipo === 'ok' ? '#065F46' : '#7F1D1D', border: '1px solid ' + (msg.tipo === 'ok' ? '#10B981' : '#EF4444'), borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: msg.tipo === 'ok' ? '#10B981' : '#EF4444', display: 'flex', justifyContent: 'space-between' }}>
          <span>{msg.texto}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}
      {tab === 'nueva' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#1F2937', borderRadius: 12, padding: 28, border: '1px solid #374151' }}>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Enviar Transferencia</h2>
            {walletsActivas.length === 0 ? (
              <div style={{ color: '#6B7280', textAlign: 'center', padding: 32 }}>No hay wallets activas. Creá una wallet primero.</div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>Wallet Origen</label>
                  <select value={form.fromWalletId} onChange={(e) => setForm((p) => ({ ...p, fromWalletId: e.target.value }))} required style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}>
                    <option value="">Seleccioná una wallet...</option>
                    {walletsActivas.map((w) => {
                      const c = getCliente(w.clienteId)
                      return (
                        <option key={w.id} value={w.id}>
                          {c ? c.nombre + ' ' + c.apellido : 'Sin titular'} — ${w.saldo.toLocaleString('es-AR')} — CVU: {w.cvu.slice(-8)}
                        </option>
                      )
                    })}
                  </select>
                </div>
                {walletOrigen && (
                  <div style={{ background: '#111827', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280', fontSize: 13 }}>Saldo disponible</span>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>${walletOrigen.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {[
                  { key: 'toAddress', label: 'CVU / CBU / Alias destino', placeholder: '0000003100012345678901' },
                  { key: 'toCuit', label: 'CUIT del destinatario', placeholder: '20-12345678-9' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={(form as any)[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} required style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>Monto (ARS)</label>
                  <input type="number" placeholder="0.00" min="1" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>Concepto</label>
                  <select value={form.concept} onChange={(e) => setForm((p) => ({ ...p, concept: e.target.value }))} style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}>
                    {[['VAR', 'Varios'], ['ALQ', 'Alquiler'], ['CUO', 'Cuota'], ['HAB', 'Haberes'], ['HON', 'Honorarios'], ['FAC', 'Factura'], ['PRE', 'Préstamo']].map(([v, l]) => (
                      <option key={v} value={v}>{v} - {l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#9CA3AF', fontSize: 13, marginBottom: 6 }}>Descripción (opcional)</label>
                  <input type="text" placeholder="Detalle de la transferencia..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <button type="submit" disabled={loading} style={{ background: loading ? '#374151' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, marginTop: 8 }}>
                  {loading ? '⏳ Procesando...' : '🚀 Enviar Transferencia'}
                </button>
              </form>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Completadas', value: transferencias.filter((t) => t.estado === 'completada').length, color: '#10B981' },
              { label: 'Pendientes', value: transferencias.filter((t) => t.estado === 'pendiente').length, color: '#60A5FA' },
              { label: 'Fallidas', value: transferencias.filter((t) => t.estado === 'fallida').length, color: '#EF4444' },
              { label: 'Volumen total', value: '$' + volumen.toLocaleString('es-AR', { minimumFractionDigits: 2 }), color: '#F59E0B' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#1F2937', borderRadius: 10, padding: '18px 22px', border: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9CA3AF', fontSize: 14 }}>{s.label}</span>
                <span style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
            {transferencias.length > 0 && (
              <div style={{ background: '#1F2937', borderRadius: 10, padding: 20, border: '1px solid #374151' }}>
                <p style={{ color: '#9CA3AF', fontSize: 13, margin: '0 0 12px', fontWeight: 600 }}>ÚLTIMAS TRANSFERENCIAS</p>
                {transferencias.slice(0, 3).map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #374151' }}>
                    <div>
                      <div style={{ color: '#D1D5DB', fontSize: 13 }}>{t.toAddress.slice(0, 10)}...</div>
                      <div style={{ color: '#6B7280', fontSize: 11 }}>{new Date(t.createdAt).toLocaleString('es-AR')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#EF4444', fontWeight: 700 }}>-${t.amount.toLocaleString('es-AR')}</div>
                      <span style={{ background: badge(t.estado).bg, color: badge(t.estado).color, borderRadius: 20, padding: '2px 8px', fontSize: 10 }}>{t.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tab === 'historial' && (
        <div style={{ background: '#1F2937', borderRadius: 12, overflow: 'hidden', border: '1px solid #374151' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151' }}>
                {['Fecha', 'Origen CVU', 'Destino', 'Monto', 'Concepto', 'Estado', 'ID Coelsa', 'Comprobante'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transferencias.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>No hay transferencias registradas aún</td></tr>
              ) : transferencias.map((t, i) => {
                const b = badge(t.estado)
                const comp = findComprobantePorTransferencia(t.id)
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #374151', background: i % 2 === 0 ? 'transparent' : '#111827' }}>
                    <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 13 }}>{new Date(t.createdAt).toLocaleString('es-AR')}</td>
                    <td style={{ padding: '12px 16px', color: '#D1D5DB', fontFamily: 'monospace', fontSize: 12 }}>{t.fromCvu ? t.fromCvu.slice(-10) : '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#D1D5DB', fontFamily: 'monospace', fontSize: 12 }}>{t.toAddress.slice(0, 14)}...</td>
                    <td style={{ padding: '12px 16px', color: '#EF4444', fontWeight: 700 }}>-${t.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 13 }}>{t.concept}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ background: b.bg, color: b.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>{t.estado}</span></td>
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontFamily: 'monospace', fontSize: 11 }}>{t.coelsaId || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {comp ? (
                        <button onClick={() => setComprobanteActivo(comp)} style={{ background: '#1E3A5F', color: '#60A5FA', border: '1px solid #2563EB', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          📄 Ver
                        </button>
                      ) : (
                        <span style={{ color: '#6B7280', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ComprobanteModal comprobante={comprobanteActivo} onClose={() => setComprobanteActivo(null)} />
    </div>
  )
}
