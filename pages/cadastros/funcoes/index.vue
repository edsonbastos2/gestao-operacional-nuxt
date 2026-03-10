<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store = useCadastrosStore()
const toast = useToast()

onMounted(() => store.listarFuncoes())

const q = ref(''); const filtroStatus = ref('')
const statusOpts = [{ label: 'Todos', value: '' }, { label: 'Ativo', value: 'ativo' }, { label: 'Inativo', value: 'inativo' }]

let timer: any
function buscarDebounced() { clearTimeout(timer); timer = setTimeout(buscar, 350) }
function buscar() { store.listarFuncoes({ q: q.value, status: filtroStatus.value }) }
function limpar() { q.value = ''; filtroStatus.value = ''; buscar() }

const selecionado = ref<any>(null)
const modalForm = ref(false); const confirmStatus = ref(false)

function abrirNovo() { selecionado.value = null; modalForm.value = true }
function abrirEditar(f: any) { selecionado.value = f; modalForm.value = true }
function abrirStatus(f: any) { selecionado.value = f; confirmStatus.value = true }
async function onSalvo() { modalForm.value = false; await buscar() }

async function confirmarStatus(justificativa: string) {
  try {
    await store.alternarStatusFuncao(selecionado.value.id, justificativa)
    toast.add({ severity: 'success', summary: 'Status alterado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 })
  } finally { confirmStatus.value = false }
}
</script>

<template>
  <div>
    <SgoPageHeader title="Funções" subtitle="Funções/cargos dos colaboradores." icon="pi-id-card">
      <template #actions>
        <Button label="Nova função" icon="pi pi-plus" size="small" @click="abrirNovo" />
      </template>
    </SgoPageHeader>

    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[220px]">
          <IconField><InputIcon class="pi pi-search" />
            <InputText v-model="q" placeholder="Buscar por nome..." class="w-full" @input="buscarDebounced" />
          </IconField>
        </div>
        <Select v-model="filtroStatus" :options="statusOpts" option-label="label" option-value="value" class="w-36" @change="buscar" />
        <Button v-if="q || filtroStatus" label="Limpar" icon="pi pi-times" severity="secondary" text size="small" @click="limpar" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="store.loading" @click="buscar" />
      </div>
    </div>

    <div class="sgo-card p-0 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/60 text-sm text-slate-500">
        <span class="font-semibold text-slate-800">{{ store.totalFuncoes }}</span> função{{ store.totalFuncoes !== 1 ? 'ões' : '' }}
      </div>
      <DataTable :value="store.funcoes" :loading="store.loading" striped-rows size="small" row-hover>
        <template #empty><SgoEmptyState icon="pi-id-card" title="Nenhuma função encontrada" description="Cadastre a primeira clicando em «Nova função»." /></template>
        <Column field="nome" header="Nome" sortable style="min-width:200px">
          <template #body="{ data }"><p class="font-semibold text-slate-800 text-sm">{{ data.nome }}</p></template>
        </Column>
        <Column field="cbo" header="CBO" style="width:120px">
          <template #body="{ data }">
            <code v-if="data.cbo" class="text-xs bg-slate-100 px-2 py-0.5 rounded">{{ data.cbo }}</code>
            <span v-else class="text-xs text-slate-300 italic">—</span>
          </template>
        </Column>
        <Column field="descricao" header="Descrição" style="min-width:200px">
          <template #body="{ data }"><span class="text-sm text-slate-500">{{ data.descricao ?? '—' }}</span></template>
        </Column>
        <Column field="status" header="Status" style="width:100px" sortable>
          <template #body="{ data }"><SgoBadge :status="data.status" small /></template>
        </Column>
        <Column header="" style="width:80px">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1">
              <button class="w-7 h-7 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Editar" @click="abrirEditar(data)"><i class="pi pi-pencil text-sm" /></button>
              <button class="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 transition-colors"
                :class="data.status === 'ativo' ? 'text-red-500' : 'text-emerald-500'"
                :title="data.status === 'ativo' ? 'Inativar' : 'Reativar'"
                @click="abrirStatus(data)"><i :class="['pi text-sm', data.status === 'ativo' ? 'pi-ban' : 'pi-check-circle']" /></button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <CadastrosFuncaoModal v-model:visible="modalForm" :funcao="selecionado" @saved="onSalvo" />
    <AppConfirmDialog v-model:visible="confirmStatus"
      :title="selecionado?.status === 'ativo' ? 'Inativar função' : 'Reativar função'"
      :message="`Confirma ${selecionado?.status === 'ativo' ? 'inativação' : 'reativação'} de ${selecionado?.nome}?`"
      :severity="selecionado?.status === 'ativo' ? 'danger' : 'info'"
      require-justificativa :loading="store.saving" @confirm="confirmarStatus" />
    <Toast />
  </div>
</template>
