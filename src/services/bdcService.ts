import { supabase } from '../lib/supabase'

/**
 * bdcService - Cliente del front contra el sistema de wallets BDC.
 *
 * Arquitectura (Opcion A / Camino 2):
 * - El front primero hace INSERT en `clientes` (en Clientes.tsx).
 * - El trigger `clientes_after_insert_subcuenta` en Postgres dispara
 *   automaticamente la creacion de la wallet via Edge Function `bdc-proxy`.
 * - crearWallet({ originId, ... }) hace polling sobre `wallets` filtrando
 *   por cliente_id = originId hasta encontrarla. Si tras el timeout no
 *   aparece, hace fallback llamando directo al Edge Function.
 * - Las demas operaciones se invocan directo sobre el Edge Function via SDK.
 * - No hay MOCK_MODE en el front: el modo se controla en el Edge Function
 *   con la env var `BDC_MODE` (mock | live).
 */

const FUNCTION_NAME = 'bdc-proxy'

const WALLET_POLL_MAX_MS = 8000
const WALLET_POLL_INTERVAL_MS = 400

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

async function callBdcProxy<T = unknown>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: { endpoint, payload },
    })
    if (error) {
      return { ok: false, message: error.message ?? 'Error invocando bdc-proxy' }
    }
    if (data && typeof data === 'object' && 'ok' in data && (data as { ok: boolean }).ok === false) {
      return { ok: false, message: (data as { message?: string }).message ?? 'Error en bdc-proxy' }
    }
    return { ok: true, data: data as T }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido invocando bdc-proxy'
    return { ok: false, message }
  }
}

async function fetchWalletByCliente(clienteId: string) {
  const { data } = await supabase
    .from('wallets')
    .select('id, cliente_id, cvu, alias, bank_subaccount_id, saldo, estado, created_at')
    .eq('cliente_id', clienteId)
    .maybeSingle()
  return data
}

function shapeWallet(w: {
  id: string
  cliente_id: string
  cvu: string
  alias: string
  bank_subaccount_id: string | null
  saldo: number | string
  estado: string
  created_at: string
}) {
  return {
    id: w.id,
    clienteId: w.cliente_id,
    cvu: w.cvu,
    alias: w.alias,
    bankSubaccountId: w.bank_subaccount_id,
    saldo: Number(w.saldo) || 0,
    estado: w.estado as 'activa' | 'bloqueada' | 'cerrada',
    createdAt: w.created_at,
  }
}

export const bdcService = {
  async login() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return { ok: true, token: session.access_token }
    }
    return { ok: false, message: 'Sin sesion activa' }
  },

  /**
   * Crea / recupera la wallet asociada a un cliente ya existente.
   * Compatible con la firma original (originId, cuit, nombre, apellido, email, tipoPersona).
   *
   * Flujo:
   * 1. Polling sobre `wallets` esperando que el trigger termine de crearla.
   * 2. Si tras WALLET_POLL_MAX_MS no aparece, fallback: invoca el Edge
   *    Function `bdc-proxy` directamente con el cliente_id.
   */
  async crearWallet(params: {
    originId: string
    cuit: string
    nombre: string
    apellido: string
    email: string
    tipoPersona: string
  }) {
    const deadline = Date.now() + WALLET_POLL_MAX_MS
    while (Date.now() < deadline) {
      const wallet = await fetchWalletByCliente(params.originId)
      if (wallet) {
        return {
          ok: true,
          wallet: shapeWallet(wallet),
          message: 'Wallet creada exitosamente',
        }
      }
      await wait(WALLET_POLL_INTERVAL_MS)
    }

    // Fallback: el trigger no termino o fallo. Llamamos al Edge Function directo.
    const result = await callBdcProxy<{ data?: unknown }>('sub-account.create', {
      cliente_id: params.originId,
      originId: params.originId,
      cuit: params.cuit,
      nombre: params.nombre,
      apellido: params.apellido,
      email: params.email,
      tipoPersona: params.tipoPersona,
    })

    if (!result.ok) {
      return { ok: false, message: result.message ?? 'No se pudo crear la wallet' }
    }

    // Tras el fallback, releer la wallet que el Edge Function debio persistir.
    const wallet = await fetchWalletByCliente(params.originId)
    if (wallet) {
      return {
        ok: true,
        wallet: shapeWallet(wallet),
        message: 'Wallet creada exitosamente (fallback)',
      }
    }

    return { ok: false, message: 'Wallet no disponible tras la creacion' }
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
    const result = await callBdcProxy<{ coelsaId?: string; message?: string }>(
      'transfer.create',
      {
        originId: params.originId,
        fromAccount: { cvu: params.fromAddress, cuit: params.fromCuit },
        toAccount: { cvu: params.toAddress, cuit: params.toCuit },
        amount: params.amount,
        concept: params.concept,
        description: params.description,
      }
    )

    if (!result.ok) return { ok: false, message: result.message }
    return {
      ok: true,
      coelsaId: result.data?.coelsaId,
      message: result.data?.message ?? 'Transferencia creada con exito',
    }
  },

  async consultarMovimientos(cvu: string) {
    const result = await callBdcProxy<{ movimientos?: unknown[] }>(
      'transfer.list',
      { cvu }
    )
    if (!result.ok) return { ok: false, message: result.message }
    return { ok: true, movimientos: result.data?.movimientos ?? [] }
  },

  async consultarCuenta(cvu: string) {
    const result = await callBdcProxy<{
      cuenta?: { cvu: string; saldo: number; estado: string }
    }>('sub-account.list', { cvu })
    if (!result.ok) return { ok: false, message: result.message }
    return { ok: true, cuenta: result.data?.cuenta }
  },
}
