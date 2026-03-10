import { defineStore } from 'pinia'

export interface Prestadora {
  id: string; razao_social: string; nome_fantasia: string | null
  cnpj: string; email: string | null; telefone: string | null; status: string
}
export interface Tomador {
  id: string; prestadora_id: string; razao_social: string; nome_fantasia: string | null
  cnpj: string; email: string | null; telefone: string | null; status: string
  usa_vt: boolean; tipo_vt: string | null; valor_vt_dia: number | null; dias_uteis_vt: number | null
  usa_va: boolean; valor_va_dia: number | null; dias_uteis_va: number | null
  prestadora?: Prestadora
}
export interface Posto {
  id: string; tomador_id: string; nome: string; endereco: string | null
  cidade: string | null; uf: string | null; status: string
  tomador?: Tomador
}
export interface Funcao {
  id: string; nome: string; descricao: string | null; cbo: string | null; status: string
}
export interface Vaga {
  id: string; posto_id: string; funcao_id: string; quantidade: number; status: string
  posto?: Posto; funcao?: Funcao
}

export const useCadastrosStore = defineStore('cadastros', () => {
  const loading = ref(false)
  const saving  = ref(false)
  const error   = ref<string | null>(null)

  // Prestadoras
  const prestadoras = ref<Prestadora[]>([])
  const totalPrestadoras = ref(0)

  async function listarPrestadoras(params?: { q?: string; status?: string; page?: number }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Prestadora[]; total: number }>('/api/cadastros/prestadoras', { params })
      prestadoras.value = data.data; totalPrestadoras.value = data.total
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao listar prestadoras.' } finally { loading.value = false }
  }

  async function salvarPrestadora(payload: Partial<Prestadora>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/cadastros/prestadoras/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/cadastros/prestadoras', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar.'; throw e } finally { saving.value = false }
  }

  async function alternarStatusPrestadora(id: string, justificativa: string) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<{ status: string }>(`/api/cadastros/prestadoras/${id}/status`, { method: 'PATCH', body: { justificativa } })
      const p = prestadoras.value.find(x => x.id === id)
      if (p) p.status = res.status
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // Tomadores
  const tomadores = ref<Tomador[]>([])
  const totalTomadores = ref(0)

  async function listarTomadores(params?: { q?: string; status?: string; prestadora_id?: string; page?: number }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Tomador[]; total: number }>('/api/cadastros/tomadores', { params })
      tomadores.value = data.data; totalTomadores.value = data.total
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao listar tomadores.' } finally { loading.value = false }
  }

  async function salvarTomador(payload: Partial<Tomador>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/cadastros/tomadores/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/cadastros/tomadores', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar.'; throw e } finally { saving.value = false }
  }

  async function alternarStatusTomador(id: string, justificativa: string) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<{ status: string }>(`/api/cadastros/tomadores/${id}/status`, { method: 'PATCH', body: { justificativa } })
      const t = tomadores.value.find(x => x.id === id)
      if (t) t.status = res.status
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // Postos
  const postos = ref<Posto[]>([])
  const totalPostos = ref(0)

  async function listarPostos(params?: { q?: string; status?: string; tomador_id?: string; page?: number }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Posto[]; total: number }>('/api/cadastros/postos', { params })
      postos.value = data.data; totalPostos.value = data.total
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao listar postos.' } finally { loading.value = false }
  }

  async function salvarPosto(payload: Partial<Posto>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/cadastros/postos/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/cadastros/postos', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar.'; throw e } finally { saving.value = false }
  }

  async function alternarStatusPosto(id: string, justificativa: string) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<{ status: string }>(`/api/cadastros/postos/${id}/status`, { method: 'PATCH', body: { justificativa } })
      const p = postos.value.find(x => x.id === id)
      if (p) p.status = res.status
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // Funções
  const funcoes = ref<Funcao[]>([])
  const totalFuncoes = ref(0)

  async function listarFuncoes(params?: { q?: string; status?: string; page?: number }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Funcao[]; total: number }>('/api/cadastros/funcoes', { params })
      funcoes.value = data.data; totalFuncoes.value = data.total
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao listar funções.' } finally { loading.value = false }
  }

  async function salvarFuncao(payload: Partial<Funcao>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/cadastros/funcoes/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/cadastros/funcoes', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar.'; throw e } finally { saving.value = false }
  }

  async function alternarStatusFuncao(id: string, justificativa: string) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<{ status: string }>(`/api/cadastros/funcoes/${id}/status`, { method: 'PATCH', body: { justificativa } })
      const f = funcoes.value.find(x => x.id === id)
      if (f) f.status = res.status
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // Vagas
  const vagas = ref<Vaga[]>([])

  async function listarVagas(posto_id: string) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Vaga[] }>('/api/cadastros/vagas', { params: { posto_id } })
      vagas.value = data.data
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao listar vagas.' } finally { loading.value = false }
  }

  async function salvarVaga(payload: Partial<Vaga>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/cadastros/vagas/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/cadastros/vagas', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar.'; throw e } finally { saving.value = false }
  }

  async function excluirVaga(id: string) {
    saving.value = true; error.value = null
    try { await $fetch(`/api/cadastros/vagas/${id}`, { method: 'DELETE' }) }
    catch (e: any) { error.value = e?.data?.message ?? 'Erro ao excluir.'; throw e } finally { saving.value = false }
  }

  return {
    loading, saving, error,
    prestadoras, totalPrestadoras, listarPrestadoras, salvarPrestadora, alternarStatusPrestadora,
    tomadores, totalTomadores, listarTomadores, salvarTomador, alternarStatusTomador,
    postos, totalPostos, listarPostos, salvarPosto, alternarStatusPosto,
    funcoes, totalFuncoes, listarFuncoes, salvarFuncao, alternarStatusFuncao,
    vagas, listarVagas, salvarVaga, excluirVaga,
  }
})
