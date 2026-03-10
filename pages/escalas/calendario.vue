<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store = useEscalasStore()
const colaboradoresStore = useColaboradoresStore()
const competenciaStore = useCompetenciaStore()
const toast = useToast()

const competencia = ref(competenciaStore.atual?.competencia ?? '')
const filtroPostoId = ref('')
const filtroEscalaId = ref('')
const colaboradoresSelecionados = ref<string[]>([])

const cadastros = useCadastrosStore()
onMounted(async () => {
  await cadastros.listarPostos({ status: 'ativo' })
  await store.listarEscalas({ status: 'ativo' })
  if (competencia.value) await carregarCalendario()
})

async function carregarCalendario() {
  if (!competencia.value) return
  await store.listarCalendario({ competencia: competencia.value, posto_id: filtroPostoId.value || undefined, escala_id: filtroEscalaId.value || undefined })
}

// Agrupar por colaborador
const porColaborador = computed(() => {
  const mapa: Record<string, { colab: any; dias: any[] }> = {}
  for (const d of store.calendario) {
    if (!mapa[d.colaborador_id]) mapa[d.colaborador_id] = { colab: d.colaborador, dias: [] }
    mapa[d.colaborador_id].dias.push(d)
  }
  return Object.values(mapa)
})

// Dias do mês
const diasMes = computed(() => {
  if (!competencia.value) return []
  const [ano, mes] = competencia.value.split('-').map(Number)
  const total = new Date(ano, mes, 0).getDate()
  return Array.from({ length: total }, (_, i) => i + 1)
})

// Gerar calendário
const modalGerar = ref(false)
const gerarEscalaId = ref('')
const gerarColabIds = ref<string[]>([])
const colabOpts = computed(() => colaboradoresStore.colaboradores.map(c => ({ label: c.nome, value: c.id })))

async function abrirGerar() {
  await colaboradoresStore.listarColaboradores({ status: 'ativo' })
  gerarEscalaId.value = ''; gerarColabIds.value = []; modalGerar.value = true
}

async function confirmarGerar() {
  if (!gerarEscalaId.value || !gerarColabIds.value.length) return
  try {
    const res = await store.gerarCalendario({ competencia: competencia.value, escala_id: gerarEscalaId.value, colaborador_ids: gerarColabIds.value })
    toast.add({ severity: 'success', summary: `Calendário gerado: ${(res as any).gerados} dias para ${(res as any).colaboradores} colaborador(es).`, life: 4000 })
    modalGerar.value = false; await carregarCalendario()
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro ao gerar.', life: 4000 }) }
}

// Ajuste de dia (RF-033)
const modalAjuste = ref(false)
const diaAjuste = ref<any>(null)
const tipoAjusteOpts = [
  { label: 'Normal', value: 'normal' }, { label: 'Folga', value: 'folga' },
  { label: 'Feriado', value: 'feriado' }, { label: 'Férias', value: 'ferias' },
  { label: 'Afastamento', value: 'afastamento' }, { label: 'Outros', value: 'outros' }
]
const ajusteForm = ref<any>({ tipo_dia: '', observacoes: '' })

function abrirAjuste(dia: any) { diaAjuste.value = dia; ajusteForm.value = { tipo_dia: dia.tipo_dia, observacoes: dia.observacoes ?? '' }; modalAjuste.value = true }

async function confirmarAjuste() {
  try {
    await store.ajustarDia(diaAjuste.value.id, ajusteForm.value)
    toast.add({ severity: 'success', summary: 'Dia ajustado.', life: 3000 })
    modalAjuste.value = false
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

const tipoCorMap: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  folga: 'bg-slate-100 text-slate-500',
  feriado: 'bg-amber-100 text-amber-600',
  feriado_trabalhado: 'bg-orange-100 text-orange-600',
  ferias: 'bg-blue-100 text-blue-600',
  afastamento: 'bg-purple-100 text-purple-600',
  outros: 'bg-slate-100 text-slate-400',
}
const tipoSigla: Record<string, string> = {
  normal: 'N', folga: 'F', feriado: 'FER', feriado_trabalhado: 'FT',
  ferias: 'FÉR', afastamento: 'AFT', outros: '?'
}

const postoOpts = computed(() => [{ label: 'Todos os postos', value: '' }, ...cadastros.postos.map(p => ({ label: p.nome, value: p.id }))])
const escalaOpts = computed(() => [{ label: 'Todas as escalas', value: '' }, ...store.escalas.map(e => ({ label: e.nome, value: e.id }))])

const mesesOpts = computed(() => {
  const hoje = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 6 + i)
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return { label: label.charAt(0).toUpperCase() + label.slice(1), value: val }
  })
})
</script>

