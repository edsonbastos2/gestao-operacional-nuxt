import { defineStore } from 'pinia'

export const useBeneficiosStore = defineStore('beneficios', () => {
  const ccts         = ref<any[]>([])
  const beneficios   = ref<any[]>([])
  const fornecedores = ref<any[]>([])
  const colabBenef   = ref<any[]>([])
  const loading      = ref(false)
  const saving       = ref(false)
  const error        = ref<string | null>(null)

  // ── CCTs ────────────────────────────────────────────────────
  async function listarCcts(params: any = {}) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/beneficios/ccts', { params })
      ccts.value = res.data
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function salvarCct(payload: any, id?: string) {
    saving.value = true; error.value = null
    try {
      const res = id
        ? await $fetch<any>(`/api/beneficios/ccts/${id}`, { method: 'PATCH', body: payload })
        : await $fetch<any>('/api/beneficios/ccts', { method: 'POST', body: payload })
      await listarCcts()
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  // ── Benefícios CCT ──────────────────────────────────────────
  async function listarBeneficios(params: any = {}) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/beneficios/beneficios', { params })
      beneficios.value = res.data
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function salvarBeneficio(payload: any, id?: string) {
    saving.value = true; error.value = null
    try {
      const res = id
        ? await $fetch<any>(`/api/beneficios/beneficios/${id}`, { method: 'PATCH', body: payload })
        : await $fetch<any>('/api/beneficios/beneficios', { method: 'POST', body: payload })
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  // ── Fornecedores ────────────────────────────────────────────
  async function listarFornecedores(params: any = {}) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/beneficios/fornecedores', { params })
      fornecedores.value = res.data
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function salvarFornecedor(payload: any, id?: string) {
    saving.value = true; error.value = null
    try {
      const res = id
        ? await $fetch<any>(`/api/beneficios/fornecedores/${id}`, { method: 'PATCH', body: payload })
        : await $fetch<any>('/api/beneficios/fornecedores', { method: 'POST', body: payload })
      await listarFornecedores()
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  // ── Adesão do colaborador ───────────────────────────────────
  async function listarColabBeneficios(colaborador_id: string) {
    loading.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/beneficios/colaborador', { params: { colaborador_id } })
      colabBenef.value = res.data
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { loading.value = false }
  }

  async function aderirBeneficio(payload: any) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<any>('/api/beneficios/colaborador', { method: 'POST', body: payload })
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function atualizarAdesao(id: string, payload: any) {
    saving.value = true; error.value = null
    try {
      const res = await $fetch<any>(`/api/beneficios/colaborador/${id}`, { method: 'PATCH', body: payload })
      return res
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
    finally { saving.value = false }
  }

  async function aplicarObrigatorios(colaborador_id: string, alocacao_id: string) {
    try {
      return await $fetch<any>('/api/beneficios/aplicar-obrigatorios', { method: 'POST', body: { colaborador_id, alocacao_id } })
    } catch (e: any) { error.value = e?.data?.message ?? 'Erro.'; throw e }
  }

  return {
    ccts, beneficios, fornecedores, colabBenef,
    loading, saving, error,
    listarCcts, salvarCct,
    listarBeneficios, salvarBeneficio,
    listarFornecedores, salvarFornecedor,
    listarColabBeneficios, aderirBeneficio, atualizarAdesao, aplicarObrigatorios,
  }
})
