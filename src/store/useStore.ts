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
  createdAt: string
}

export type WalletInput = Omit<Wallet, 'id' | 'createdAt'> & { id?: string }

interface AppState {
  clientes: Cliente[]
  wallets: Wallet[]
  transferencias: Transferencia[]
  movimientos: Movimiento[]
  loading: boolean
  loadAll: () => Promise<void>
  addCliente: (data: Omit<Cliente, 'id' | 'createdAt'>) => Promise<Cliente>
  deleteCliente: (clienteId: string) => Promise<void>
  addWallet: (wallet: WalletInput) => Promise<Wallet>
  updateWalletEstado: (id: string, estado: Wallet['estado']) => Promise<void>
  addTransferencia: (data: Omit<Transferencia, 'id'>) => Promise<Transferencia>
  addMovimiento: (data: Omit<Movimiento, 'id'>) => Promise<void>
  updateSaldo: (walletId: string, amount: number, tipo: 'credito' | 'debito') => Promise<void>
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

export const useStore = create<AppState>()((set, get) => ({
  clientes: [],
  wallets: [],
  transferencias: [],
  movimientos: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    const [clientesRes, walletsRes, transferenciasRes] = await Promise.all([
      supabase.from('clientes').select('*').order('created_at', { ascending: false }),
      supabase.from('wallets').select('*').order('created_at', { ascending: false }),
      supabase.from('transferencias').select('*').order('created_at', { ascending: false }),
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
      transferencias: (transferenciasRes.data || []).map((r: any) => ({
        id: r.id,
        originId: r.wallet_origen_id || '',
        fromWalletId: r.wallet_origen_id || '',
        fromCvu: '',
        toAddress: r.wallet_destino_id || '',
        toCuit: '',
        amount: Number(r.monto) || 0,
        concept: r.tipo || '',
        description: r.descripcion || '',
        estado: r.estado || 'pendiente',
        coelsaId: r.referencia || '',
        createdAt: r.created_at,
      })),
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
    const { data: row, error } = await supabase
      .from('transferencias')
      .insert({
        wallet_origen_id: data.fromWalletId || null,
        wallet_destino_id: data.toAddress || null,
        monto: data.amount,
        moneda: 'ARS',
        descripcion: data.description || data.concept,
        referencia: data.coelsaId || null,
        estado: data.estado,
        tipo: data.concept,
      })
      .select()
      .single()
    if (error) throw error
    const nueva: Transferencia = {
      ...data,
      id: row.id,
      createdAt: row.created_at,
    }
    set((s) => ({ transferencias: [nueva, ...s.transferencias] }))
    return nueva
  },

  addMovimiento: async (data) => {
    const nuevo: Movimiento = {
      ...data,
      id: 'mov-' + Math.random().toString(36).slice(2, 10),
    }
    set((s) => ({ movimientos: [nuevo, ...s.movimientos] }))
  },

  updateSaldo: async (walletId, amount, tipo) => {
    const wallet = get().wallets.find((w) => w.id === walletId)
    if (!wallet) return
    const nuevoSaldo = tipo === 'credito' ? wallet.saldo + amount : wallet.saldo - amount
    const { error } = await supabase.from('wallets').update({ saldo: nuevoSaldo }).eq('id', walletId)
    if (error) throw error
    set((s) => ({
      wallets: s.wallets.map((w) =>
        w.id !== walletId ? w : { ...w, saldo: nuevoSaldo }
      ),
    }))
  },

  clearAll: () => set({ clientes: [], wallets: [], transferencias: [], movimientos: [] }),
}))