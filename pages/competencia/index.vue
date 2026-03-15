<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store    = useCompetenciaStore()
const cadastros = useCadastrosStore()
const toast    = useToast()
const { me }   = useAuthStore()

const modalFechar    = ref(false)
const modalReabrir   = ref(false)
const modalEspelho   = ref(false)
const competenciaSel = ref<any>(null)
const justificativa  = ref('')
const pendencias     = ref<any>(null)
const confirmarForcar = ref(false)
const filtroPrestadora = ref('')
const filtroPostoEspelho = ref('')

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

onMounted(async () => {
  await Promise.all([
    store.listar(),
    cadastros.listarPrestadoras({ status: 'ativo' }),
  ])
})

const prestadoraOpts = computed(() => [
  { label: 'Todas as prestadoras', value: '' },
  ...cadastros.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id }))
])

const statusColor: Record<string, string> = {
  aberta:   'bg-emerald-100 text-emerald-700',
  fechada:  'bg-slate-200 text-slate-600',
  reaberta: 'bg-amber-100 text-amber-700',
}
const statusLabel: Record<string, string> = {
  aberta: 'Aberta', fechada: 'Fechada', reaberta: 'Reaberta',
}

// ── Fluxo de fechamento ───────────────────────────────────────
async function abrirModalFechar(comp: any) {
  competenciaSel.value = comp
  confirmarForcar.value = false
  pendencias.value = null
  modalFechar.value = true
  // Verifica pendências automaticamente
  try {
    pendencias.value = await store.verificarPendencias(comp.id)
  } catch { pendencias.value = null }
}

async function confirmarFechamento(forcar = false) {
  try {
    const res = await store.fechar(competenciaSel.value.id, forcar)
    if (res.requer_confirmacao) {
      confirmarForcar.value = true
      return
    }
    modalFechar.value = false
    confirmarForcar.value = false
    toast.add({ severity: 'success', summary: `Competência ${meses[competenciaSel.value.mes-1]}/${competenciaSel.value.ano} fechada. ${res.espelho?.total ?? 0} espelhos gerados.`, life: 5000 })
  } catch {
    toast.add({ severity: 'error', summary: store.error ?? 'Erro ao fechar.', life: 4000 })
  }
}

// ── Fluxo de reabertura ───────────────────────────────────────
function abrirModalReabrir(comp: any) {
  competenciaSel.value = comp
  justificativa.value = ''
  modalReabrir.value = true
}

