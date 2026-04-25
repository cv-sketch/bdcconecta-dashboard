import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface Cliente {
  id: string
  nombre: string
  apellido: string
  cuit: string
  email: string
  telefono: string
  tipoPersona: 'fisica' | 'juridica'
  createdAt: string
}

export interface Wallet {
  id: string
  clienteId: string
  cvu: string
  alias: string
  saldo: number
  estado: 'activa' | 'suspendida' | 'bloqueada' | 'inactiva' | 'pendiente'
  createdAt: string
  cuit?: string
  titular?: string
  tipo?: 'fisica' | 'juridica' | null
  numeroCuenta?: string | null
  banco?: string | null
  bankOriginId?: string | null
  bankSubaccountId?: string | null
  bankResponse?: any
}

export interface Transferencia {
  id: string
  originId: string
  fromWalletId: string
  fromCvu: string
  fromCuit?: string
  toAddress: string
  toCuit: string
  amount: number
  concept: string
  description?: string
  estado: 'completada' | 'pendiente' | 'fallida'
  coelsaId?: string
  createdAt: string
}

export interface Movimiento {
  id: string
  walletId: string
  cvu: string
  tipo: 'credito' | 'debito'
  amount: number
  description: string
  estado: string
  referencia?: string
  saldoAnterior?: number
  saldoPosterior?: number
  transferenciaId?: string | null
  createdAt: string
}

export interface Comprobante {
  id: string
  numero: string
  numeroSeq: number
  transferenciaId?: string | null
  walletOrigenId?: string | null
  walletDestinoId?: string | null
  clienteId?: string | null
  titularOrigen: string
  cuitOrigen: string
  cvuOrigen: string
  titularDestino: string
  cuitDestino: string
  cvuDestino: string
  monto: number
  moneda: string
  concepto: string
  descripcion?: string
  coelsaId?: string
  originId?: string
  saldoAnterior?: number
  saldoPosterior?: number
  banco: string
  payload?: any
  createdAt: string
}

export type WalletInput = Omit<Wallet, 'id' | 'createdAt'> & { id?: string }
export type MovimientoInput = Omit<Movimiento, 'id' | 'createdAt'> & { createdAt?: string }
export type ComprobanteInput = Omit<Comprobante, 'id' | 'numero' | 'numeroSeq' | 'createdAt'>

interface AppState {
  clientes: Cliente[]
  wallets: Wallet[]
  transferencias: Transferencia[]
  movimientos: Movimiento[]
  comprobantes: Comprobante[]
  loading: boolean
  loadAll: () => Promise<void>
  addCliente: (data: Omit<Cliente, 'id' | 'createdAt'>) => Promise<Cliente>
  deleteCliente: (clienteId: string) => Promise<void>
  addWallet: (wallet: WalletInput) => Promise<Wallet>
  updateWalletEstado: (id: string, estado: Wallet['estado']) => Promise<void>
  addTransferencia: (data: Omit<Transferencia, 'id' | 'createdAt'> & { createdAt?: string }) => Promise<Transferencia>
  addMovimiento: (data: MovimientoInput) => Promise<Movimiento>
  addComprobante: (data: ComprobanteInput) => Promise<Comprobante>
  updateSaldo: (walletId: string, amount: number, tipo: 'credito' | 'debito') => Promise<{ anterior: number; posterior: number }>
  clearAll: () => void
}

const mapWalletRow = (r: any): Wallet => ({
  id: r.id,
  clienteId: r.cliente_id,
  cvu: r.cvu || '',
  alias: r.alias || '',
  saldo: Number(r.saldo) || 0,
  estado: r.estado || 'activa',
  createdAt: r.created_at,
  cuit: r.cuit || undefined,
  titular: r.titular || undefined,
  tipo: r.tipo || null,
  numeroCuenta: r.numero_cuenta || null,
  banco: r.banco || null,
  bankOriginId: r.bank_origin_id || null,
  bankSubaccountId: r.bank_subaccount_id || null,
  bankResponse: r.bank_response || null,
})

const mapTransferenciaRow = (r: any): Transferencia => ({
  id: r.id,
  originId: r.origin_id || '',
  fromWalletId: r.wallet_origen_id || '',
  fromCvu: r.from_cvu || '',
  fromCuit: r.from_cuit || '',
  toAddress: r.to_address || r.wallet_destino_id || '',
  toCuit: r.to_cuit || '',
  amount: Number(r.monto) || 0,
  concept: r.concepto || r.tipo || '',
  description: r.descripcion || '',
  estado: r.estado || 'pendiente',
  coelsaId: r.coelsa_id || r.referencia || '',
  createdAt: r.created_at,
})

