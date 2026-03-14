import { defineStore } from 'pinia'

export const useOperacaoStore = defineStore('operacao', () => {
  const faltas    = ref<any[]>([])
  const extras    = ref<any[]>([])
  const ocorrencias = ref<any[]>([])
  const loading   = ref(false)
  const saving    = ref(false)
  const error     = ref<string | null>(null)
  const totalFaltas  = ref(0)
  const totalExtras  = ref(0)
  const totalOcorr   = ref(0)

  async function listarFaltas(params: any = {}) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/operacao/faltas', { params })
      faltas.value = res.data; totalFaltas.value = res.total
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function registrarFalta(payload: any) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/operacao/faltas', { method: 'POST', body: payload })
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function cancelarFalta(id: string) {
    saving.value = true; error.value = null
    try {
      return await $fetch<any>(`/api/operacao/faltas/${id}`, { method: 'PATCH', body: { status: 'cancelada' } })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function listarExtras(params: any = {}) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/operacao/extras', { params })
      extras.value = res.data; totalExtras.value = res.total
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function registrarExtra(payload: any) {
    saving.value = true; error.value = null
    try {
      return await $fetch<any>('/api/operacao/extras', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function acaoExtra(id: string, acao: string, motivo_recusa?: string) {
    saving.value = true; error.value = null
    try {
      return await $fetch<any>(`/api/operacao/extras/${id}`, { method: 'PATCH', body: { acao, motivo_recusa } })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function listarOcorrencias(params: any = {}) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/operacao/ocorrencias', { params })
      ocorrencias.value = res.data; totalOcorr.value = res.total
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function registrarOcorrencia(payload: any) {
    saving.value = true; error.value = null
    try {
      return await $fetch<any>('/api/operacao/ocorrencias', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  return {
    faltas, extras, ocorrencias,
    loading, saving, error,
    totalFaltas, totalExtras, totalOcorr,
    listarFaltas, registrarFalta, cancelarFalta,
    listarExtras, registrarExtra, acaoExtra,
    listarOcorrencias, registrarOcorrencia,
  }
})
