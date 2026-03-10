<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store = useColaboradoresStore()
const toast = useToast()

onMounted(() => store.listarCandidatos())

const q = ref(''); const filtroStatus = ref('')
const statusOpts = [
  { label: 'Todos', value: '' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Aprovado', value: 'aprovado' },
  { label: 'Reprovado', value: 'reprovado' },
  { label: 'Desistiu', value: 'desistiu' },
]

let timer: any
function buscar() { store.listarCandidatos({ q: q.value, status: filtroStatus.value }) }
function buscarDebounced() { clearTimeout(timer); timer = setTimeout(buscar, 350) }
function limpar() { q.value = ''; filtroStatus.value = ''; buscar() }

const kpis = computed(() => {
  const all = store.candidatos
  return {
    total: store.totalCandidatos,
    pendentes: all.filter(c => c.status === 'pendente').length,
    aprovados: all.filter(c => c.status === 'aprovado').length,
    reprovados: all.filter(c => c.status === 'reprovado').length,
  }
})

const selecionado = ref<any>(null)
const modalForm = ref(false)
const modalStatus = ref(false)
const modalPromover = ref(false)
const novoStatus = ref('')
const motivoReprova = ref('')
const statusAlvo = ref('')

function abrirNovo() { selecionado.value = null; modalForm.value = true }
function abrirEditar(c: any) { selecionado.value = c; modalForm.value = true }

function abrirStatus(c: any, s: string) {
  selecionado.value = c; novoStatus.value = s; motivoReprova.value = ''
  statusAlvo.value = s; modalStatus.value = true
}

function abrirPromover(c: any) { selecionado.value = c; modalPromover.value = true }
async function onSalvo() { modalForm.value = false; await buscar() }

async function confirmarStatus() {
  if (novoStatus.value === 'reprovado' && !motivoReprova.value.trim()) { return }
  try {
    await store.atualizarStatusCandidato(selecionado.value.id, novoStatus.value, motivoReprova.value)
    toast.add({ severity: 'success', summary: 'Status atualizado.', life: 3000 })
    modalStatus.value = false; await buscar()
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

const statusIcons: Record<string, string> = {
  pendente: 'pi-clock', aprovado: 'pi-check-circle', reprovado: 'pi-times-circle', desistiu: 'pi-minus-circle'
}
const statusSeverity: Record<string, string> = {
  pendente: 'warn', aprovado: 'success', reprovado: 'danger', desistiu: 'secondary'
}
</script>

<template>
  <div>
    <SgoPageHeader title="Candidatos" subtitle="Gestão do processo seletivo." icon="pi-user-plus">
      <template #actions>
        <Button label="Novo candidato" icon="pi pi-plus" size="small" @click="abrirNovo" />
      </template>
    </SgoPageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <SgoStatCard title="Total" :value="kpis.total" icon="pi-users" icon-bg="bg-blue-50" icon-color="#2563eb" />
      <SgoStatCard title="Pendentes" :value="kpis.pendentes" icon="pi-clock" icon-bg="bg-amber-50" icon-color="#d97706" />
      <SgoStatCard title="Aprovados" :value="kpis.aprovados" icon="pi-check-circle" icon-bg="bg-green-50" icon-color="#16a34a" />
      <SgoStatCard title="Reprovados" :value="kpis.reprovados" icon="pi-times-circle" icon-bg="bg-red-50" icon-color="#dc2626" />
    </div>

    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[220px]">
          <IconField><InputIcon class="pi pi-search" />
            <InputText v-model="q" placeholder="Buscar por nome ou CPF..." class="w-full" @input="buscarDebounced" />
          </IconField>
        </div>
        <Select v-model="filtroStatus" :options="statusOpts" option-label="label" option-value="value" class="w-40" @change="buscar" />
        <Button v-if="q || filtroStatus" label="Limpar" icon="pi pi-times" severity="secondary" text size="small" @click="limpar" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="store.loading" @click="buscar" />
      </div>
    </div>

    <div class="sgo-card p-0 overflow-hidden">
      <DataTable :value="store.candidatos" :loading="store.loading" striped-rows size="small" row-hover>
        <template #empty><SgoEmptyState icon="pi-user-plus" title="Nenhum candidato encontrado" description="Cadastre o primeiro clicando em «Novo candidato»." /></template>
        <Column field="nome" header="Nome" sortable style="min-width:200px">
          <template #body="{ data }">
            <p class="font-semibold text-slate-800 text-sm">{{ data.nome }}</p>
            <p class="text-xs text-slate-400">{{ data.cpf }}</p>
          </template>
        </Column>
        <Column header="Contato" style="min-width:160px">
          <template #body="{ data }">
            <p class="text-sm text-slate-600">{{ data.email ?? '—' }}</p>
            <p v-if="data.telefone" class="text-xs text-slate-400">{{ data.telefone }}</p>
          </template>
        </Column>
        <Column header="Vaga" style="min-width:160px">
          <template #body="{ data }">
            <p class="text-sm text-slate-600">{{ data.funcao?.nome ?? '—' }}</p>
            <p v-if="data.posto" class="text-xs text-slate-400">{{ data.posto?.nome }}</p>
          </template>
        </Column>
        <Column field="status" header="Status" style="width:120px" sortable>
          <template #body="{ data }">
            <Tag :severity="statusSeverity[data.status]" :icon="`pi ${statusIcons[data.status]}`" :value="data.status" />
          </template>
        </Column>
        <Column header="" style="width:140px">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1">
              <button class="w-7 h-7 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Editar" @click="abrirEditar(data)"><i class="pi pi-pencil text-sm" /></button>
              <button v-if="data.status === 'pendente'" class="w-7 h-7 rounded flex items-center justify-center text-emerald-500 hover:bg-emerald-50 transition-colors" title="Aprovar" @click="abrirStatus(data, 'aprovado')"><i class="pi pi-check text-sm" /></button>
              <button v-if="data.status === 'pendente'" class="w-7 h-7 rounded flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors" title="Reprovar" @click="abrirStatus(data, 'reprovado')"><i class="pi pi-times text-sm" /></button>
              <button v-if="data.status === 'aprovado'" class="w-7 h-7 rounded flex items-center justify-center text-purple-600 hover:bg-purple-50 transition-colors" title="Promover a colaborador" @click="abrirPromover(data)">
                <i class="pi pi-user-edit text-sm" />
              </button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Modal Cadastro Candidato -->
    <ColaboradoresCandidatoModal v-model:visible="modalForm" :candidato="selecionado" @saved="onSalvo" />

    <!-- Modal Promover -->
    <ColaboradoresPromoverModal v-model:visible="modalPromover" :candidato="selecionado" @saved="async () => { modalPromover.value = false; await buscar() }" />

    <!-- Dialog status -->
    <Dialog v-model:visible="modalStatus" :header="novoStatus === 'aprovado' ? 'Aprovar candidato' : 'Reprovar candidato'" :style="{ width: '420px' }" modal>
      <div class="space-y-3 py-1">
        <p class="text-sm text-slate-600">Confirma a <strong>{{ novoStatus === 'aprovado' ? 'aprovação' : 'reprovação' }}</strong> de <strong>{{ selecionado?.nome }}</strong>?</p>
        <div v-if="novoStatus === 'reprovado'">
          <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Motivo *</label>
          <Textarea v-model="motivoReprova" placeholder="Informe o motivo da reprovação..." rows="3" class="w-full" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 pt-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalStatus = false" />
          <Button :label="novoStatus === 'aprovado' ? 'Aprovar' : 'Reprovar'" :severity="novoStatus === 'aprovado' ? 'success' : 'danger'" :loading="store.saving" @click="confirmarStatus" />
        </div>
      </template>
    </Dialog>
    <Toast />
  </div>
</template>
