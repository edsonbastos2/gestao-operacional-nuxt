<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store = useEscalasStore()
const cadastros = useCadastrosStore()
const toast = useToast()

onMounted(() => {
  store.listarEscalas()
  cadastros.listarPostos({ status: 'ativo' })
  cadastros.listarFuncoes({ status: 'ativo' })
})

const q = ref(''); const filtroStatus = ref(''); const filtroPostoId = ref('')
const statusOpts = [{ label: 'Todos', value: '' }, { label: 'Ativo', value: 'ativo' }, { label: 'Inativo', value: 'inativo' }]
const postoOpts = computed(() => [
  { label: 'Todos os postos', value: '' },
  ...cadastros.postos.map(p => ({ label: p.nome, value: p.id }))
])

let timer: any
function buscar() { store.listarEscalas({ q: q.value, status: filtroStatus.value, posto_id: filtroPostoId.value }) }
function buscarDebounced() { clearTimeout(timer); timer = setTimeout(buscar, 350) }
function limpar() { q.value = ''; filtroStatus.value = ''; filtroPostoId.value = ''; buscar() }

const selecionado = ref<any>(null)
const modalForm = ref(false); const modalTurnos = ref(false); const confirmStatus = ref(false)

function abrirNovo() { selecionado.value = null; modalForm.value = true }
function abrirEditar(e: any) { selecionado.value = e; modalForm.value = true }
function abrirTurnos(e: any) { selecionado.value = e; modalTurnos.value = true }
function abrirStatus(e: any) { selecionado.value = e; confirmStatus.value = true }
async function onSalvo() { modalForm.value = false; await buscar() }

async function confirmarStatus(justificativa: string) {
  try {
    await store.alternarStatusEscala(selecionado.value.id, justificativa)
    toast.add({ severity: 'success', summary: 'Status alterado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 })
  } finally { confirmStatus.value = false }
}
</script>

<template>
  <div>
    <SgoPageHeader title="Escalas" subtitle="Modelos de escala de trabalho por posto/função." icon="pi-list">
      <template #actions>
        <NuxtLink to="/escalas/calendario"><Button label="Calendário" icon="pi pi-calendar" severity="secondary" outlined size="small" class="mr-2" /></NuxtLink>
        <Button label="Nova escala" icon="pi pi-plus" size="small" @click="abrirNovo" />
      </template>
    </SgoPageHeader>

    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[200px]">
          <IconField><InputIcon class="pi pi-search" />
            <InputText v-model="q" placeholder="Buscar..." class="w-full" @input="buscarDebounced" />
          </IconField>
        </div>
        <Select v-model="filtroPostoId" :options="postoOpts" option-label="label" option-value="value" class="w-44" @change="buscar" />
        <Select v-model="filtroStatus" :options="statusOpts" option-label="label" option-value="value" class="w-32" @change="buscar" />
        <Button v-if="q||filtroStatus||filtroPostoId" label="Limpar" icon="pi pi-times" severity="secondary" text size="small" @click="limpar" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="store.loading" @click="buscar" />
      </div>
    </div>

    <div class="sgo-card p-0 overflow-hidden">
      <DataTable :value="store.escalas" :loading="store.loading" striped-rows size="small" row-hover>
        <template #empty><SgoEmptyState icon="pi-list" title="Nenhuma escala encontrada" description="Crie a primeira escala clicando em «Nova escala»." /></template>
        <Column field="nome" header="Escala" sortable style="min-width:200px">
          <template #body="{ data }">
            <p class="font-semibold text-slate-800 text-sm">{{ data.nome }}</p>
            <p v-if="data.descricao" class="text-xs text-slate-400 truncate max-w-xs">{{ data.descricao }}</p>
          </template>
        </Column>
        <Column header="Posto" style="min-width:140px">
          <template #body="{ data }"><span class="text-sm text-slate-600">{{ data.posto?.nome ?? '—' }}</span></template>
        </Column>
        <Column header="Função" style="min-width:140px">
          <template #body="{ data }"><span class="text-sm text-slate-600">{{ data.funcao?.nome ?? '—' }}</span></template>
        </Column>
        <Column field="status" header="Status" style="width:100px">
          <template #body="{ data }"><SgoBadge :status="data.status" small /></template>
        </Column>
        <Column header="" style="width:110px">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1">
              <button class="w-7 h-7 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Editar" @click="abrirEditar(data)"><i class="pi pi-pencil text-sm" /></button>
              <button class="w-7 h-7 rounded flex items-center justify-center text-purple-500 hover:bg-purple-50 transition-colors" title="Turnos" @click="abrirTurnos(data)"><i class="pi pi-clock text-sm" /></button>
              <button class="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 transition-colors"
                :class="data.status === 'ativo' ? 'text-red-500' : 'text-emerald-500'"
                @click="abrirStatus(data)"><i :class="['pi text-sm', data.status === 'ativo' ? 'pi-ban' : 'pi-check-circle']" /></button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <EscalasFormModal v-model:visible="modalForm" :escala="selecionado" @saved="onSalvo" />
    <EscalasTurnosModal v-model:visible="modalTurnos" :escala="selecionado" />
    <AppConfirmDialog v-model:visible="confirmStatus"
      :title="selecionado?.status === 'ativo' ? 'Inativar escala' : 'Reativar escala'"
      :message="`Confirma ${selecionado?.status === 'ativo' ? 'inativação' : 'reativação'} de ${selecionado?.nome}?`"
      :severity="selecionado?.status === 'ativo' ? 'danger' : 'info'"
      require-justificativa :loading="store.saving" @confirm="confirmarStatus" />
    <Toast />
  </div>
</template>
