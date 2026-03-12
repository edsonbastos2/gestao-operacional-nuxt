<script setup lang="ts">
definePageMeta({ layout: 'default' })
const cadastros = useCadastrosStore()
const toast = useToast()

// ── Filtros ───────────────────────────────────────────────────
const filtroPrestadora = ref('')
const filtroTomador    = ref('')
const filtroPostoId    = ref('')
const filtroStatus     = ref<'todos'|'ok'|'incompleto'|'lotado'>('todos')

onMounted(async () => {
  await Promise.all([
    cadastros.listarPrestadoras({ status: 'ativo' }),
    cadastros.listarTomadores({ status: 'ativo' }),
  ])
  await carregar()
})

// ── Dados ─────────────────────────────────────────────────────
const vagas = ref<any[]>([])
const loading = ref(false)

async function carregar() {
  loading.value = true
  try {
    const params: any = {}
    if (filtroPrestadora.value) params.prestadora_id = filtroPrestadora.value
    if (filtroTomador.value)    params.tomador_id    = filtroTomador.value
    if (filtroPostoId.value)    params.posto_id      = filtroPostoId.value
    const res = await $fetch<{ data: any[] }>('/api/cadastros/vagas/ocupacao', { params })
    vagas.value = res.data
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e?.data?.message ?? 'Erro ao carregar.', life: 4000 })
  } finally { loading.value = false }
}

function limpar() {
  filtroPrestadora.value = ''; filtroTomador.value = ''
  filtroPostoId.value = ''; filtroStatus.value = 'todos'
  carregar()
}

// ── Opções de filtro ──────────────────────────────────────────
const prestadoraOpts = computed(() => [
  { label: 'Todas as prestadoras', value: '' },
  ...cadastros.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id }))
])
const tomadorOpts = computed(() => [
  { label: 'Todos os tomadores', value: '' },
  ...cadastros.tomadores
    .filter(t => !filtroPrestadora.value || t.prestadora_id === filtroPrestadora.value)
    .map(t => ({ label: t.nome_fantasia ?? t.razao_social, value: t.id }))
])
const postoOpts = computed(() => [
  { label: 'Todos os postos', value: '' },
  ...cadastros.postos
    .filter(p => !filtroTomador.value || p.tomador_id === filtroTomador.value)
    .map(p => ({ label: p.nome, value: p.id }))
])
const statusOpts = [
  { label: 'Todos',      value: 'todos' },
  { label: 'Completo',   value: 'ok' },
  { label: 'Incompleto', value: 'incompleto' },
  { label: 'Lotado',     value: 'lotado' },
]

// ── Processamento ─────────────────────────────────────────────
function situacao(v: any): 'ok' | 'incompleto' | 'lotado' {
  if (v.alocados > v.vagas_contratadas) return 'lotado'
  if (v.alocados === v.vagas_contratadas) return 'ok'
  return 'incompleto'
}

const vagasFiltradas = computed(() => {
  if (filtroStatus.value === 'todos') return vagas.value
  return vagas.value.filter(v => situacao(v) === filtroStatus.value)
})

// Agrupa por Tomador → Posto
const porTomador = computed(() => {
  const mapa: Record<string, { tomador: string; prestadora: string; postos: Record<string, { posto: string; vagas: any[] }> }> = {}
  for (const v of vagasFiltradas.value) {
    if (!mapa[v.tomador_id]) mapa[v.tomador_id] = { tomador: v.tomador_nome, prestadora: v.prestadora_nome, postos: {} }
    if (!mapa[v.tomador_id].postos[v.posto_id]) mapa[v.tomador_id].postos[v.posto_id] = { posto: v.posto_nome, vagas: [] }
    mapa[v.tomador_id].postos[v.posto_id].vagas.push(v)
  }
  return Object.values(mapa).map(t => ({ ...t, postos: Object.values(t.postos) }))
})

// ── KPIs ──────────────────────────────────────────────────────
const kpis = computed(() => {
  const total      = vagas.value.reduce((s, v) => s + v.vagas_contratadas, 0)
  const alocados   = vagas.value.reduce((s, v) => s + v.alocados, 0)
  const incompletos = vagas.value.filter(v => situacao(v) === 'incompleto').length
  const lotados    = vagas.value.filter(v => situacao(v) === 'lotado').length
  return { total, alocados, incompletos, lotados, saldo: total - alocados }
})

// ── Helpers visuais ───────────────────────────────────────────
function barWidth(v: any) {
  const pct = v.vagas_contratadas > 0 ? Math.min((v.alocados / v.vagas_contratadas) * 100, 100) : 0
  return `${pct}%`
}
function barColor(v: any) {
  const s = situacao(v)
  if (s === 'lotado')     return 'bg-orange-400'
  if (s === 'ok')         return 'bg-emerald-500'
  return 'bg-blue-400'
}
const sitBadge: Record<string, { label: string; cls: string }> = {
  ok:          { label: 'Completo',   cls: 'badge badge-ativo' },
  incompleto:  { label: 'Incompleto', cls: 'badge badge-pendente' },
  lotado:      { label: 'Excede',     cls: 'badge badge-reserva' },
}
</script>

