import { supabase } from './supabase'

export interface Perfil {
  id: string
  email: string
  nombre: string | null
  rol: 'admin' | 'usuario'
  activo: boolean
  created_at: string
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Perfil
}

export async function getPerfiles(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Perfil[]
}

export async function crearUsuario(email: string, password: string, nombre: string, rol: 'admin' | 'usuario') {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol },
  })
  if (error) throw error
  return data
}

export async function actualizarPerfil(id: string, campos: Partial<Pick<Perfil, 'nombre' | 'rol' | 'activo'>>) {
  const { error } = await supabase.from('perfiles').update(campos).eq('id', id)
  if (error) throw error
}

export async function eliminarUsuario(id: string) {
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) throw error
}
