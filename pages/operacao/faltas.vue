<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store      = useOperacaoStore()
const toast      = useToast()
const isMounted  = ref(false)

const modalFalta    = ref(false)
const modalCancelar = ref(false)
const faltaSelecionada = ref<any>(null)
const colaboradores  = ref<any[]>([])
const alocacoesColab = ref<any[]>([])

const filtros = ref<{
  colaborador_id: string
  tipo: string
  status: string
  data_inicio: Date | null
  data_fim: Date | null
}>({ colaborador_id: '', tipo: '', status: '', data_inicio: null, data_fim: null })

const tipoOpts = [
  { label: 'Injustificada',          value: 'injustificada' },
  { label: 'Justificada (atestado)', value: 'justificada' },
  { label: 'Abonada',                value: 'abonada' },
  { label: 'Suspensão disciplinar',  value: 'suspensao_disciplinar' },
  { label: 'Atraso parcial',         value: 'atraso_parcial' },
]
const tipoColor: Record<string, string> = {
  injustificada:        'bg-red-100 text-red-700',
  justificada:          'bg-blue-100 text-blue-700',
  abonada:              'bg-green-100 text-green-700',
  suspensao_disciplinar:'bg-purple-100 text-purple-700',
  atraso_parcial:       'bg-amber-100 text-amber-700',
}
const tipoLabel: Record<string, string> = {
  injustificada:'Injustificada', justificada:'Justificada', abonada:'Abonada',
  suspensao_disciplinar:'Suspensão', atraso_parcial:'Atraso parcial',
}

const form = ref<any>({
  colaborador_id:'', alocacao_id:'', data_falta:null,
  tipo:'injustificada', horas_falta:8, observacoes:''
})

// Estado de exibição desacoplado do loading — evita patch em nó nulo
const faltas        = ref<any[]>([])
const totalFaltas   = ref(0)
const carregando    = ref(false)

