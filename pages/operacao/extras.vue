<script setup lang="ts">
definePageMeta({ layout: 'default' })
const isMounted = ref(false)
const store      = useOperacaoStore()
const toast      = useToast()
const { me }     = useAuthStore()

const colaboradores  = ref<any[]>([])
const alocacoesColab = ref<any[]>([])
const faltasColab    = ref<any[]>([])
const modalExtra     = ref(false)
const modalAcao      = ref(false)
const extraSelecionado = ref<any>(null)
const acaoAtual      = ref('')
const motivoRecusa   = ref('')
const filtros = ref({ colaborador_id: '', status: '', data_inicio: '', data_fim: '' })

const motivoOpts = [
  { label: 'Cobertura de falta',   value: 'cobertura_falta' },
  { label: 'Demanda do cliente',   value: 'demanda_cliente' },
  { label: 'Escala especial',      value: 'escala_especial' },
  { label: 'Outro',                value: 'outro' },
]
const statusOpts = [
  { label: 'Pendente',            value: 'pendente' },
  { label: 'Aprovado Operação',   value: 'aprovado_operacao' },
  { label: 'Aprovado RH',         value: 'aprovado_rh' },
  { label: 'Recusado',            value: 'recusado' },
  { label: 'Cancelado',           value: 'cancelado' },
]
const statusColor: Record<string, string> = {
  pendente:          'bg-amber-100 text-amber-700',
  aprovado_operacao: 'bg-blue-100 text-blue-700',
  aprovado_rh:       'bg-emerald-100 text-emerald-700',
  recusado:          'bg-red-100 text-red-700',
  cancelado:         'bg-slate-100 text-slate-500',
}
const statusLabel: Record<string, string> = {
  pendente:'Pendente', aprovado_operacao:'Aprovado Op.', aprovado_rh:'Aprovado RH',
  recusado:'Recusado', cancelado:'Cancelado',
}

const form = ref<any>({ colaborador_id:'', alocacao_id:'', data_extra:'', horas:1, motivo:'outro', falta_id:'', descricao:'' })

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
  colaboradores.value = res.data ?? []
  await store.listarExtras()
})

watch(() => form.value.colaborador_id, async (id) => {
  if (!id) { alocacoesColab.value = []; faltasColab.value = []; return }
  const ra = await $fetch<any>('/api/colaboradores/alocacoes', { params: { colaborador_id: id, status: 'ativo' } })
  alocacoesColab.value = ra.data ?? []
  form.value.alocacao_id = alocacoesColab.value[0]?.id ?? ''
  // Busca faltas registradas do colaborador para cobertura
  const rf = await $fetch<any>('/api/operacao/faltas', { params: { colaborador_id: id, status: 'registrada' } })
  faltasColab.value = rf.data ?? []
})

const alocacaoOpts = computed(() =>
  alocacoesColab.value.map(a => ({ label: `${a.sgo_postos?.nome ?? a.posto_id} — ${a.sgo_funcoes?.nome ?? a.funcao_id}`, value: a.id }))
)
const colaboradorOpts = computed(() => colaboradores.value.map(c => ({ label: c.nome, value: c.id })))
const faltaOpts = computed(() =>
  faltasColab.value.map(f => ({ label: `${new Date(f.data_falta + 'T12:00:00').toLocaleDateString('pt-BR')} — ${f.tipo}`, value: f.id }))
)

async function buscar() {
  const p: any = {}
  if (filtros.value.colaborador_id) p.colaborador_id = filtros.value.colaborador_id
  if (filtros.value.status)         p.status         = filtros.value.status
  if (filtros.value.data_inicio)    p.data_inicio    = toStr(filtros.value.data_inicio)
  if (filtros.value.data_fim)       p.data_fim       = toStr(filtros.value.data_fim)
  await store.listarExtras(p)
}

function abrirNovoExtra() {
  form.value = { colaborador_id:'', alocacao_id:'', data_extra:'', horas:1, motivo:'outro', falta_id:'', descricao:'' }
  modalExtra.value = true
}

async function salvar() {
  if (!form.value.colaborador_id || !form.value.alocacao_id || !form.value.data_extra) {
    toast.add({ severity:'warn', summary:'Preencha colaborador, alocação e data.', life:3000 }); return
  }
  if (form.value.motivo === 'cobertura_falta' && !form.value.falta_id) {
    toast.add({ severity:'warn', summary:'Selecione a falta que está sendo coberta.', life:3000 }); return
  }
  try {
    await store.registrarExtra({ ...form.value, data_extra: toStr(form.value.data_extra) })
    modalExtra.value = false
    const msg = form.value.motivo === 'cobertura_falta'
      ? 'Extra registrado e aprovado automaticamente (cobertura de falta).'
      : 'Extra registrado. Aguardando aprovação da operação.'
    toast.add({ severity:'success', summary: msg, life:4000 })
    await buscar()
  } catch { toast.add({ severity:'error', summary: store.error ?? 'Erro.', life:4000 }) }
}