<template>
  <div>
    <SgoPageHeader title="Calendário" subtitle="Calendário de escalas por competência." icon="pi-calendar">
      <template #actions>
        <Button label="Gerar calendário" icon="pi pi-magic-wand" size="small" @click="abrirGerar" />
      </template>
    </SgoPageHeader>

    <!-- Filtros -->
    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <Select v-model="competencia" :options="mesesOpts" option-label="label" option-value="value" placeholder="Competência" class="w-52" @change="carregarCalendario" />
        <Select v-model="filtroPostoId" :options="postoOpts" option-label="label" option-value="value" class="w-44" @change="carregarCalendario" />
        <Select v-model="filtroEscalaId" :options="escalaOpts" option-label="label" option-value="value" class="w-44" @change="carregarCalendario" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="store.loading" @click="carregarCalendario" />
      </div>
    </div>

    <!-- Calendário grade -->
    <div v-if="!competencia" class="sgo-card">
      <SgoEmptyState icon="pi-calendar" title="Selecione uma competência" description="Escolha o mês/ano para visualizar o calendário." />
    </div>
    <div v-else-if="store.loading" class="sgo-card flex items-center justify-center py-12">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
    </div>
    <div v-else-if="!porColaborador.length" class="sgo-card">
      <SgoEmptyState icon="pi-calendar" title="Sem calendário gerado" description="Clique em «Gerar calendário» para criar o calendário desta competência." />
    </div>
    <div v-else class="sgo-card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="text-left px-3 py-2 font-semibold text-slate-600 sticky left-0 bg-slate-50 min-w-[160px]">Colaborador</th>
              <th v-for="d in diasMes" :key="d" class="px-1 py-2 text-center font-semibold text-slate-500 min-w-[32px]">{{ d }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="{ colab, dias } in porColaborador" :key="colab?.id" class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td class="px-3 py-2 sticky left-0 bg-white font-medium text-slate-700 min-w-[160px] border-r border-slate-100">
                <p class="font-semibold text-slate-800 truncate max-w-[150px]">{{ colab?.nome ?? '—' }}</p>
              </td>
              <td v-for="d in diasMes" :key="d" class="px-0.5 py-1 text-center">
                <div v-if="dias.find(x => new Date(x.data).getDate() === d)"
                  :class="['rounded text-[9px] font-bold px-1 py-0.5 cursor-pointer transition-opacity hover:opacity-70 relative',
                    tipoCorMap[dias.find(x => new Date(x.data).getDate() === d)!.tipo_dia]]"
                  :title="`${dias.find(x => new Date(x.data).getDate() === d)!.tipo_dia}${dias.find(x => new Date(x.data).getDate() === d)!.ajustado ? ' (ajustado)' : ''}`"
                  @click="abrirAjuste(dias.find(x => new Date(x.data).getDate() === d))">
                  {{ tipoSigla[dias.find(x => new Date(x.data).getDate() === d)!.tipo_dia] }}
                  <span v-if="dias.find(x => new Date(x.data).getDate() === d)!.ajustado" class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full" title="Ajustado manualmente" />
                </div>
                <div v-else class="text-slate-200 text-[9px] text-center">—</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Legenda -->
      <div class="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs">
        <span v-for="(cor, tipo) in tipoCorMap" :key="tipo" class="flex items-center gap-1">
          <span :class="['rounded px-1.5 py-0.5 font-bold', cor]">{{ tipoSigla[tipo] }}</span>
          <span class="text-slate-500 capitalize">{{ tipo.replace('_', ' ') }}</span>
        </span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 bg-amber-400 rounded-full inline-block" /><span class="text-slate-500">Ajustado</span></span>
      </div>
    </div>

    <!-- Modal Gerar -->
    <Dialog v-model:visible="modalGerar" header="Gerar Calendário" :style="{ width: '500px' }" modal>
      <div class="space-y-4 py-1">
        <div class="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          <i class="pi pi-info-circle mr-2" />
          Gera os dias da competência <strong>{{ competencia }}</strong> com base na escala e turnos selecionados. Dias já ajustados manualmente serão preservados.
        </div>
        <SgoFormField label="Escala" field-id="g_esc">
          <Select id="g_esc" v-model="gerarEscalaId" :options="store.escalas.filter(e => e.status === 'ativo').map(e => ({ label: e.nome, value: e.id }))" option-label="label" option-value="value" placeholder="Selecione a escala" />
        </SgoFormField>
        <SgoFormField label="Colaboradores" field-id="g_col">
          <MultiSelect id="g_col" v-model="gerarColabIds" :options="colabOpts" option-label="label" option-value="value" placeholder="Selecione os colaboradores" filter display="chip" class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 pt-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalGerar = false" />
          <Button label="Gerar" icon="pi pi-magic-wand" :loading="store.saving" :disabled="!gerarEscalaId || !gerarColabIds.length" @click="confirmarGerar" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Ajuste (RF-033 — capacidade crítica) -->
    <Dialog v-model:visible="modalAjuste" header="Ajustar Dia" :style="{ width: '400px' }" modal>
      <div class="space-y-3 py-1">
        <div v-if="diaAjuste" class="text-sm text-slate-600">
          <p><span class="text-slate-400">Colaborador:</span> <strong>{{ diaAjuste.colaborador?.nome }}</strong></p>
          <p><span class="text-slate-400">Data:</span> {{ new Date(diaAjuste.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) }}</p>
        </div>
        <SgoFormField label="Tipo do dia" field-id="aj_tipo">
          <Select id="aj_tipo" v-model="ajusteForm.tipo_dia" :options="tipoAjusteOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Observações" field-id="aj_obs">
          <Textarea id="aj_obs" v-model="ajusteForm.observacoes" rows="2" class="w-full" placeholder="Motivo do ajuste (opcional)" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 pt-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalAjuste = false" />
          <Button label="Salvar ajuste" :loading="store.saving" @click="confirmarAjuste" />
        </div>
      </template>
    </Dialog>

    <Toast />
  </div>
</template>
