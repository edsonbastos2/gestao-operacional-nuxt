import { defineStore } from 'pinia'

export const useFinanceiroStore = defineStore('financeiro', () => {
  const folha          = ref<any[]>([])
  const historicoSal   = ref<any[]>([])
  const loading        = ref(false)
  const saving         = ref(false)
  const error          = ref<string | null>(null)

  async function listarHistorico(colaborador_id: string) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/financeiro/historico-salarial', { params: { colaborador_id } })
      historicoSal.value = res.data ?? []
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function registrarSalario(payload: any) {
    saving.value = true; error.value = null
    try {
      return await $fetch<any>('/api/financeiro/historico-salarial', { method: 'POST', body: payload })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function calcularFolha(competencia_id: string) {
    saving.value = true; error.value = null
    try {
      return await $fetch<any>('/api/financeiro/calcular', { method: 'POST', body: { competencia_id } })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function carregarFolha(competencia_id: string, filtros: any = {}) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/financeiro/folha', { params: { competencia_id, ...filtros } })
      folha.value = res.data ?? []
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  return {
    folha, historicoSal, loading, saving, error,
    listarHistorico, registrarSalario, calcularFolha, carregarFolha,
  }
})
