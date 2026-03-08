import { defineStore } from 'pinia'
import type { PerfilSetor, CapacidadeCritica, StatusAtivo } from '~/types'

export interface Usuario {
  id: string
  nome: string
  email: string
  login: string
  perfil: PerfilSetor
  status: StatusAtivo
  primeiro_acesso: boolean
  tentativas_login: number
  ultimo_acesso: string | null
  created_at: string
  capacidades: CapacidadeUsuario[]
  escopo_tomador_ids?: string[] | null
  escopo_posto_ids?: string[] | null
  escopo_turno_ids?: string[] | null
}

export interface CapacidadeUsuario {
  id: string
  usuario_id: string
  capacidade: CapacidadeCritica
  gerente_id: string
  gerente_nome?: string
  justificativa: string
  validade: string | null
  revogada_em: string | null
  created_at: string
}

export interface CriarUsuarioPayload {
  nome: string
  email: string
  login: string
  perfil: PerfilSetor
  escopo_tomador_ids?: string[]
  escopo_posto_ids?: string[]
  escopo_turno_ids?: string[]
}

export interface AtribuirCapacidadePayload {
  usuario_id: string
  capacidade: CapacidadeCritica
  justificativa: string
  validade?: string | null
}

export const useAdminStore = defineStore('admin', () => {
  const usuarios = ref<Usuario[]>([])
  const total = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  // ── Usuários ──────────────────────────────────────────────

  async function listarUsuarios(params?: { page?: number; q?: string; perfil?: string; status?: string }) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<{ data: Usuario[]; total: number }>('/api/admin/usuarios', { query: params })
      usuarios.value = res.data
      total.value = res.total
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Erro ao carregar usuários.'
    } finally { loading.value = false }
  }

  async function buscarUsuario(id: string): Promise<Usuario | null> {
    try {
      return await $fetch<Usuario>(`/api/admin/usuarios/${id}`)
    } catch { return null }
  }

  async function criarUsuario(payload: CriarUsuarioPayload): Promise<Usuario> {
    saving.value = true; error.value = null
    try {
      const novo = await $fetch<Usuario>('/api/admin/usuarios', { method: 'POST', body: payload })
      usuarios.value.unshift(novo)
      total.value++
      return novo
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Erro ao criar usuário.'
      throw e
    } finally { saving.value = false }
  }

  async function atualizarUsuario(id: string, payload: Partial<CriarUsuarioPayload>): Promise<Usuario> {
    saving.value = true; error.value = null
    try {
      const atualizado = await $fetch<Usuario>(`/api/admin/usuarios/${id}`, { method: 'PATCH', body: payload })
      const idx = usuarios.value.findIndex(u => u.id === id)
      if (idx >= 0) usuarios.value[idx] = atualizado
      return atualizado
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Erro ao atualizar usuário.'
      throw e
    } finally { saving.value = false }
  }

  async function alternarStatus(id: string, justificativa: string): Promise<void> {
    saving.value = true
    try {
      const res = await $fetch<{ status: StatusAtivo }>(`/api/admin/usuarios/${id}/status`, {
        method: 'PATCH',
        body: { justificativa },
      })
      const idx = usuarios.value.findIndex(u => u.id === id)
      if (idx >= 0) usuarios.value[idx].status = res.status
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Erro ao alterar status.'
      throw e
    } finally { saving.value = false }
  }

  async function desbloquear(id: string): Promise<void> {
    await $fetch(`/api/admin/usuarios/${id}/desbloquear`, { method: 'PATCH' })
    const idx = usuarios.value.findIndex(u => u.id === id)
    if (idx >= 0) usuarios.value[idx].tentativas_login = 0
  }

  async function resetarSenha(id: string): Promise<{ senha_temp: string }> {
    return await $fetch(`/api/admin/usuarios/${id}/resetar-senha`, { method: 'POST' })
  }

  // ── Capacidades ───────────────────────────────────────────

  async function atribuirCapacidade(payload: AtribuirCapacidadePayload): Promise<void> {
    saving.value = true
    try {
      const cap = await $fetch<CapacidadeUsuario>('/api/admin/capacidades', { method: 'POST', body: payload })
      const idx = usuarios.value.findIndex(u => u.id === payload.usuario_id)
      if (idx >= 0) usuarios.value[idx].capacidades.push(cap)
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Erro ao atribuir capacidade.'
      throw e
    } finally { saving.value = false }
  }

  async function revogarCapacidade(capacidadeId: string, usuarioId: string, justificativa: string): Promise<void> {
    saving.value = true
    try {
      await $fetch(`/api/admin/capacidades/${capacidadeId}`, { method: 'DELETE', body: { justificativa } })
      const idx = usuarios.value.findIndex(u => u.id === usuarioId)
      if (idx >= 0) {
        const cap = usuarios.value[idx].capacidades.find(c => c.id === capacidadeId)
        if (cap) cap.revogada_em = new Date().toISOString()
      }
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Erro ao revogar capacidade.'
      throw e
    } finally { saving.value = false }
  }

  function limpar() { usuarios.value = []; total.value = 0; error.value = null }

  return {
    usuarios, total, loading, saving, error,
    listarUsuarios, buscarUsuario, criarUsuario, atualizarUsuario,
    alternarStatus, desbloquear, resetarSenha,
    atribuirCapacidade, revogarCapacidade, limpar,
  }
})
