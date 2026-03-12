<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store = useColaboradoresStore()
const cadastrosStore = useCadastrosStore()
const toast = useToast()

onMounted(() => {
  store.listarColaboradores()
  cadastrosStore.listarPrestadoras({ status: 'ativo' })
})

const q = ref(''); const filtroStatus = ref(''); const filtroPrestadora = ref('')
const statusOpts = [
  { label: 'Todos', value: '' },
  { label: 'Ativo', value: 'ativo' },
  { label: 'Reserva', value: 'reserva' },
  { label: 'Afastado', value: 'afastado' },
  { label: 'Desligado', value: 'desligado' },
  { label: 'Inativo', value: 'inativo' },
]
const prestadoraOpts = computed(() => [
  { label: 'Todas as prestadoras', value: '' },
  ...cadastrosStore.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id }))
])

let timer: any
function buscar() { store.listarColaboradores({ q: q.value, status: filtroStatus.value, prestadora_id: filtroPrestadora.value }) }
function buscarDebounced() { clearTimeout(timer); timer = setTimeout(buscar, 350) }
function limpar() { q.value = ''; filtroStatus.value = ''; filtroPrestadora.value = ''; buscar() }

const kpis = computed(() => ({
  total: store.totalColaboradores,
  ativos: store.colaboradores.filter(c => c.status === 'ativo').length,
  reserva: store.colaboradores.filter(c => c.status === 'reserva').length,
  afastados: store.colaboradores.filter(c => c.status === 'afastado').length,
}))

const selecionado = ref<any>(null)
const modalForm = ref(false); const modalDetalhe = ref(false); const confirmStatus = ref(false)
const novoStatus = ref('')

function abrirNovo() { selecionado.value = null; modalForm.value = true }
function abrirEditar(c: any) { selecionado.value = c; modalForm.value = true }
function abrirDetalhe(c: any) { selecionado.value = c; modalDetalhe.value = true }
function abrirStatus(c: any, s: string) { selecionado.value = c; novoStatus.value = s; confirmStatus.value = true }
async function onSalvo() { modalForm.value = false; await buscar() }

async function confirmarStatus(justificativa: string) {
  try {
    await store.alternarStatusColaborador(selecionado.value.id, novoStatus.value, justificativa)
    toast.add({ severity: 'success', summary: 'Status alterado.', life: 3000 })
    confirmStatus.value = false; await buscar()
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

const statusColor: Record<string, string> = {
  ativo: 'text-emerald-600', reserva: 'text-amber-500', afastado: 'text-blue-500',
  desligado: 'text-slate-400', inativo: 'text-red-500',
}
</script>

<template>
  <div>
    <SgoPageHeader title="Colaboradores" subtitle="Quadro de pessoal ativo, reservas e afastamentos." icon="pi-id-card">
      <template #actions>
        <NuxtLink to="/colaboradores/candidatos">
          <Button label="Candidatos" icon="pi pi-user-plus" severity="secondary" outlined size="small" class="mr-2" />
        </NuxtLink>
        <Button label="Novo colaborador" icon="pi pi-plus" size="small" @click="abrirNovo" />
      </template>
    </SgoPageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <SgoStatCard title="Total" :value="kpis.total" icon="pi-users" icon-bg="bg-blue-50" icon-color="#2563eb" />
      <SgoStatCard title="Ativos" :value="kpis.ativos" icon="pi-check-circle" icon-bg="bg-green-50" icon-color="#16a34a" />
      <SgoStatCard title="Reserva" :value="kpis.reserva" icon="pi-pause-circle" icon-bg="bg-amber-50" icon-color="#d97706" />
      <SgoStatCard title="Afastados" :value="kpis.afastados" icon="pi-ban" icon-bg="bg-slate-50" icon-color="#64748b" />
    </div>

    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[220px]">
          <IconField><InputIcon class="pi pi-search" />
            <InputText v-model="q" placeholder="Buscar por nome, CPF ou matrícula..." class="w-full" @input="buscarDebounced" />
          </IconField>
        </div>
        <Select v-model="filtroPrestadora" :options="prestadoraOpts" option-label="label" option-value="value" class="w-52" @change="buscar" />
        <Select v-model="filtroStatus" :options="statusOpts" option-label="label" option-value="value" class="w-36" @change="buscar" />
        <Button v-if="q || filtroStatus || filtroPrestadora" label="Limpar" icon="pi pi-times" severity="secondary" text size="small" @click="limpar" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="store.loading" @click="buscar" />
      </div>
    </div>

    <div class="sgo-card p-0 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/60 text-sm text-slate-500">
        <span class="font-semibold text-slate-800">{{ store.totalColaboradores }}</span> colaborador{{ store.totalColaboradores !== 1 ? 'es' : '' }}
      </div>
      <DataTable :value="store.colaboradores" :loading="store.loading" striped-rows size="small" row-hover>
        <template #empty><SgoEmptyState icon="pi-id-card" title="Nenhum colaborador encontrado" description="Cadastre o primeiro clicando em «Novo colaborador»." /></template>
        <Column field="nome" header="Colaborador" sortable style="min-width:220px">
          <template #body="{ data }">
            <p class="font-semibold text-slate-800 text-sm">{{ data.nome }}</p>
            <p class="text-xs text-slate-400">CPF {{ data.cpf }}{{ data.matricula ? ` • Mat. ${data.matricula}` : '' }}</p>
          </template>
        </Column>
        <Column header="Alocação" style="min-width:200px">
          <template #body="{ data }">
            <div v-if="data.alocacoes?.length" class="space-y-0.5">
              <p v-for="a in data.alocacoes" :key="a.id" class="text-xs text-slate-600">
                <span class="font-medium">{{ a.posto?.nome ?? '—' }}</span>
                <span class="text-slate-400 ml-1">/ {{ a.funcao?.nome ?? '—' }}</span>
                <span v-if="!a.principal" class="ml-1 text-[10px] bg-slate-100 text-slate-500 rounded px-1">2ª</span>
              </p>
            </div>
            <span v-else class="text-xs text-slate-300 italic">Sem alocação</span>
          </template>
        </Column>
        <Column header="Admissão" style="width:110px">
          <template #body="{ data }">
            <span class="text-sm text-slate-600">{{ new Date(data.data_admissao).toLocaleDateString('pt-BR') }}</span>
          </template>
        </Column>
        <Column field="status" header="Status" style="width:110px" sortable>
          <template #body="{ data }"><SgoBadge :status="data.status" small /></template>
        </Column>
        <Column header="" style="width:110px">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1">
              <button class="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Detalhes" @click="abrirDetalhe(data)"><i class="pi pi-eye text-sm" /></button>
              <button class="w-7 h-7 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Editar" @click="abrirEditar(data)"><i class="pi pi-pencil text-sm" /></button>
              <Menu as="div" class="relative">
                <button class="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
                  <i class="pi pi-ellipsis-v text-sm" />
                </button>
              </Menu>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ColaboradoresFormModal v-model:visible="modalForm" :colaborador="selecionado" @saved="onSalvo" />
    <ColaboradoresDetalheModal v-model:visible="modalDetalhe" :colaborador-id="selecionado?.id" />
    <AppConfirmDialog v-model:visible="confirmStatus"
      :title="`Alterar status para ${novoStatus}`"
      :message="`Confirma alteração de status de ${selecionado?.nome}?`"
      severity="warning" require-justificativa :loading="store.saving" @confirm="confirmarStatus" />
    <Toast />
  </div>
</template>
