import { defineStore } from 'pinia'

export interface Escala {
  id: string; nome: string; descricao?: string
  posto_id?: string; funcao_id?: string; status: string
  posto?: { id: string; nome: string }
  funcao?: { id: string; nome: string }
  turnos?: Turno[]
}
export interface Turno {
  id: string; escala_id: string; nome: string; tipo: string
  hora_inicio: string; hora_fim: string; intervalo_min: number
  carga_horaria_dia?: number; dias_semana: number[]; status: string
}
export interface Feriado {
  id: string; data: string; nome: string; tipo: string
  uf?: string; municipio?: string; recorrente: boolean
}
export interface DiaCalendario {
  id: string; colaborador_id: string; escala_id?: string; turno_id?: string
  competencia: string; data: string; tipo_dia: string
  hora_inicio?: string; hora_fim?: string; observacoes?: string
  ajustado: boolean; ajustado_por?: string; ajustado_em?: string
  colaborador?: { id: string; nome: string }
  escala?: { id: string; nome: string }
  turno?: { id: string; nome: string }
}

export const useEscalasStore = defineStore('escalas', () => {
  const loading = ref(false)
  const saving  = ref(false)
  const error   = ref<string | null>(null)

  // Escalas
  const escalas = ref<Escala[]>([])
  const totalEscalas = ref(0)

  async function listarEscalas(p?: { q?: string; status?: string; posto_id?: string; page?: number }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Escala[]; total: number }>('/api/escalas', { params: p })
      escalas.value = data.data; totalEscalas.value = data.total
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.' } finally { loading.value = false }
  }

  async function salvarEscala(payload: Partial<Escala>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/escalas/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/escalas', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  async function alternarStatusEscala(id: string, justificativa: string) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<{ status: string }>(`/api/escalas/${id}/status`, { method: 'PATCH', body: { justificativa } })
      const e = escalas.value.find(x => x.id === id)
      if (e) e.status = res.status
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // Turnos
  const turnos = ref<Turno[]>([])

  async function listarTurnos(escala_id: string) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Turno[] }>('/api/escalas/turnos', { params: { escala_id } })
      turnos.value = data.data
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.' } finally { loading.value = false }
  }

  async function salvarTurno(payload: Partial<Turno>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/escalas/turnos/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/escalas/turnos', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  async function excluirTurno(id: string) {
    saving.value = true; error.value = null
    try { await $fetch(`/api/escalas/turnos/${id}`, { method: 'DELETE' }) }
    catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // Feriados
  const feriados = ref<Feriado[]>([])
  const totalFeriados = ref(0)

  async function listarFeriados(p?: { ano?: number; uf?: string; q?: string; page?: number }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: Feriado[]; total: number }>('/api/escalas/feriados', { params: p })
      feriados.value = data.data; totalFeriados.value = data.total
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.' } finally { loading.value = false }
  }

  async function salvarFeriado(payload: Partial<Feriado>, id?: string) {
    saving.value = true; error.value = null
    try {
      if (id) return await $fetch(`/api/escalas/feriados/${id}`, { method: 'PATCH', body: payload })
      return await $fetch('/api/escalas/feriados', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  async function excluirFeriado(id: string) {
    saving.value = true; error.value = null
    try { await $fetch(`/api/escalas/feriados/${id}`, { method: 'DELETE' }) }
    catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  // Calendário
  const calendario = ref<DiaCalendario[]>([])

  async function listarCalendario(p: { competencia: string; colaborador_id?: string; posto_id?: string; escala_id?: string }) {
    loading.value = true; error.value = null
    try {
      const data = await $fetch<{ data: DiaCalendario[] }>('/api/escalas/calendario', { params: p })
      calendario.value = data.data
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.' } finally { loading.value = false }
  }

  async function gerarCalendario(payload: { competencia: string; escala_id: string; colaborador_ids: string[] }) {
    saving.value = true; error.value = null
    try { return await $fetch('/api/escalas/calendario/gerar', { method: 'POST', body: payload }) }
    catch (e: any) { error.value = e?.data?.message ?? 'Erro ao gerar calendário.'; throw e } finally { saving.value = false }
  }

  async function ajustarDia(id: string, payload: Partial<DiaCalendario>) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<DiaCalendario>(`/api/escalas/calendario/${id}`, { method: 'PATCH', body: payload })
      const idx = calendario.value.findIndex(d => d.id === id)
      if (idx >= 0) calendario.value[idx] = res
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e } finally { saving.value = false }
  }

  return {
    loading, saving, error,
    escalas, totalEscalas, listarEscalas, salvarEscala, alternarStatusEscala,
    turnos, listarTurnos, salvarTurno, excluirTurno,
    feriados, totalFeriados, listarFeriados, salvarFeriado, excluirFeriado,
    calendario, listarCalendario, gerarCalendario, ajustarDia,
  }
})