const mapMovimientoRow = (r: any): Movimiento => ({
  id: r.id,
  walletId: r.wallet_id,
  cvu: r.cvu || '',
  tipo: r.tipo,
  amount: Number(r.monto) || 0,
  description: r.descripcion || '',
  estado: r.estado || 'completado',
  referencia: r.referencia || undefined,
  saldoAnterior: r.saldo_anterior != null ? Number(r.saldo_anterior) : undefined,
  saldoPosterior: r.saldo_posterior != null ? Number(r.saldo_posterior) : undefined,
  transferenciaId: r.transferencia_id || null,
  createdAt: r.created_at,
})

const mapComprobanteRow = (r: any): Comprobante => ({
  id: r.id,
  numero: r.numero || '',
  numeroSeq: Number(r.numero_seq) || 0,
  transferenciaId: r.transferencia_id || null,
  walletOrigenId: r.wallet_origen_id || null,
  walletDestinoId: r.wallet_destino_id || null,
  clienteId: r.cliente_id || null,
  titularOrigen: r.titular_origen || '',
  cuitOrigen: r.cuit_origen || '',
  cvuOrigen: r.cvu_origen || '',
  titularDestino: r.titular_destino || '',
  cuitDestino: r.cuit_destino || '',
  cvuDestino: r.cvu_destino || '',
  monto: Number(r.monto) || 0,
  moneda: r.moneda || 'ARS',
  concepto: r.concepto || '',
  descripcion: r.descripcion || '',
  coelsaId: r.coelsa_id || '',
  originId: r.origin_id || '',
  saldoAnterior: r.saldo_anterior != null ? Number(r.saldo_anterior) : undefined,
  saldoPosterior: r.saldo_posterior != null ? Number(r.saldo_posterior) : undefined,
  banco: r.banco || 'Banco de Comercio',
  payload: r.payload || null,
  createdAt: r.created_at,
})

