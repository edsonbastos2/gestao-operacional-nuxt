import { defineStore } from 'pinia'

export const useCompetenciaStore = defineStore('competencia', () => {
  const competencias   = ref<any[]>([])
  const competenciaAtual = ref<any>(null)
  const espelho        = ref<any[]>([])
  const pendencias     = ref<any>(null)
  const loading        = ref(false)
  const saving         = ref(false)
  const error          = ref<string | null>(null)

  async function listar() {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/competencia')
      competencias.value = res.data ?? []
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function verificarPendencias(competencia_id: string) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/competencia/pendencias', { params: { competencia_id } })
      pendencias.value = res
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function fechar(competencia_id: string, forcar = false) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/competencia/fechar', { method: 'POST', body: { competencia_id, forcar } })
      if (res.fechado) await listar()
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function reabrir(competencia_id: string, justificativa: string) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/competencia/reabrir', { method: 'POST', body: { competencia_id, justificativa } })
      await listar()
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function carregarEspelho(competencia_id: string, filtros: any = {}) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/competencia/espelho', { params: { competencia_id, ...filtros } })
      espelho.value = res.data ?? []
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  return {
    competencias, competenciaAtual, espelho, pendencias,
    loading, saving, error,
    listar, verificarPendencias, fechar, reabrir, carregarEspelho,
  }
})
