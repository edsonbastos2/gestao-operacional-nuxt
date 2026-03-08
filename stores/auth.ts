import { defineStore } from 'pinia'
import type { SessaoUsuario, PerfilSetor, CapacidadeCritica } from '~/types'

export const useAuthStore = defineStore('auth', () => {
  const usuario = ref<SessaoUsuario | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const inicializado = ref(false)

  const isAutenticado  = computed(() => !!usuario.value)
  const isPrimeiroAcesso = computed(() => usuario.value?.primeiro_acesso ?? false)
  const perfilAtual    = computed(() => usuario.value?.perfil ?? null)
  const isAdmin        = computed(() => usuario.value?.perfil === 'ti_admin')
  const isOperacao     = computed(() => ['operacao','ti_admin'].includes(usuario.value?.perfil ?? ''))
  const isRH           = computed(() => ['rh','ti_admin'].includes(usuario.value?.perfil ?? ''))
  const isFinanceiro   = computed(() => ['financeiro','ti_admin'].includes(usuario.value?.perfil ?? ''))
  const isControladoria= computed(() => ['controladoria','ti_admin'].includes(usuario.value?.perfil ?? ''))

  async function login(email: string, senha: string) {
    loading.value = true; error.value = null
    try {
      usuario.value = await $fetch<SessaoUsuario>('/api/auth/login', { method: 'POST', body: { email, senha } })
    } catch (e: any) {
      error.value = e?.data?.message ?? e?.message ?? 'Erro ao fazer login.'
      throw e
    } finally { loading.value = false }
  }

  async function logout() {
    try { await $fetch('/api/auth/logout', { method: 'POST' }) }
    finally { usuario.value = null; await navigateTo('/login') }
  }

  async function trocarSenha(novaSenha: string, confirmar: string) {
    loading.value = true; error.value = null
    try {
      await $fetch('/api/auth/trocar-senha', { method: 'POST', body: { nova_senha: novaSenha, confirmar_senha: confirmar } })
      if (usuario.value) usuario.value.primeiro_acesso = false
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Erro ao trocar senha.'
      throw e
    } finally { loading.value = false }
  }

  async function inicializar() {
    if (inicializado.value) return
    try { usuario.value = await $fetch<SessaoUsuario | null>('/api/auth/sessao') ?? null }
    catch { usuario.value = null }
    finally { inicializado.value = true }
  }

  function pode(cap: CapacidadeCritica) { return usuario.value?.capacidades?.includes(cap) ?? false }
  function ePerfil(...perfis: PerfilSetor[]) { return perfis.includes(usuario.value?.perfil as PerfilSetor) }

  return {
    usuario, loading, error, inicializado,
    isAutenticado, isPrimeiroAcesso, perfilAtual,
    isAdmin, isOperacao, isRH, isFinanceiro, isControladoria,
    login, logout, trocarSenha, inicializar, pode, ePerfil,
  }
})
