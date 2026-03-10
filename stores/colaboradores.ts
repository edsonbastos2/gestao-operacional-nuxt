import { defineStore } from 'pinia'

export interface Candidato {
  id: string; nome: string; cpf: string; rg?: string; data_nasc?: string
  sexo?: string; email?: string; telefone?: string
  cep?: string; endereco?: string; cidade?: string; uf?: string
  funcao_id?: string; posto_id?: string
  status: string; observacoes?: string; reprovado_motivo?: string
  funcao?: { id: string; nome: string }
  posto?: { id: string; nome: string }
}

export interface Colaborador {
  id: string; nome: string; cpf: string; matricula?: string
  data_admissao: string; data_demissao?: string; status: string
  email?: string; telefone?: string; telefone2?: string
  rg?: string; rg_orgao?: string; rg_data_emissao?: string
  data_nasc?: string; sexo?: string; estado_civil?: string
  tipo_sanguineo?: string; nome_mae?: string; nome_pai?: string
  cep?: string; endereco?: string; complemento?: string
  bairro?: string; cidade?: string; uf?: string
  pis_pasep?: string; ctps_numero?: string; ctps_serie?: string; ctps_uf?: string
  titulo_eleitor?: string; cnh?: string; cnh_categoria?: string; cnh_validade?: string
  banco?: string; agencia?: string; conta?: string; tipo_conta?: string
  prestadora_id?: string
  candidato_id?: string
  prestadora?: { id: string; razao_social: string; nome_fantasia?: string }
  alocacoes?: Alocacao[]
  asos?: Aso[]
  dependentes?: Dependente[]
}

export interface Alocacao {
  id: string; colaborador_id: string; posto_id: string; funcao_id: string
  principal: boolean; data_inicio: string; data_fim?: string; status: string; observacoes?: string
  posto?: { id: string; nome: string }
  funcao?: { id: string; nome: string }
}

export interface Aso {
  id: string; colaborador_id: string; tipo: string; resultado: string
  data_exame: string; data_validade?: string
  medico_nome?: string; medico_crm?: string; restricoes?: string; observacoes?: string
}

export interface Dependente {
  id: string; colaborador_id: string; nome: string; parentesco: string
  data_nasc?: string; cpf?: string
}

export const useColaboradoresStore = defineStore('colaboradores', () => {
  const loading = ref(false)
  const saving  = ref(false)
  const error   = ref<string | null>(null)

  // Candidatos
  const candidatos = ref<Candidato[]>([])
  const totalCandidatos = ref(0)

  async function listarCandidatos(p?: { q?: string; status?: string; page?: number }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Candidato[]; total: number }>('/api/colaboradores/candidatos', { params: p })
      candidatos.value = data.data; totalCandidatos.value = data.total
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao listar candidatos.' } finally { loading.value = false }
  }

  async function salvarCandidato(payload: Partial<Candidato>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/colaboradores/candidatos/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/colaboradores/candidatos', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar.'; throw e } finally { saving.value = false }
  }

  async function atualizarStatusCandidato(id: string, status: string, motivo?: string) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<{ status: string }>(`/api/colaboradores/candidatos/${id}/status`, { method: 'PATCH', body: { status, motivo } })
      const c = candidatos.value.find(x => x.id === id)
      if (c) c.status = res.status
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  async function promoverParaColaborador(id: string, payload: Partial<Colaborador>) {
    saving.value = true; error.value = null
    try {
      return await $fetch('/api/colaboradores/candidatos/' + id + '/promover', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao promover.'; throw e } finally { saving.value = false }
  }

  // Colaboradores
  const colaboradores = ref<Colaborador[]>([])
  const totalColaboradores = ref(0)
  const colaboradorAtual = ref<Colaborador | null>(null)

  async function listarColaboradores(p?: { q?: string; status?: string; prestadora_id?: string; posto_id?: string; funcao_id?: string; page?: number }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Colaborador[]; total: number }>('/api/colaboradores', { params: p })
      colaboradores.value = data.data; totalColaboradores.value = data.total
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao listar colaboradores.' } finally { loading.value = false }
  }

  async function buscarColaborador(id: string) {
    loading.value = true; error.value = null
    try {
      colaboradorAtual.value = await $fetch<Colaborador>(`/api/colaboradores/${id}`)
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao buscar colaborador.' } finally { loading.value = false }
  }

  async function salvarColaborador(payload: Partial<Colaborador>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/colaboradores/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/colaboradores', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar.'; throw e } finally { saving.value = false }
  }

  async function alternarStatusColaborador(id: string, status: string, justificativa: string) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<{ status: string }>(`/api/colaboradores/${id}/status`, { method: 'PATCH', body: { status, justificativa } })
      const c = colaboradores.value.find(x => x.id === id)
      if (c) c.status = res.status
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // Alocações
  async function listarAlocacoes(colaborador_id: string) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Alocacao[] }>('/api/colaboradores/alocacoes', { params: { colaborador_id } })
      if (colaboradorAtual.value) colaboradorAtual.value.alocacoes = data.data
      return data.data
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.' } finally { loading.value = false }
  }

  async function salvarAlocacao(payload: Partial<Alocacao>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/colaboradores/alocacoes/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/colaboradores/alocacoes', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar alocação.'; throw e } finally { saving.value = false }
  }

  async function encerrarAlocacao(id: string, data_fim: string) {
    saving.value = true; error.value = null
    try { return await $fetch(`/api/colaboradores/alocacoes/${id}/encerrar`, { method: 'PATCH', body: { data_fim } }) }
    catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // ASOs
  async function listarAsos(colaborador_id: string) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Aso[] }>('/api/colaboradores/asos', { params: { colaborador_id } })
      if (colaboradorAtual.value) colaboradorAtual.value.asos = data.data
      return data.data
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.' } finally { loading.value = false }
  }

  async function salvarAso(payload: Partial<Aso>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/colaboradores/asos/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/colaboradores/asos', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar ASO.'; throw e } finally { saving.value = false }
  }

  // Dependentes
  async function listarDependentes(colaborador_id: string) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Dependente[] }>('/api/colaboradores/dependentes', { params: { colaborador_id } })
      if (colaboradorAtual.value) colaboradorAtual.value.dependentes = data.data
      return data.data
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.' } finally { loading.value = false }
  }

  async function salvarDependente(payload: Partial<Dependente>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/colaboradores/dependentes/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/colaboradores/dependentes', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro ao salvar dependente.'; throw e } finally { saving.value = false }
  }

  async function excluirDependente(id: string) {
    saving.value = true; error.value = null
    try { await $fetch(`/api/colaboradores/dependentes/${id}`, { method: 'DELETE' }) }
    catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  return {
    loading, saving, error,
    candidatos, totalCandidatos, listarCandidatos, salvarCandidato, atualizarStatusCandidato, promoverParaColaborador,
    colaboradores, totalColaboradores, colaboradorAtual,
    listarColaboradores, buscarColaborador, salvarColaborador, alternarStatusColaborador,
    listarAlocacoes, salvarAlocacao, encerrarAlocacao,
    listarAsos, salvarAso,
    listarDependentes, salvarDependente, excluirDependente,
  }
})
