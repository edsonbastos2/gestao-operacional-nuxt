import { defineStore } from 'pinia'
import type { Competencia } from '~/types'

export const useCompetenciaStore = defineStore('competencia', () => {
  const atual = ref<Competencia | null>(null)
  const loading = ref(false)
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  const label  = computed(() => atual.value ? `${meses[atual.value.mes - 1]}/${atual.value.ano}` : null)
  const aberta = computed(() => atual.value?.status_competencia === 'aberta')

  async function buscarAtual() {
    loading.value = true
    try { atual.value = await $fetch<Competencia>('/api/competencia/atual') }
    catch { atual.value = null }
    finally { loading.value = false }
  }

  return { atual, loading, label, aberta, buscarAtual }
})
