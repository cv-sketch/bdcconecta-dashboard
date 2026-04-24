const MOCK_MODE = true

const mockDelay = (ms = 1000) => new Promise(r => setTimeout(r, ms))

const mockCVU = () => '000000310' + Math.floor(Math.random() * 9999999999999).toString().padStart(13, '0')
const mockAlias = (nombre: string, apellido: string) =>
  `${nombre.toLowerCase()}.${apellido.toLowerCase()}.${Math.floor(Math.random() * 9999)}`

export const bdcService = {
  async login() {
    if (MOCK_MODE) {
      await mockDelay(500)
      return { ok: true, token: 'mock-token-' + Date.now() }
    }
    return { ok: false, message: 'No implementado' }
  },

  async crearWallet(params: {
    originId: string
    cuit: string
    nombre: string
    apellido: string
    email: string
    tipoPersona: string
  }) {
    if (MOCK_MODE) {
      await mockDelay(1200)
      const cvu = mockCVU()
      const alias = mockAlias(params.nombre, params.apellido)
      return {
        ok: true,
        wallet: {
          id: 'w-' + Math.random().toString(36).slice(2, 10),
          clienteId: params.originId,
          cvu,
          alias,
          saldo: Math.floor(Math.random() * 500000) + 10000,
          estado: 'activa' as const,
          createdAt: new Date().toISOString()
        },
        message: 'Wallet creada exitosamente'
      }
    }
    return { ok: false, message: 'No implementado' }
  },

  async enviarTransferencia(params: {
    originId: string
    fromAddress: string
    fromCuit: string
    toAddress: string
    toCuit: string
    amount: number
    concept?: string
    description?: string
  }) {
    if (MOCK_MODE) {
      await mockDelay(1200)
      if (Math.random() > 0.1) {
        return {
          ok: true,
          coelsaId: 'COE-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
          message: 'Transferencia creada con exito'
        }
      }
      return { ok: false, message: 'Error: Saldo insuficiente (código 422)' }
    }
    return { ok: false, message: 'No implementado' }
  },

  async consultarMovimientos(cvu: string) {
    if (MOCK_MODE) {
      await mockDelay(800)
      const tipos = ['credito', 'debito'] as const
      const descripciones = [
        'Transferencia recibida', 'Pago de servicios', 'Cobro de factura',
        'Transferencia enviada', 'Pago proveedor', 'Liquidación'
      ]
      const movimientos = Array.from({ length: Math.floor(Math.random() * 8) + 3 }, (_, i) => ({
        id: 'mov-' + Math.random().toString(36).slice(2, 10),
        cvu,
        tipo: tipos[Math.floor(Math.random() * 2)],
        amount: Math.floor(Math.random() * 100000) + 1000,
        description: descripciones[Math.floor(Math.random() * descripciones.length)],
        estado: 'completado',
        referencia: 'REF-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdAt: new Date(Date.now() - i * 86400000 * Math.random()).toISOString()
      }))
      return { ok: true, movimientos }
    }
    return { ok: false, message: 'No implementado' }
  },

  async consultarCuenta(cvu: string) {
    if (MOCK_MODE) {
      await mockDelay(600)
      return {
        ok: true,
        cuenta: { cvu, saldo: Math.floor(Math.random() * 500000), estado: 'activa' }
      }
    }
    return { ok: false, message: 'No implementado' }
  }
}