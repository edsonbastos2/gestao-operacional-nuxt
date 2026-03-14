<script setup lang="ts">
definePageMeta({ layout: 'default' })
const isMounted = ref(false)
const store  = useOperacaoStore()
const toast  = useToast()
const colaboradores  = ref<any[]>([])
const alocacoesColab = ref<any[]>([])
const modalOcorr     = ref(false)
const filtros = ref({ colaborador_id:'', tipo:'', data_inicio:'', data_fim:'' })

const tipoOpts = [
  { label: 'Advertência verbal',   value: 'advertencia_verbal',  icon: 'pi-volume-up',    cor: 'bg-amber-100 text-amber-700' },
  { label: 'Advertência escrita',  value: 'advertencia_escrita', icon: 'pi-file-edit',    cor: 'bg-orange-100 text-orange-700' },
  { label: 'Suspensão',            value: 'suspensao',           icon: 'pi-ban',          cor: 'bg-red-100 text-red-700' },
  { label: 'Elogio / Destaque',    value: 'elogio',              icon: 'pi-star',         cor: 'bg-emerald-100 text-emerald-700' },
  { label: 'Acidente de trabalho', value: 'acidente_trabalho',   icon: 'pi-exclamation-triangle', cor: 'bg-red-200 text-red-800' },
  { label: 'Insubordinação',       value: 'insubordinacao',      icon: 'pi-times',        cor: 'bg-purple-100 text-purple-700' },
  { label: 'Abandono de posto',    value: 'abandono_posto',      icon: 'pi-sign-out',     cor: 'bg-slate-200 text-slate-700' },
]
const tipoMap = Object.fromEntries(tipoOpts.map(t => [t.value, t]))

const form = ref<any>({ colaborador_id:'', alocacao_id:'', data_ocorrencia:'', tipo:'', descricao:'' })

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
  await store.listarOcorrencias()
})

watch(() => form.value.colaborador_id, async (id) => {
  if (!id) { alocacoesColab.value = []; return }
  const ra = await $fetch<any>('/api/colaboradores/alocacoes', { params: { colaborador_id: id, status: 'ativo' } })
  alocacoesColab.value = ra.data ?? []
  form.value.alocacao_id = alocacoesColab.value[0]?.id ?? ''
})

const alocacaoOpts = computed(() =>
  alocacoesColab.value.map(a => ({ label: `${a.sgo_postos?.nome ?? a.posto_id} — ${a.sgo_funcoes?.nome ?? a.funcao_id}`, value: a.id }))
)
const colaboradorOpts = computed(() => colaboradores.value.map(c => ({ label: c.nome, value: c.id })))

async function buscar() {
  const p: any = {}
  if (filtros.value.colaborador_id) p.colaborador_id = filtros.value.colaborador_id
  if (filtros.value.tipo)           p.tipo           = filtros.value.tipo
  if (filtros.value.data_inicio)    p.data_inicio    = toStr(filtros.value.data_inicio)
  if (filtros.value.data_fim)       p.data_fim       = toStr(filtros.value.data_fim)
  await store.listarOcorrencias(p)
}

function abrirNovaOcorrencia() {
  form.value = { colaborador_id:'', alocacao_id:'', data_ocorrencia:'', tipo:'', descricao:'' }
  modalOcorr.value = true
}

async function salvar() {
  if (!form.value.colaborador_id || !form.value.data_ocorrencia || !form.value.tipo || !form.value.descricao?.trim()) {
    toast.add({ severity:'warn', summary:'Preencha todos os campos obrigatórios.', life:3000 }); return
  }
  try {
    await store.registrarOcorrencia({ ...form.value, data_ocorrencia: toStr(form.value.data_ocorrencia) })
    modalOcorr.value = false
    toast.add({ severity:'success', summary:'Ocorrência registrada.', life:3000 })
    await buscar()
  } catch { toast.add({ severity:'error', summary: store.error ?? 'Erro.', life:4000 }) }
}

const elogios = computed(() => store.ocorrencias.filter(o => o.tipo === 'elogio').length)
const disciplinares = computed(() => store.ocorrencias.filter(o => ['advertencia_verbal','advertencia_escrita','suspensao','insubordinacao','abandono_posto'].includes(o.tipo)).length)
</script>