<template>
  <div>
    <SgoPageHeader title="Mapa de Vagas por Posto" subtitle="Ocupação atual versus vagas contratadas." icon="pi-map">
      <template #actions>
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="loading" @click="carregar" />
      </template>
    </SgoPageHeader>

    <!-- KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
      <SgoStatCard title="Vagas contratadas" :value="kpis.total"      icon="pi-briefcase"    icon-bg="bg-blue-50"   icon-color="#2563eb" />
      <SgoStatCard title="Alocados"          :value="kpis.alocados"   icon="pi-users"        icon-bg="bg-green-50"  icon-color="#16a34a" />
      <SgoStatCard title="Saldo em aberto"   :value="kpis.saldo"      icon="pi-user-minus"   icon-bg="bg-amber-50"  icon-color="#d97706" />
      <SgoStatCard title="Postos incompletos":value="kpis.incompletos" icon="pi-exclamation-circle" icon-bg="bg-blue-50" icon-color="#2563eb" />
      <SgoStatCard title="Postos excedidos"  :value="kpis.lotados"    icon="pi-exclamation-triangle" icon-bg="bg-orange-50" icon-color="#ea580c" />
    </div>

    <!-- Filtros -->
    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <Select v-model="filtroPrestadora" :options="prestadoraOpts" option-label="label" option-value="value"
          class="w-52" placeholder="Prestadora" @change="filtroTomador = ''; filtroPostoId = ''; carregar()" />
        <Select v-model="filtroTomador" :options="tomadorOpts" option-label="label" option-value="value"
          class="w-52" placeholder="Tomador" @change="filtroPostoId = ''; carregar()" />
        <Select v-model="filtroPostoId" :options="postoOpts" option-label="label" option-value="value"
          class="w-44" placeholder="Posto" @change="carregar()" />
        <Select v-model="filtroStatus" :options="statusOpts" option-label="label" option-value="value"
          class="w-36" @change="carregar()" />
        <Button v-if="filtroPrestadora || filtroTomador || filtroPostoId || filtroStatus !== 'todos'"
          label="Limpar" icon="pi pi-times" severity="secondary" text size="small" @click="limpar" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="sgo-card flex items-center justify-center py-12">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
    </div>

    <!-- Vazio -->
    <div v-else-if="!porTomador.length" class="sgo-card">
      <SgoEmptyState icon="pi-map" title="Nenhuma vaga encontrada"
        description="Cadastre postos e vagas em Cadastros para visualizar o mapa de ocupação." />
    </div>

    <!-- Mapa por tomador -->
    <div v-else class="space-y-4">
      <div v-for="tom in porTomador" :key="tom.tomador" class="sgo-card">
        <!-- Cabeçalho do tomador -->
        <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <i class="pi pi-building text-blue-600" />
          </div>
          <div class="flex-1">
            <p class="font-bold text-slate-800">{{ tom.tomador }}</p>
            <p class="text-xs text-slate-400">{{ tom.prestadora }}</p>
          </div>
          <!-- Mini resumo do tomador -->
          <div class="text-right text-xs text-slate-500 hidden md:block">
            <span class="font-semibold text-slate-700">
              {{ tom.postos.reduce((s, p) => s + p.vagas.reduce((ss, v) => ss + v.alocados, 0), 0) }}
            </span> /
            {{ tom.postos.reduce((s, p) => s + p.vagas.reduce((ss, v) => ss + v.vagas_contratadas, 0), 0) }}
            alocados
          </div>
        </div>

        <!-- Postos -->
        <div class="space-y-4">
          <div v-for="posto in tom.postos" :key="posto.posto">
            <p class="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
              <i class="pi pi-map-marker text-slate-400 text-xs" />
              {{ posto.posto }}
            </p>
            <div class="space-y-2 pl-5">
              <div v-for="v in posto.vagas" :key="v.vaga_id" class="flex items-center gap-3">
                <!-- Função -->
                <p class="text-sm text-slate-700 w-44 shrink-0 truncate">{{ v.funcao_nome }}</p>
                <!-- Barra de progresso -->
                <div class="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                  <div
                    :class="['h-full rounded-full transition-all duration-500', barColor(v)]"
                    :style="{ width: barWidth(v) }"
                  />
                  <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
                    {{ v.alocados }} / {{ v.vagas_contratadas }}
                  </span>
                </div>
                <!-- Badge situação -->
                <span :class="sitBadge[situacao(v)].cls" class="shrink-0 text-xs">
                  {{ sitBadge[situacao(v)].label }}
                </span>
                <!-- Saldo -->
                <span class="text-xs text-slate-400 w-20 text-right shrink-0">
                  <span v-if="v.saldo > 0" class="text-amber-500 font-semibold">{{ v.saldo }} em aberto</span>
                  <span v-else-if="v.saldo === 0" class="text-emerald-600 font-semibold">Completo</span>
                  <span v-else class="text-orange-500 font-semibold">+{{ Math.abs(v.saldo) }} excede</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Toast />
  </div>
</template>