export const useStore = create<AppState>()((set, get) => ({
  clientes: [],
  wallets: [],
  transferencias: [],
  movimientos: [],
  comprobantes: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    const [clientesRes, walletsRes, transferenciasRes, movimientosRes, comprobantesRes] = await Promise.all([
      supabase.from('clientes').select('*').order('created_at', { ascending: false }),
      supabase.from('wallets').select('*').order('created_at', { ascending: false }),
      supabase.from('transferencias').select('*').order('created_at', { ascending: false }),
      supabase.from('movimientos').select('*').order('created_at', { ascending: false }),
      supabase.from('comprobantes').select('*').order('created_at', { ascending: false }),
    ])
    set({
      clientes: (clientesRes.data || []).map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        apellido: r.apellido || '',
        cuit: r.cuit || '',
        email: r.email || '',
        telefono: r.telefono || '',
        tipoPersona: r.tipo === 'persona_juridica' ? 'juridica' : 'fisica',
        createdAt: r.created_at,
      })),
      wallets: (walletsRes.data || []).map(mapWalletRow),
      transferencias: (transferenciasRes.data || []).map(mapTransferenciaRow),
      movimientos: (movimientosRes.data || []).map(mapMovimientoRow),
      comprobantes: (comprobantesRes.data || []).map(mapComprobanteRow),
      loading: false,
    })
  },

  addCliente: async (data) => {
    const { data: row, error } = await supabase
      .from('clientes')
      .insert({
        nombre: data.nombre,
        apellido: data.apellido,
        cuit: data.cuit,
        email: data.email,
        telefono: data.telefono,
        tipo: data.tipoPersona === 'juridica' ? 'persona_juridica' : 'persona_fisica',
      })
      .select()
      .single()
    if (error) throw error
    const nuevo: Cliente = {
      id: row.id,
      nombre: row.nombre,
      apellido: row.apellido || '',
      cuit: row.cuit || '',
      email: row.email || '',
      telefono: row.telefono || '',
      tipoPersona: row.tipo === 'persona_juridica' ? 'juridica' : 'fisica',
      createdAt: row.created_at,
    }
    set((s) => ({ clientes: [nuevo, ...s.clientes] }))
    return nuevo
  },

  deleteCliente: async (clienteId) => {
    const { error } = await supabase.from('clientes').delete().eq('id', clienteId)
    if (error) throw error
    set((s) => ({ clientes: s.clientes.filter((c) => c.id !== clienteId) }))
  },

  addWallet: async (wallet) => {
    const insertPayload: Record<string, any> = {
      cliente_id: wallet.clienteId,
      cvu: wallet.cvu,
      alias: wallet.alias,
      saldo: wallet.saldo ?? 0,
      estado: wallet.estado || 'activa',
      cuit: wallet.cuit ?? null,
      titular: wallet.titular ?? null,
      tipo: wallet.tipo ?? null,
      numero_cuenta: wallet.numeroCuenta ?? null,
      banco: wallet.banco ?? 'Banco de Comercio',
      bank_origin_id: wallet.bankOriginId ?? null,
      bank_subaccount_id: wallet.bankSubaccountId ?? null,
      bank_response: wallet.bankResponse ?? null,
    }
    const { data: row, error } = await supabase
      .from('wallets')
      .insert(insertPayload)
      .select()
      .single()
    if (error) throw error
    const nueva = mapWalletRow(row)
    set((s) => ({ wallets: [nueva, ...s.wallets] }))
    return nueva
  },

  updateWalletEstado: async (id, estado) => {
    const { error } = await supabase.from('wallets').update({ estado }).eq('id', id)
    if (error) throw error
    set((s) => ({
      wallets: s.wallets.map((w) => (w.id === id ? { ...w, estado } : w)),
    }))
  },

  addTransferencia: async (data) => {
    const walletDestino = get().wallets.find(
      (w) => w.cvu === data.toAddress || w.alias === data.toAddress
    )
    const { data: row, error } = await supabase
      .from('transferencias')
      .insert({
        origin_id: data.originId || null,
        wallet_origen_id: data.fromWalletId || null,
        wallet_destino_id: walletDestino?.id || null,
        from_cvu: data.fromCvu || null,
        from_cuit: data.fromCuit || null,
        to_address: data.toAddress || null,
        to_cuit: data.toCuit || null,
        monto: data.amount,
        moneda: 'ARS',
        concepto: data.concept || null,
        descripcion: data.description || null,
        coelsa_id: data.coelsaId || null,
        referencia: data.coelsaId || null,
        estado: data.estado,
        tipo: data.concept || null,
      })
      .select()
      .single()
    if (error) throw error
    const nueva = mapTransferenciaRow(row)
    set((s) => ({ transferencias: [nueva, ...s.transferencias] }))
    return nueva
  },

  addMovimiento: async (data) => {
    const { data: row, error } = await supabase
      .from('movimientos')
      .insert({
        wallet_id: data.walletId,
        cvu: data.cvu || null,
        tipo: data.tipo,
        monto: data.amount,
        saldo_anterior: data.saldoAnterior ?? null,
        saldo_posterior: data.saldoPosterior ?? null,
        descripcion: data.description || null,
        estado: data.estado || 'completado',
        referencia: data.referencia || null,
        transferencia_id: data.transferenciaId || null,
      })
      .select()
      .single()
    if (error) throw error
    const nuevo = mapMovimientoRow(row)
    set((s) => ({ movimientos: [nuevo, ...s.movimientos] }))
    return nuevo
  },

  addComprobante: async (data) => {
    const payload: Record<string, any> = {
      transferencia_id: data.transferenciaId || null,
      wallet_origen_id: data.walletOrigenId || null,
      wallet_destino_id: data.walletDestinoId || null,
      cliente_id: data.clienteId || null,
      titular_origen: data.titularOrigen || null,
      cuit_origen: data.cuitOrigen || null,
      cvu_origen: data.cvuOrigen || null,
      titular_destino: data.titularDestino || null,
      cuit_destino: data.cuitDestino || null,
      cvu_destino: data.cvuDestino || null,
      monto: data.monto,
      moneda: data.moneda || 'ARS',
      concepto: data.concepto || null,
      descripcion: data.descripcion || null,
      coelsa_id: data.coelsaId || null,
      origin_id: data.originId || null,
      saldo_anterior: data.saldoAnterior ?? null,
      saldo_posterior: data.saldoPosterior ?? null,
      banco: data.banco || 'Banco de Comercio',
      payload: data.payload || null,
    }
    const { data: row, error } = await supabase
      .from('comprobantes')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    const nuevo = mapComprobanteRow(row)
    set((s) => ({ comprobantes: [nuevo, ...s.comprobantes] }))
    return nuevo
  },

  updateSaldo: async (walletId, amount, tipo) => {
    const wallet = get().wallets.find((w) => w.id === walletId)
    if (!wallet) throw new Error('Wallet no encontrada')
    const anterior = wallet.saldo
    const posterior = tipo === 'credito' ? anterior + amount : anterior - amount
    const { error } = await supabase
      .from('wallets')
      .update({ saldo: posterior })
      .eq('id', walletId)
    if (error) throw error
    set((s) => ({
      wallets: s.wallets.map((w) => (w.id !== walletId ? w : { ...w, saldo: posterior })),
    }))
    return { anterior, posterior }
  },

  clearAll: () =>
    set({ clientes: [], wallets: [], transferencias: [], movimientos: [], comprobantes: [] }),
}))