<template>
  <div>
    <SgoPageHeader title="Ocorrências" subtitle="Registro de advertências, elogios e incidentes." icon="pi-exclamation-triangle">
      <template #actions>
        <Button label="Nova ocorrência" icon="pi pi-plus" size="small" @click="abrirNovaOcorrencia" />
      </template>
    </SgoPageHeader>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <SgoStatCard title="Total"          :value="store.totalOcorr"  icon="pi-list"       icon-bg="bg-slate-50"   icon-color="#64748b" />
      <SgoStatCard title="Disciplinares"  :value="disciplinares"     icon="pi-ban"        icon-bg="bg-red-50"     icon-color="#dc2626" />
      <SgoStatCard title="Elogios"        :value="elogios"           icon="pi-star"       icon-bg="bg-emerald-50" icon-color="#059669" />
    </div>

    <div class="sgo-card mb-4 flex flex-wrap gap-3 items-end">
      <SgoFormField label="Colaborador" field-id="of_c" class="w-56">
        <Select id="of_c" v-model="filtros.colaborador_id" :options="[{label:'Todos',value:''},...colaboradorOpts]"
          option-label="label" option-value="value" class="w-full" />
      </SgoFormField>
      <SgoFormField label="Tipo" field-id="of_t" class="w-48">
        <Select id="of_t" v-model="filtros.tipo" :options="[{label:'Todos',value:''},...tipoOpts]"
          option-label="label" option-value="value" class="w-full" />
      </SgoFormField>
      <SgoFormField label="De" field-id="of_di" class="w-36">
        <DatePicker id="of_di" v-model="filtros.data_inicio" date-format="dd/mm/yy" show-icon class="w-full" />
      </SgoFormField>
      <SgoFormField label="Até" field-id="of_df" class="w-36">
        <DatePicker id="of_df" v-model="filtros.data_fim" date-format="dd/mm/yy" show-icon class="w-full" />
      </SgoFormField>
      <Button label="Buscar" icon="pi pi-search" @click="buscar" />
    </div>

    <div v-if="store.loading" class="flex justify-center py-12">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
    </div>
    <SgoEmptyState v-else-if="!store.ocorrencias.length" icon="pi-check" title="Nenhuma ocorrência encontrada" description="Nenhum registro para os filtros selecionados." />
    <div v-else class="space-y-2">
      <div v-for="o in store.ocorrencias" :key="o.id"
        class="sgo-card flex items-start gap-4 hover:shadow-md transition-shadow">
        <div :class="['w-10 h-10 rounded-lg flex items-center justify-center shrink-0', tipoMap[o.tipo]?.cor ?? 'bg-slate-100']">
          <i :class="`pi ${tipoMap[o.tipo]?.icon ?? 'pi-tag'} text-base`" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-bold text-slate-800">{{ o.colaborador_nome }}</p>
            <span :class="['text-xs font-semibold rounded px-2 py-0.5', tipoMap[o.tipo]?.cor ?? 'bg-slate-100']">
              {{ tipoMap[o.tipo]?.label ?? o.tipo }}
            </span>
          </div>
          <p class="text-sm text-slate-600 mt-0.5">{{ o.descricao }}</p>
          <p class="text-xs text-slate-400 mt-1">
            {{ new Date(o.data_ocorrencia + 'T12:00:00').toLocaleDateString('pt-BR') }}
            <span v-if="o.posto_nome"> • {{ o.posto_nome }}</span>
            <span v-if="o.registrado_por"> • Registrado por: {{ o.registrado_por }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Dialog v-model:visible="modalOcorr" header="Registrar Ocorrência" :style="{ width: '500px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Colaborador" field-id="no_c" class="col-span-2">
          <Select id="no_c" v-model="form.colaborador_id" :options="colaboradorOpts"
            option-label="label" option-value="value" filter placeholder="Selecione..." class="w-full" />
        </SgoFormField>
        <SgoFormField label="Alocação (opcional)" field-id="no_a" class="col-span-2">
          <Select id="no_a" v-model="form.alocacao_id" :options="[{label:'Nenhuma',value:''},...alocacaoOpts]"
            option-label="label" option-value="value" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Data" field-id="no_d">
          <DatePicker id="no_d" v-model="form.data_ocorrencia" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Tipo" field-id="no_t">
          <Select id="no_t" v-model="form.tipo" :options="tipoOpts" option-label="label" option-value="value" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Descrição" field-id="no_desc" class="col-span-2">
          <Textarea id="no_desc" v-model="form.descricao" rows="3" class="w-full" placeholder="Descreva o ocorrido..." />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalOcorr = false" />
          <Button label="Registrar" :loading="store.saving" @click="salvar" />
        </div>
      </template>
    </Dialog>
    <Toast />
  </div>
</template>