function abrirAcao(extra: any, acao: string) {
  extraSelecionado.value = extra
  acaoAtual.value = acao
  motivoRecusa.value = ''
  modalAcao.value = true
}

async function confirmarAcao() {
  try {
    await store.acaoExtra(extraSelecionado.value.id, acaoAtual.value, motivoRecusa.value)
    modalAcao.value = false
    toast.add({ severity:'success', summary:'Ação realizada com sucesso.', life:3000 })
    await buscar()
  } catch { toast.add({ severity:'error', summary: store.error ?? 'Erro.', life:4000 }) }
}

const acaoLabel: Record<string, string> = {
  aprovar_operacao: 'Aprovar (Operação)',
  aprovar_rh:       'Homologar (RH)',
  recusar:          'Recusar',
  cancelar:         'Cancelar',
}
const pendentes = computed(() => store.extras.filter(e => e.status === 'pendente').length)
const aguardandoRH = computed(() => store.extras.filter(e => e.status === 'aprovado_operacao').length)
</script>

<template>
  <div>
    <SgoPageHeader title="Horas Extras" subtitle="Registro e aprovação de horas extras." icon="pi-plus-circle">
      <template #actions>
        <Button label="Registrar extra" icon="pi pi-plus" size="small" @click="abrirNovoExtra" />
      </template>
    </SgoPageHeader>

    <div class="grid grid-cols-4 gap-4 mb-4">
      <SgoStatCard title="Total"             :value="store.totalExtras"  icon="pi-list"         icon-bg="bg-slate-50"   icon-color="#64748b" />
      <SgoStatCard title="Pendentes"         :value="pendentes"          icon="pi-clock"        icon-bg="bg-amber-50"   icon-color="#d97706" />
      <SgoStatCard title="Aguard. RH"        :value="aguardandoRH"       icon="pi-send"         icon-bg="bg-blue-50"    icon-color="#2563eb" />
      <SgoStatCard title="Aprovados"         :value="store.extras.filter(e=>e.status==='aprovado_rh').length" icon="pi-check-circle" icon-bg="bg-emerald-50" icon-color="#059669" />
    </div>

    <!-- Filtros -->
    <div class="sgo-card mb-4 flex flex-wrap gap-3 items-end">
      <SgoFormField label="Colaborador" field-id="ef_c" class="w-56">
        <Select id="ef_c" v-model="filtros.colaborador_id" :options="[{label:'Todos',value:''},...colaboradorOpts]"
          option-label="label" option-value="value" class="w-full" />
      </SgoFormField>
      <SgoFormField label="Status" field-id="ef_s" class="w-44">
        <Select id="ef_s" v-model="filtros.status" :options="[{label:'Todos',value:''},...statusOpts]"
          option-label="label" option-value="value" class="w-full" />
      </SgoFormField>
      <SgoFormField label="De" field-id="ef_di" class="w-36">
        <DatePicker id="ef_di" v-model="filtros.data_inicio" date-format="dd/mm/yy" show-icon class="w-full" />
      </SgoFormField>
      <SgoFormField label="Até" field-id="ef_df" class="w-36">
        <DatePicker id="ef_df" v-model="filtros.data_fim" date-format="dd/mm/yy" show-icon class="w-full" />
      </SgoFormField>
      <Button label="Buscar" icon="pi pi-search" @click="buscar" />
    </div>

    <div v-if="store.loading" class="flex justify-center py-12">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
    </div>
    <SgoEmptyState v-else-if="!store.extras.length" icon="pi-check" title="Nenhum extra encontrado" description="Nenhum registro para os filtros selecionados." />
    <div v-else class="sgo-card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Colaborador</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Posto</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Data</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Horas</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Motivo</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Status</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="e in store.extras" :key="e.id" class="hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3">
              <p class="font-semibold text-slate-800">{{ e.colaborador_nome }}</p>
              <p class="text-xs text-slate-400">{{ e.matricula }}</p>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ e.posto_nome }}<br><span class="text-xs text-slate-400">{{ e.funcao_nome }}</span></td>
            <td class="px-4 py-3 text-slate-600">{{ new Date(e.data_extra + 'T12:00:00').toLocaleDateString('pt-BR') }}</td>
            <td class="px-4 py-3 font-semibold text-slate-700">{{ e.horas }}h</td>
            <td class="px-4 py-3 text-slate-500 text-xs capitalize">{{ e.motivo.replace('_',' ') }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold rounded px-2 py-0.5', statusColor[e.status]]">{{ statusLabel[e.status] }}</span>
            </td>
            <td class="px-4 py-3">
              <div v-if="e.motivo !== 'cobertura_falta'" class="flex gap-1">
                <button v-if="e.status === 'pendente'"
                  class="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                  @click="abrirAcao(e, 'aprovar_operacao')">Aprovar</button>
                <button v-if="e.status === 'aprovado_operacao'"
                  class="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  @click="abrirAcao(e, 'aprovar_rh')">Homologar RH</button>
                <button v-if="['pendente','aprovado_operacao'].includes(e.status)"
                  class="text-xs text-red-400 hover:text-red-600 font-medium ml-1"
                  @click="abrirAcao(e, 'recusar')">Recusar</button>
              </div>
              <span v-else class="text-xs text-slate-400 italic">Auto-aprovado</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Registrar Extra -->
    <Dialog v-model:visible="modalExtra" header="Registrar Horas Extras" :style="{ width: '500px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Colaborador" field-id="ne_c" class="col-span-2">
          <Select id="ne_c" v-model="form.colaborador_id" :options="colaboradorOpts"
            option-label="label" option-value="value" filter placeholder="Selecione..." class="w-full" />
        </SgoFormField>
        <SgoFormField label="Alocação" field-id="ne_a" class="col-span-2">
          <Select id="ne_a" v-model="form.alocacao_id" :options="alocacaoOpts"
            option-label="label" option-value="value" class="w-full" :disabled="!alocacaoOpts.length" />
        </SgoFormField>
        <SgoFormField label="Data" field-id="ne_d">
          <DatePicker id="ne_d" v-model="form.data_extra" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Horas" field-id="ne_h">
          <InputNumber id="ne_h" v-model="form.horas" :min="0.5" :max="12" :step="0.5" suffix="h" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Motivo" field-id="ne_m" class="col-span-2">
          <Select id="ne_m" v-model="form.motivo" :options="motivoOpts" option-label="label" option-value="value" class="w-full" />
        </SgoFormField>
        <!-- Cobertura de falta: selecionar qual falta -->
        <SgoFormField v-if="form.motivo === 'cobertura_falta'" label="Falta a cobrir" field-id="ne_f" class="col-span-2">
          <Select id="ne_f" v-model="form.falta_id" :options="faltaOpts" option-label="label" option-value="value"
            class="w-full" :placeholder="faltaOpts.length ? 'Selecione a falta' : 'Nenhuma falta registrada'" />
        </SgoFormField>
        <div v-if="form.motivo === 'cobertura_falta'" class="col-span-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          <i class="pi pi-bolt mr-2" />Extra de cobertura de falta é <strong>aprovado automaticamente</strong>, sem necessidade de aprovação.
        </div>
        <SgoFormField label="Descrição" field-id="ne_desc" class="col-span-2">
          <Textarea id="ne_desc" v-model="form.descricao" rows="2" class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalExtra = false" />
          <Button label="Registrar" :loading="store.saving" @click="salvar" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Ação (aprovar/recusar) -->
    <Dialog v-model:visible="modalAcao" :header="acaoLabel[acaoAtual]" :style="{ width: '420px' }" modal>
      <div class="space-y-3 py-1">
        <p class="text-slate-600">
          {{ acaoAtual === 'recusar' ? 'Recusar' : 'Confirmar' }}
          extra de <strong>{{ extraSelecionado?.colaborador_nome }}</strong>
          em {{ extraSelecionado?.data_extra ? new Date(extraSelecionado.data_extra + 'T12:00:00').toLocaleDateString('pt-BR') : '' }}
          ({{ extraSelecionado?.horas }}h)?
        </p>
        <SgoFormField v-if="acaoAtual === 'recusar'" label="Motivo da recusa" field-id="ar_m">
          <Textarea id="ar_m" v-model="motivoRecusa" rows="2" class="w-full" placeholder="Obrigatório" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalAcao = false" />
          <Button :label="acaoAtual === 'recusar' ? 'Confirmar recusa' : 'Confirmar'"
            :severity="acaoAtual === 'recusar' ? 'danger' : 'primary'"
            :loading="store.saving" @click="confirmarAcao" />
        </div>
      </template>
    </Dialog>
    <Toast />
  </div>
</template>
