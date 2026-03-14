<script setup lang="ts">
definePageMeta({ layout: 'default' })
const toast          = useToast()
const colaboradores  = ref<any[]>([])
const alocacoesColab = ref<any[]>([])
const feriados       = ref<any[]>([])
const registros      = ref<any[]>([])
const total          = ref(0)
const loading        = ref(false)
const saving         = ref(false)
const modalFeriado   = ref(false)
const filtros = ref({ colaborador_id:'', escala_tipo:'', gera_pagamento:'' })

const escalaTipoOpts = [
  { label: '12x36 — sem pagamento adicional', value: '12x36' },
  { label: 'Outras escalas — pago em folha',  value: 'outros' },
]

const form = ref<any>({
  colaborador_id:'', alocacao_id:'', feriado_id:'',
  data_trabalho:'', horas_trabalhadas:8, escala_tipo:'', observacoes:''
})

const toStr = (v: any) => {
  if (!v) return null
  if (typeof v === 'string') return v
  const d = v as Date
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

onMounted(async () => {
  loading.value = true
  const [rc, rf] = await Promise.all([
    $fetch<any>('/api/colaboradores', { params: { per_page: 200 } }),
    $fetch<any>('/api/escalas/feriados', { params: { per_page: 100 } }),
  ])
  colaboradores.value = rc.data ?? []
  feriados.value = rf.data ?? []
  await buscar()
})

watch(() => form.value.colaborador_id, async (id) => {
  if (!id) { alocacoesColab.value = []; return }
  const ra = await $fetch<any>('/api/colaboradores/alocacoes', { params: { colaborador_id: id, status: 'ativo' } })
  alocacoesColab.value = ra.data ?? []
  form.value.alocacao_id = alocacoesColab.value[0]?.id ?? ''
  // Pré-seleciona a escala da alocação principal se disponível
  const principal = alocacoesColab.value.find((a: any) => a.principal)
  if (principal?.sgo_escalas?.tipo) {
    form.value.escala_tipo = principal.sgo_escalas.tipo === '12x36' ? '12x36' : 'outros'
  }
})

const alocacaoOpts = computed(() =>
  alocacoesColab.value.map(a => ({
    label: `${a.sgo_postos?.nome ?? a.posto_id} — ${a.sgo_funcoes?.nome ?? a.funcao_id}`,
    value: a.id
  }))
)
const colaboradorOpts = computed(() => colaboradores.value.map(c => ({ label: c.nome, value: c.id })))
const feriadoOpts = computed(() => [
  { label: 'Feriado não cadastrado no sistema', value: '' },
  ...feriados.value.map(f => ({
    label: `${f.nome} — ${new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR')}`,
    value: f.id
  }))
])

async function buscar() {
  loading.value = true
  try {
    const p: any = {}
    if (filtros.value.colaborador_id) p.colaborador_id = filtros.value.colaborador_id
    if (filtros.value.escala_tipo)    p.escala_tipo    = filtros.value.escala_tipo
    const res = await $fetch<any>('/api/operacao/feriados-trabalhados', { params: p })
    registros.value = res.data ?? []
    total.value = res.total ?? 0
  } finally { loading.value = false }
}

function abrirNovoRegistro() {
  form.value = { colaborador_id:'', alocacao_id:'', feriado_id:'', data_trabalho:'', horas_trabalhadas:8, escala_tipo:'', observacoes:'' }
  modalFeriado.value = true
}

async function salvar() {
  if (!form.value.colaborador_id || !form.value.alocacao_id || !form.value.data_trabalho || !form.value.escala_tipo) {
    toast.add({ severity:'warn', summary:'Preencha colaborador, alocação, data e tipo de escala.', life:3000 }); return
  }
  saving.value = true
  try {
    await $fetch('/api/operacao/feriados-trabalhados', {
      method: 'POST',
      body: {
        ...form.value,
        data_trabalho: toStr(form.value.data_trabalho),
        feriado_id:    form.value.feriado_id || null,
      }
    })
    modalFeriado.value = false
    toast.add({ severity:'success', summary:'Feriado trabalhado registrado.', life:3000 })
    await buscar()
  } catch (e: any) {
    toast.add({ severity:'error', summary: e?.data?.message ?? 'Erro.', life:4000 })
  } finally { saving.value = false }
}

// KPIs
const totalGeramPagamento = computed(() => registros.value.filter(r => r.gera_pagamento).length)
const total12x36          = computed(() => registros.value.filter(r => r.escala_tipo === '12x36').length)
</script>

<template>
  <div>
    <SgoPageHeader title="Feriados Trabalhados" subtitle="Apontamento operacional de feriados trabalhados por escala." icon="pi-sun">
      <template #actions>
        <Button label="Registrar" icon="pi pi-plus" size="small" @click="abrirNovoRegistro" />
      </template>
    </SgoPageHeader>

    <!-- Aviso informativo -->
    <div class="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-4 flex items-start gap-3">
      <i class="pi pi-info-circle text-blue-500 mt-0.5 shrink-0" />
      <div class="text-sm text-blue-700">
        <p class="font-semibold mb-0.5">Como funciona o apontamento de feriados trabalhados</p>
        <p>Escala <strong>12x36</strong>: o feriado já está coberto pela escala — <strong>não gera pagamento adicional</strong>.</p>
        <p>Demais escalas: o colaborador tem direito ao pagamento — o <strong>valor é calculado pela folha de pagamento</strong>, não registrado aqui.</p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-3 gap-4 mb-4">
      <SgoStatCard title="Total apontamentos"  :value="total"               icon="pi-calendar"    icon-bg="bg-slate-50"   icon-color="#64748b" />
      <SgoStatCard title="Geram pagamento"     :value="totalGeramPagamento" icon="pi-money-bill"  icon-bg="bg-emerald-50" icon-color="#059669" />
      <SgoStatCard title="Escala 12x36"        :value="total12x36"          icon="pi-clock"       icon-bg="bg-slate-50"   icon-color="#64748b" />
    </div>

    <!-- Filtros -->
    <div class="sgo-card mb-4 flex flex-wrap gap-3 items-end">
      <SgoFormField label="Colaborador" field-id="ft_c" class="w-56">
        <Select id="ft_c" v-model="filtros.colaborador_id"
          :options="[{label:'Todos',value:''},...colaboradorOpts]"
          option-label="label" option-value="value" class="w-full" />
      </SgoFormField>
      <SgoFormField label="Tipo de escala" field-id="ft_e" class="w-52">
        <Select id="ft_e" v-model="filtros.escala_tipo"
          :options="[{label:'Todas as escalas',value:''},...escalaTipoOpts]"
          option-label="label" option-value="value" class="w-full" />
      </SgoFormField>
      <Button label="Buscar" icon="pi pi-search" @click="buscar" />
    </div>

    <!-- Lista -->
    <div v-if="loading" class="flex justify-center py-12">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
    </div>
    <SgoEmptyState v-else-if="!registros.length" icon="pi-sun"
      title="Nenhum feriado trabalhado registrado"
      description="Nenhum apontamento para os filtros selecionados." />
    <div v-else class="sgo-card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Colaborador</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Posto</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Data</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Feriado</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Horas</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Escala</th>
            <th class="text-left px-4 py-3 text-slate-500 font-semibold">Pagamento</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="r in registros" :key="r.id" class="hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3">
              <p class="font-semibold text-slate-800">{{ r.sgo_colaboradores?.nome }}</p>
              <p class="text-xs text-slate-400">{{ r.sgo_colaboradores?.matricula }}</p>
            </td>
            <td class="px-4 py-3 text-slate-600">
              {{ r.sgo_alocacoes?.sgo_postos?.nome }}
              <br><span class="text-xs text-slate-400">{{ r.sgo_alocacoes?.sgo_funcoes?.nome }}</span>
            </td>
            <td class="px-4 py-3 text-slate-600">
              {{ new Date(r.data_trabalho + 'T12:00:00').toLocaleDateString('pt-BR') }}
            </td>
            <td class="px-4 py-3 text-slate-500 text-xs">
              {{ r.sgo_feriados?.nome ?? '—' }}
            </td>
            <td class="px-4 py-3 text-slate-600">{{ r.horas_trabalhadas }}h</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold rounded px-2 py-0.5',
                r.escala_tipo === '12x36' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700']">
                {{ r.escala_tipo }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span v-if="r.gera_pagamento" class="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded px-2 py-0.5">
                <i class="pi pi-check mr-1" />Pago em folha
              </span>
              <span v-else class="text-xs text-slate-400 bg-slate-50 rounded px-2 py-0.5">
                Sem adicional
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Registrar -->
    <Dialog v-model:visible="modalFeriado" header="Registrar Feriado Trabalhado" :style="{ width: '500px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Colaborador" field-id="nft_c" class="col-span-2">
          <Select id="nft_c" v-model="form.colaborador_id" :options="colaboradorOpts"
            option-label="label" option-value="value" filter placeholder="Selecione..." class="w-full" />
        </SgoFormField>
        <SgoFormField label="Alocação" field-id="nft_a" class="col-span-2">
          <Select id="nft_a" v-model="form.alocacao_id" :options="alocacaoOpts"
            option-label="label" option-value="value" class="w-full" :disabled="!alocacaoOpts.length" />
        </SgoFormField>
        <SgoFormField label="Data trabalhada" field-id="nft_d">
          <DatePicker id="nft_d" v-model="form.data_trabalho" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Horas trabalhadas" field-id="nft_h">
          <InputNumber id="nft_h" v-model="form.horas_trabalhadas" :min="1" :max="24" :step="0.5" suffix="h" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Feriado (opcional)" field-id="nft_f" class="col-span-2">
          <Select id="nft_f" v-model="form.feriado_id" :options="feriadoOpts"
            option-label="label" option-value="value" class="w-full" />
        </SgoFormField>
        <!-- Seleção de escala como radio cards -->
        <SgoFormField label="Tipo de escala" field-id="nft_e" class="col-span-2">
          <div class="flex gap-3">
            <label v-for="opt in escalaTipoOpts" :key="opt.value"
              :class="['flex-1 flex items-start gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all',
                form.escala_tipo === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300']"
              @click="form.escala_tipo = opt.value">
              <RadioButton class="mt-0.5" :model-value="form.escala_tipo" :value="opt.value" />
              <div>
                <p class="text-sm font-semibold text-slate-700">{{ opt.value === '12x36' ? '12x36' : 'Outras escalas' }}</p>
                <p class="text-xs text-slate-400 mt-0.5">
                  {{ opt.value === '12x36' ? 'Sem adicional — coberto pela escala' : 'Direito a pagamento em folha' }}
                </p>
              </div>
            </label>
          </div>
        </SgoFormField>
        <!-- Aviso conforme escala selecionada -->
        <div v-if="form.escala_tipo === '12x36'" class="col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
          <i class="pi pi-info-circle mr-2 text-slate-400" />Escala 12x36: feriado já compensado na escala. Nenhum pagamento adicional será gerado.
        </div>
        <div v-else-if="form.escala_tipo === 'outros'" class="col-span-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          <i class="pi pi-check-circle mr-2" />Este apontamento será considerado na <strong>folha de pagamento</strong> para cálculo do adicional de feriado.
        </div>
        <SgoFormField label="Observações" field-id="nft_o" class="col-span-2">
          <Textarea id="nft_o" v-model="form.observacoes" rows="2" class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalFeriado = false" />
          <Button label="Registrar" :loading="saving" @click="salvar" />
        </div>
      </template>
    </Dialog>
    <Toast />
  </div>
</template>