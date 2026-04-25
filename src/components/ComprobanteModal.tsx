import type { Comprobante } from '../store/useStore'

interface Props {
  comprobante: Comprobante | null
  onClose: () => void
}

const fmtMoney = (n: number, moneda = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(n)

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const conceptosMap: Record<string, string> = {
  VAR: 'Varios', ALQ: 'Alquiler', CUO: 'Cuota', HAB: 'Haberes',
  HON: 'Honorarios', FAC: 'Factura', PRE: 'Préstamo',
}

export default function ComprobanteModal({ comprobante, onClose }: Props) {
  if (!comprobante) return null
  const c = comprobante

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #comprobante-printable, #comprobante-printable * { visibility: visible !important; }
          #comprobante-printable { position: absolute !important; left: 0; top: 0; width: 100%; padding: 24px !important; background: #fff !important; color: #000 !important; }
          #comprobante-printable .no-print { display: none !important; }
          #comprobante-printable .print-text { color: #000 !important; }
          #comprobante-printable .print-bg { background: #fff !important; border: 1px solid #ccc !important; }
        }
      `}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16, overflowY: 'auto',
        }}
      >
        <div
          id="comprobante-printable"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560,
            color: '#111', fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden',
            margin: 'auto',
          }}
        >
          {/* Header */}
          <div className="print-bg" style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', color: '#fff', padding: '20px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: 1, textTransform: 'uppercase' }}>{c.banco || 'Banco de Comercio'}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Comprobante de transferencia</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, opacity: 0.85 }}>N° de comprobante</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>{c.numero || '—'}</div>
              </div>
            </div>
          </div>

          {/* Monto */}
          <div style={{ textAlign: 'center', padding: '24px 28px 8px', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ color: '#6B7280', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Monto transferido</div>
            <div style={{ color: '#111', fontSize: 32, fontWeight: 800, marginTop: 4 }}>{fmtMoney(c.monto, c.moneda)}</div>
            <div style={{ color: '#10B981', fontSize: 12, fontWeight: 600, marginTop: 6 }}>● TRANSFERENCIA REALIZADA</div>
          </div>

          {/* Datos */}
          <div style={{ padding: '20px 28px' }}>
            <Section title="Origen">
              <Row label="Titular" value={c.titularOrigen || '—'} />
              <Row label="CUIT/CUIL" value={c.cuitOrigen || '—'} mono />
              <Row label="CVU" value={c.cvuOrigen || '—'} mono />
            </Section>

            <Section title="Destino">
              <Row label="Titular" value={c.titularDestino || '—'} />
              <Row label="CUIT/CUIL" value={c.cuitDestino || '—'} mono />
              <Row label="CVU/CBU/Alias" value={c.cvuDestino || '—'} mono />
            </Section>

            <Section title="Detalle de la operación">
              <Row label="Concepto" value={`${c.concepto} - ${conceptosMap[c.concepto] || ''}`.trim()} />
              {c.descripcion && <Row label="Descripción" value={c.descripcion} />}
              <Row label="Fecha y hora" value={fmtDate(c.createdAt)} />
              <Row label="ID Coelsa" value={c.coelsaId || '—'} mono />
              {c.originId && <Row label="ID Operación" value={c.originId} mono />}
            </Section>

            {(c.saldoAnterior != null || c.saldoPosterior != null) && (
              <Section title="Saldos de la cuenta origen">
                {c.saldoAnterior != null && <Row label="Saldo anterior" value={fmtMoney(c.saldoAnterior, c.moneda)} />}
                {c.saldoPosterior != null && <Row label="Saldo posterior" value={fmtMoney(c.saldoPosterior, c.moneda)} bold />}
              </Section>
            )}
          </div>

          {/* Footer */}
          <div className="print-bg" style={{ background: '#F9FAFB', padding: '14px 28px', borderTop: '1px solid #E5E7EB', fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
            Este comprobante es válido como constancia de operación. Conservelo para futuros reclamos.
          </div>

          {/* Acciones */}
          <div className="no-print" style={{ display: 'flex', gap: 10, padding: '14px 28px 22px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{ background: '#E5E7EB', color: '#111', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
            >
              🖨️ Imprimir / PDF
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="print-text" style={{ color: '#2563EB', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

function Row({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontSize: 13 }}>
      <span className="print-text" style={{ color: '#6B7280' }}>{label}</span>
      <span className="print-text" style={{ color: '#111', fontWeight: bold ? 700 : 500, fontFamily: mono ? 'monospace' : undefined, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}