const toStr = (v: any) => {
  if (!v) return null
  if (typeof v === 'string') return v
  const d = v as Date
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

onUnmounted(() => { isMounted.value = false })

onMounted(async () => {
  isMounted.value = true
  const res = await $fetch<any>('/api/colaboradores', { params: { per_page: 200 } })
  if (!isMounted.value) return
  colaboradores.value = res.data ?? []
  await buscar()
})

watch(() => form.value.colaborador_id, async (id) => {
  alocacoesColab.value = []
  form.value.alocacao_id = ''
  if (!id) return
  try {
    const res = await $fetch<any>('/api/colaboradores/alocacoes', { params: { colaborador_id: id } })
    if (!isMounted.value) return
    alocacoesColab.value = res.data ?? []
    form.value.alocacao_id = alocacoesColab.value[0]?.id ?? ''
  } catch { alocacoesColab.value = [] }
})

const alocacaoOpts = computed(() =>
  alocacoesColab.value.map(a => ({
    label: `${a.sgo_postos?.nome ?? a.posto_id} — ${a.sgo_funcoes?.nome ?? a.funcao_id}`,
    value: a.id
  }))
)
const colaboradorOpts = computed(() =>
  colaboradores.value.map(c => ({ label: c.nome, value: c.id }))
)

async function buscar() {
  carregando.value = true
  // Limpa lista antes de buscar — evita patch em lista stale
  faltas.value = []
  await nextTick()
  try {
    const p: any = {}
    if (filtros.value.colaborador_id) p.colaborador_id = filtros.value.colaborador_id
    if (filtros.value.tipo)           p.tipo           = filtros.value.tipo
    if (filtros.value.status)         p.status         = filtros.value.status
    if (filtros.value.data_inicio)    p.data_inicio    = toStr(filtros.value.data_inicio)
    if (filtros.value.data_fim)       p.data_fim       = toStr(filtros.value.data_fim)
    const res = await $fetch<any>('/api/operacao/faltas', { params: p })
    if (!isMounted.value) return
    await nextTick()
    faltas.value     = res.data ?? []
    totalFaltas.value = res.total ?? 0
  } catch (e: any) {
    toast.add({ severity:'error', summary: e?.data?.message ?? 'Erro ao buscar faltas.', life:4000 })
  } finally {
    if (isMounted.value) carregando.value = false
  }
}

function abrirNovaFalta() {
  form.value = { colaborador_id:'', alocacao_id:'', data_falta:null, tipo:'injustificada', horas_falta:8, observacoes:'' }
  alocacoesColab.value = []
  modalFalta.value = true
}

async function salvar() {
  if (!form.value.colaborador_id || !form.value.alocacao_id || !form.value.data_falta) {
    toast.add({ severity:'warn', summary:'Preencha colaborador, alocação e data.', life:3000 }); return
  }
  try {
    await store.registrarFalta({ ...form.value, data_falta: toStr(form.value.data_falta) })
    modalFalta.value = false
    toast.add({ severity:'success', summary:'Falta registrada.', life:3000 })
    await buscar()
  } catch {
    toast.add({ severity:'error', summary: store.error ?? 'Erro ao registrar falta.', life:4000 })
  }
}

function confirmarCancelar(f: any) { faltaSelecionada.value = f; modalCancelar.value = true }

async function cancelarFalta() {
  try {
    await store.cancelarFalta(faltaSelecionada.value.id)
    modalCancelar.value = false
    toast.add({ severity:'success', summary:'Falta cancelada.', life:3000 })
    await buscar()
  } catch {
    toast.add({ severity:'error', summary: store.error ?? 'Erro ao cancelar.', life:4000 })
  }
}

const injustificadas = computed(() => faltas.value.filter(f => f.tipo === 'injustificada').length)
const justificadas   = computed(() => faltas.value.filter(f => f.tipo === 'justificada').length)
</script>

<template>
  <div>
    <SgoPageHeader title="Faltas" subtitle="Registro de faltas por colaborador." icon="pi-user-minus">
      <template #actions>
        <Button label="Registrar falta" icon="pi pi-plus" size="small" @click="abrirNovaFalta" />
      </template>
    </SgoPageHeader>

    <!-- Filtros -->
    <div class="sgo-card mb-4 flex flex-wrap gap-3 items-end">
      <SgoFormField label="Colaborador" field-id="ff_c" class="w-56">
        <Select id="ff_c" v-model="filtros.colaborador_id"
          :options="[{label:'Todos',value:''},...colaboradorOpts]"
          option-label="label" option-value="value" class="w-full" />
      </SgoFormField>
      <SgoFormField label="Tipo" field-id="ff_t" class="w-48">
        <Select id="ff_t" v-model="filtros.tipo"
          :options="[{label:'Todos',value:''},...tipoOpts]"
          option-label="label" option-value="value" class="w-full" />
      </SgoFormField>
      <SgoFormField label="De" field-id="ff_di" class="w-36">
        <DatePicker id="ff_di" v-model="filtros.data_inicio" date-format="dd/mm/yy" show-icon class="w-full" />
      </SgoFormField>
      <SgoFormField label="Até" field-id="ff_df" class="w-36">
        <DatePicker id="ff_df" v-model="filtros.data_fim" date-format="dd/mm/yy" show-icon class="w-full" />
      </SgoFormField>
      <Button label="Buscar" icon="pi pi-search" @click="buscar" />
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-3 gap-4 mb-4">
      <SgoStatCard title="Total de faltas"  :value="totalFaltas"    icon="pi-user-minus"  icon-bg="bg-red-50"  icon-color="#dc2626" />
      <SgoStatCard title="Injustificadas"   :value="injustificadas" icon="pi-times-circle" icon-bg="bg-red-50"  icon-color="#dc2626" />
      <SgoStatCard title="Justificadas"     :value="justificadas"   icon="pi-check-circle" icon-bg="bg-blue-50" icon-color="#2563eb" />
    </div>

    <!-- Lista -->
    <div v-if="carregando" class="flex justify-center py-12">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
    </div>
    <template v-else>
      <SgoEmptyState v-if="!faltas.length" icon="pi-check"
        title="Nenhuma falta encontrada"
        description="Nenhum registro para os filtros selecionados." />
      <div v-else class="sgo-card overflow-hidden p-0">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="text-left px-4 py-3 text-slate-500 font-semibold">Colaborador</th>
              <th class="text-left px-4 py-3 text-slate-500 font-semibold">Posto</th>
              <th class="text-left px-4 py-3 text-slate-500 font-semibold">Data</th>
              <th class="text-left px-4 py-3 text-slate-500 font-semibold">Tipo</th>
              <th class="text-left px-4 py-3 text-slate-500 font-semibold">Horas</th>
              <th class="text-left px-4 py-3 text-slate-500 font-semibold">Status</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="f in faltas" :key="f.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-800">{{ f.colaborador_nome }}</p>
                <p class="text-xs text-slate-400">{{ f.matricula }}</p>
              </td>
              <td class="px-4 py-3 text-slate-600">
                {{ f.posto_nome }}<br>
                <span class="text-xs text-slate-400">{{ f.funcao_nome }}</span>
              </td>
              <td class="px-4 py-3 text-slate-600">
                {{ new Date(f.data_falta + 'T12:00:00').toLocaleDateString('pt-BR') }}
              </td>
              <td class="px-4 py-3">
                <span :class="['text-xs font-semibold rounded px-2 py-0.5', tipoColor[f.tipo]]">
                  {{ tipoLabel[f.tipo] }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ f.horas_falta }}h</td>
              <td class="px-4 py-3">
                <SgoBadge :status="f.status" small />
              </td>
              <td class="px-4 py-3">
                <button v-if="f.status === 'registrada'"
                  class="text-xs text-red-400 hover:text-red-600 font-medium"
                  @click="confirmarCancelar(f)">
                  Cancelar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Modal Registrar Falta -->
    <Dialog v-model:visible="modalFalta" header="Registrar Falta" :style="{ width: '480px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Colaborador" field-id="nf_c" class="col-span-2">
          <Select id="nf_c" v-model="form.colaborador_id" :options="colaboradorOpts"
            option-label="label" option-value="value" filter placeholder="Selecione..." class="w-full" />
        </SgoFormField>
        <SgoFormField label="Alocação" field-id="nf_a" class="col-span-2">
          <Select id="nf_a" v-model="form.alocacao_id" :options="alocacaoOpts"
            option-label="label" option-value="value"
            placeholder="Selecione o colaborador primeiro"
            class="w-full" :disabled="!alocacaoOpts.length" />
        </SgoFormField>
        <SgoFormField label="Data da falta" field-id="nf_d">
          <DatePicker id="nf_d" v-model="form.data_falta" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Tipo" field-id="nf_t">
          <Select id="nf_t" v-model="form.tipo" :options="tipoOpts"
            option-label="label" option-value="value" class="w-full" />
        </SgoFormField>
        <SgoFormField v-if="form.tipo === 'atraso_parcial'" label="Horas de falta" field-id="nf_h" class="col-span-2">
          <InputNumber id="nf_h" v-model="form.horas_falta" :min="0.5" :max="7.5" :step="0.5" suffix="h" class="w-full" />
        </SgoFormField>
        <div v-if="form.tipo === 'suspensao_disciplinar'"
          class="col-span-2 rounded-lg bg-purple-50 border border-purple-200 p-3 text-sm text-purple-700">
          <i class="pi pi-info-circle mr-2" />Uma ocorrência de suspensão será criada automaticamente.
        </div>
        <SgoFormField label="Observações" field-id="nf_o" class="col-span-2">
          <Textarea id="nf_o" v-model="form.observacoes" rows="2" class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalFalta = false" />
          <Button label="Registrar" :loading="store.saving" @click="salvar" />
        </div>
      </template>
    </Dialog>

    <!-- Confirmar cancelamento -->
    <Dialog v-model:visible="modalCancelar" header="Cancelar falta" :style="{ width: '400px' }" modal>
      <p class="text-slate-600">
        Deseja cancelar a falta de
        <strong>{{ faltaSelecionada?.colaborador_nome }}</strong> em
        {{ faltaSelecionada?.data_falta
          ? new Date(faltaSelecionada.data_falta + 'T12:00:00').toLocaleDateString('pt-BR')
          : '' }}?
      </p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Não" severity="secondary" outlined @click="modalCancelar = false" />
          <Button label="Sim, cancelar" severity="danger" :loading="store.saving" @click="cancelarFalta" />
        </div>
      </template>
    </Dialog>

    <Toast />
  </div>
</template>