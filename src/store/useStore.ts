import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  estado: 'activa' | 'suspendida' | 'bloqueada'
  createdAt: string
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

interface AppState {
  clientes: Cliente[]
  wallets: Wallet[]
  transferencias: Transferencia[]
  movimientos: Movimiento[]
  addCliente: (data: Omit<Cliente, 'id' | 'createdAt'>) => Cliente
  addWallet: (wallet: Wallet) => void
  updateWalletEstado: (id: string, estado: Wallet['estado']) => void
  addTransferencia: (data: Omit<Transferencia, 'id'>) => Transferencia
  addMovimiento: (data: Omit<Movimiento, 'id'>) => void
  updateSaldo: (walletId: string, amount: number, tipo: 'credito' | 'debito') => void
  clearAll: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      clientes: [],
      wallets: [],
      transferencias: [],
      movimientos: [],

      addCliente: (data) => {
        const nuevo: Cliente = {
          ...data,
          id: 'cli-' + Math.random().toString(36).slice(2, 10),
          createdAt: new Date().toISOString()
        }
        set((s) => ({ clientes: [nuevo, ...s.clientes] }))
        return nuevo
      },

      addWallet: (wallet) => {
        set((s) => ({ wallets: [wallet, ...s.wallets] }))
      },

      updateWalletEstado: (id, estado) => {
        set((s) => ({
          wallets: s.wallets.map((w) => w.id === id ? { ...w, estado } : w)
        }))
      },

      addTransferencia: (data) => {
        const nueva: Transferencia = {
          ...data,
          id: 'trx-' + Math.random().toString(36).slice(2, 10)
        }
        set((s) => ({ transferencias: [nueva, ...s.transferencias] }))
        return nueva
      },

      addMovimiento: (data) => {
        const nuevo: Movimiento = {
          ...data,
          id: 'mov-' + Math.random().toString(36).slice(2, 10)
        }
        set((s) => ({ movimientos: [nuevo, ...s.movimientos] }))
      },

      updateSaldo: (walletId, amount, tipo) => {
        set((s) => ({
          wallets: s.wallets.map((w) =>
            w.id !== walletId ? w : {
              ...w,
              saldo: tipo === 'credito' ? w.saldo + amount : w.saldo - amount
            }
          )
        }))
      },

      clearAll: () => set({ clientes: [], wallets: [], transferencias: [], movimientos: [] })
    }),
    { name: 'securepaynet-store' }
  )
)