async function confirmarReabertura() {
  if (!justificativa.value.trim()) {
    toast.add({ severity: 'warn', summary: 'Justificativa obrigatória.', life: 3000 }); return
  }
  try {
    await store.reabrir(competenciaSel.value.id, justificativa.value)
    modalReabrir.value = false
    toast.add({ severity: 'success', summary: 'Competência reaberta.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: store.error ?? 'Erro ao reabrir.', life: 4000 })
  }
}

// ── Espelho ───────────────────────────────────────────────────
async function abrirEspelho(comp: any) {
  competenciaSel.value = comp
  filtroPrestadora.value = ''
  filtroPostoEspelho.value = ''
  modalEspelho.value = true
  await store.carregarEspelho(comp.id)
}

async function filtrarEspelho() {
  await store.carregarEspelho(competenciaSel.value.id, {
    prestadora_id: filtroPrestadora.value || undefined,
    posto_id:      filtroPostoEspelho.value || undefined,
  })
}

const espelhoFiltrado = computed(() => store.espelho)
const totalFaltas  = computed(() => espelhoFiltrado.value.reduce((s, e) => s + (e.faltas_injustificadas + e.faltas_justificadas + e.faltas_abonadas + e.faltas_suspensao), 0))
const totalExtras  = computed(() => espelhoFiltrado.value.reduce((s, e) => s + Number(e.horas_extras_aprovadas), 0))
</script>

<template>
  <div>
    <SgoPageHeader title="Competências" subtitle="Fechamento mensal e espelho de colaboradores." icon="pi-calendar-plus" />

    <!-- KPIs -->
    <div class="grid grid-cols-3 gap-4 mb-4">
      <SgoStatCard title="Total competências"   :value="store.competencias.length"                                         icon="pi-calendar"      icon-bg="bg-slate-50"   icon-color="#64748b" />
      <SgoStatCard title="Abertas"              :value="store.competencias.filter(c=>c.status_fechamento==='aberta').length"  icon="pi-lock-open"     icon-bg="bg-emerald-50" icon-color="#059669" />
      <SgoStatCard title="Fechadas"             :value="store.competencias.filter(c=>c.status_fechamento==='fechada').length" icon="pi-lock"          icon-bg="bg-slate-50"   icon-color="#64748b" />
    </div>

    <!-- Lista de competências -->
    <div v-if="store.loading" class="flex justify-center py-12">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
    </div>
    <SgoEmptyState v-else-if="!store.competencias.length" icon="pi-calendar-plus"
      title="Nenhuma competência encontrada"
      description="Crie uma competência no menu de configurações." />
    <div v-else class="space-y-3">
      <div v-for="comp in store.competencias" :key="comp.id"
        class="sgo-card flex items-center gap-4 hover:shadow-md transition-shadow">

        <!-- Mês/Ano -->
        <div class="w-16 h-16 rounded-xl bg-blue-50 flex flex-col items-center justify-center shrink-0">
          <p class="text-xs font-semibold text-blue-500 uppercase">{{ meses[comp.mes-1]?.slice(0,3) }}</p>
          <p class="text-xl font-bold text-blue-700">{{ comp.ano }}</p>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-bold text-slate-800">{{ meses[comp.mes-1] }} {{ comp.ano }}</p>
            <span :class="['text-xs font-semibold rounded px-2 py-0.5', statusColor[comp.status_fechamento]]">
              {{ statusLabel[comp.status_fechamento] }}
            </span>
            <span v-if="comp.pendencias_no_fechamento" class="text-xs bg-amber-100 text-amber-700 rounded px-2 py-0.5">
              <i class="pi pi-exclamation-triangle mr-1 text-xs" />Fechada com pendências
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            {{ comp.data_inicio ? new Date(comp.data_inicio+'T12:00:00').toLocaleDateString('pt-BR') : '' }}
            até
            {{ comp.data_fim ? new Date(comp.data_fim+'T12:00:00').toLocaleDateString('pt-BR') : '' }}
          </p>
          <div v-if="comp.status_fechamento === 'fechada'" class="flex gap-4 mt-1 text-xs text-slate-400">
            <span><i class="pi pi-users mr-1" />{{ comp.total_colaboradores }} colaboradores</span>
            <span><i class="pi pi-user-minus mr-1" />{{ comp.total_faltas }} faltas</span>
            <span><i class="pi pi-plus-circle mr-1" />{{ comp.total_extras_horas }}h extras</span>
            <span v-if="comp.fechado_por_usuario">Fechado por: {{ comp.fechado_por_usuario?.nome }}</span>
          </div>
          <div v-if="comp.status_fechamento === 'reaberta'" class="text-xs text-amber-600 mt-1">
            <i class="pi pi-info-circle mr-1" />Reaberta: {{ comp.justificativa_reabertura }}
          </div>
        </div>

        <!-- Ações -->
        <div class="flex gap-2 shrink-0">
          <Button v-if="comp.status_fechamento === 'fechada' || comp.status_fechamento === 'reaberta'"
            label="Espelho" icon="pi pi-table" size="small" severity="secondary" outlined
            @click="abrirEspelho(comp)" />
          <Button v-if="comp.status_fechamento !== 'fechada'"
            label="Fechar" icon="pi pi-lock" size="small"
            @click="abrirModalFechar(comp)" />
          <Button v-if="comp.status_fechamento === 'fechada' && me?.perfil === 'ti_admin'"
            label="Reabrir" icon="pi pi-lock-open" size="small" severity="warning" outlined
            @click="abrirModalReabrir(comp)" />
        </div>
      </div>
    </div>

    <!-- Modal Fechar -->
    <Dialog v-model:visible="modalFechar" header="Fechar Competência" :style="{ width: '520px' }" modal>
      <div class="space-y-4 py-1">
        <p class="text-slate-600">
          Fechar <strong>{{ meses[competenciaSel?.mes-1] }} {{ competenciaSel?.ano }}</strong>?
          Esta ação bloqueia novos lançamentos e gera o espelho de todos os colaboradores.
        </p>

        <!-- Pendências encontradas -->
        <div v-if="store.loading" class="flex justify-center py-4">
          <i class="pi pi-spinner animate-spin text-blue-600" />
        </div>
        <div v-else-if="pendencias">
          <div v-if="pendencias.tem_pendencias" class="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-2">
            <p class="font-semibold text-amber-700 flex items-center gap-2">
              <i class="pi pi-exclamation-triangle" />Pendências encontradas
            </p>
            <div v-if="pendencias.extras_pendentes.total > 0" class="text-sm text-amber-700">
              <i class="pi pi-clock mr-2" />{{ pendencias.extras_pendentes.total }} extra(s) pendente(s) de aprovação pela operação
            </div>
            <div v-if="pendencias.extras_aguardando_rh.total > 0" class="text-sm text-amber-700">
              <i class="pi pi-send mr-2" />{{ pendencias.extras_aguardando_rh.total }} extra(s) aguardando homologação do RH
            </div>
            <div v-if="pendencias.faltas_injustificadas.total > 0" class="text-sm text-amber-700">
              <i class="pi pi-user-minus mr-2" />{{ pendencias.faltas_injustificadas.total }} falta(s) injustificada(s) sem tratamento
            </div>

            <div v-if="confirmarForcar" class="rounded-lg bg-red-50 border border-red-200 p-3 mt-2">
              <p class="text-sm text-red-700 font-semibold">Fechar mesmo assim com pendências?</p>
              <p class="text-xs text-red-500 mt-1">As pendências serão registradas no histórico do fechamento.</p>
            </div>
          </div>
          <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <i class="pi pi-check-circle mr-2" />Nenhuma pendência encontrada. Tudo pronto para fechar.
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalFechar = false" />
          <Button v-if="!confirmarForcar || !pendencias?.tem_pendencias"
            label="Fechar competência" icon="pi pi-lock" :loading="store.saving"
            @click="confirmarFechamento(false)" />
          <Button v-if="confirmarForcar && pendencias?.tem_pendencias"
            label="Fechar com pendências" icon="pi pi-lock" severity="warning" :loading="store.saving"
            @click="confirmarFechamento(true)" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Reabrir -->
    <Dialog v-model:visible="modalReabrir" header="Reabrir Competência" :style="{ width: '460px' }" modal>
      <div class="space-y-4 py-1">
        <div class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          <i class="pi pi-exclamation-triangle mr-2" />Reabrir permitirá novos lançamentos para <strong>{{ meses[competenciaSel?.mes-1] }} {{ competenciaSel?.ano }}</strong>. O espelho anterior será substituído ao fechar novamente.
        </div>
        <SgoFormField label="Justificativa" field-id="jr_j">
          <Textarea id="jr_j" v-model="justificativa" rows="3" class="w-full"
            placeholder="Motivo da reabertura (obrigatório)..." />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalReabrir = false" />
          <Button label="Confirmar reabertura" severity="warning" :loading="store.saving" @click="confirmarReabertura" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Espelho -->
    <Dialog v-model:visible="modalEspelho"
      :header="`Espelho — ${meses[competenciaSel?.mes-1]} ${competenciaSel?.ano}`"
      :style="{ width: '90vw', maxWidth: '1100px' }" modal>
      <div class="space-y-3">
        <!-- Filtros do espelho -->
        <div class="flex gap-3 flex-wrap items-end">
          <SgoFormField label="Prestadora" field-id="esp_pr" class="w-56">
            <Select id="esp_pr" v-model="filtroPrestadora" :options="prestadoraOpts"
              option-label="label" option-value="value" class="w-full" @change="filtrarEspelho" />
          </SgoFormField>
          <div class="flex gap-3 text-sm text-slate-500 items-center ml-auto">
            <span><strong>{{ espelhoFiltrado.length }}</strong> colaboradores</span>
            <span><strong>{{ totalFaltas }}</strong> faltas</span>
            <span><strong>{{ totalExtras.toFixed(1) }}h</strong> extras</span>
          </div>
        </div>

        <!-- Tabela espelho -->
        <div v-if="store.loading" class="flex justify-center py-8">
          <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
        </div>
        <SgoEmptyState v-else-if="!espelhoFiltrado.length" icon="pi-table"
          title="Espelho vazio" description="Nenhum registro encontrado." />
        <div v-else class="overflow-x-auto rounded-xl border border-slate-100">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr>
                <th class="text-left px-3 py-2.5 text-slate-500 font-semibold">Colaborador</th>
                <th class="text-left px-3 py-2.5 text-slate-500 font-semibold">Posto / Função</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">Dias Trab.</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">F.Inj</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">F.Just</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">F.Abon</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">Susp.</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">H.Atraso</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">H.Extra</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">Fer.Trab</th>
                <th class="text-center px-3 py-2.5 text-slate-500 font-semibold">Ocorr.</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="e in espelhoFiltrado" :key="e.id"
                :class="['hover:bg-slate-50 transition-colors',
                  e.faltas_injustificadas > 0 ? 'bg-red-50/30' : '']">
                <td class="px-3 py-2.5">
                  <p class="font-semibold text-slate-800">{{ e.colaborador_nome }}</p>
                  <p class="text-slate-400">{{ e.colaborador_matricula }}</p>
                </td>
                <td class="px-3 py-2.5 text-slate-600">
                  {{ e.posto_nome }}<br>
                  <span class="text-slate-400">{{ e.funcao_nome }}</span>
                </td>
                <td class="px-3 py-2.5 text-center font-semibold text-slate-700">
                  {{ e.dias_trabalhados }}<span class="text-slate-400 font-normal">/{{ e.dias_uteis }}</span>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span :class="e.faltas_injustificadas > 0 ? 'font-bold text-red-600' : 'text-slate-400'">
                    {{ e.faltas_injustificadas }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center text-slate-600">{{ e.faltas_justificadas }}</td>
                <td class="px-3 py-2.5 text-center text-slate-600">{{ e.faltas_abonadas }}</td>
                <td class="px-3 py-2.5 text-center">
                  <span :class="e.faltas_suspensao > 0 ? 'font-bold text-purple-600' : 'text-slate-400'">
                    {{ e.faltas_suspensao }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center text-slate-600">
                  {{ e.horas_atraso > 0 ? `${e.horas_atraso}h` : '—' }}
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span :class="e.horas_extras_aprovadas > 0 ? 'font-bold text-emerald-600' : 'text-slate-400'">
                    {{ e.horas_extras_aprovadas > 0 ? `${e.horas_extras_aprovadas}h` : '—' }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center text-slate-600">
                  {{ e.feriados_trabalhados > 0 ? `${e.feriados_trabalhados} (${e.feriados_geram_pagamento}$)` : '—' }}
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span v-if="e.ocorrencias_disciplinares > 0" class="text-red-500 font-semibold mr-1">{{ e.ocorrencias_disciplinares }}⚠</span>
                  <span v-if="e.ocorrencias_elogios > 0" class="text-emerald-500 font-semibold">{{ e.ocorrencias_elogios }}★</span>
                  <span v-if="!e.ocorrencias_disciplinares && !e.ocorrencias_elogios" class="text-slate-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <Button label="Fechar" severity="secondary" outlined @click="modalEspelho = false" />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>
