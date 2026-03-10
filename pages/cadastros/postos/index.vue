<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store = useCadastrosStore()
const toast = useToast()
const route = useRoute()

onMounted(() => {
  if (route.query.tomador_id) filtroTomador.value = route.query.tomador_id as string
  store.listarTomadores({ status: 'ativo' })
  buscar()
})

const q = ref(''); const filtroStatus = ref(''); const filtroTomador = ref('')
const statusOpts = [{ label: 'Todos', value: '' }, { label: 'Ativo', value: 'ativo' }, { label: 'Inativo', value: 'inativo' }]

let timer: any
function buscarDebounced() { clearTimeout(timer); timer = setTimeout(buscar, 350) }
function buscar() { store.listarPostos({ q: q.value, status: filtroStatus.value, tomador_id: filtroTomador.value }) }
function limpar() { q.value = ''; filtroStatus.value = ''; filtroTomador.value = ''; buscar() }

const tomadorOpts = computed(() => [
  { label: 'Todos os tomadores', value: '' },
  ...store.tomadores.map(t => ({ label: t.nome_fantasia ?? t.razao_social, value: t.id }))
])

const selecionado = ref<any>(null)
const modalForm = ref(false); const confirmStatus = ref(false); const modalVagas = ref(false)

function abrirNovo() { selecionado.value = null; modalForm.value = true }
function abrirEditar(p: any) { selecionado.value = p; modalForm.value = true }
function abrirStatus(p: any) { selecionado.value = p; confirmStatus.value = true }
function abrirVagas(p: any) { selecionado.value = p; modalVagas.value = true }
async function onSalvo() { modalForm.value = false; await buscar() }

async function confirmarStatus(justificativa: string) {
  try {
    await store.alternarStatusPosto(selecionado.value.id, justificativa)
    toast.add({ severity: 'success', summary: 'Status alterado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 })
  } finally { confirmStatus.value = false }
}
</script>

<template>
  <div>
    <SgoPageHeader title="Postos" subtitle="Locais de trabalho vinculados aos tomadores." icon="pi-map-marker">
      <template #actions>
        <Button label="Novo posto" icon="pi pi-plus" size="small" @click="abrirNovo" />
      </template>
    </SgoPageHeader>

    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[220px]">
          <IconField><InputIcon class="pi pi-search" />
            <InputText v-model="q" placeholder="Buscar por nome ou cidade..." class="w-full" @input="buscarDebounced" />
          </IconField>
        </div>
        <Select v-model="filtroTomador" :options="tomadorOpts" option-label="label" option-value="value" placeholder="Tomador" class="w-52" @change="buscar" />
        <Select v-model="filtroStatus" :options="statusOpts" option-label="label" option-value="value" class="w-36" @change="buscar" />
        <Button v-if="q || filtroStatus || filtroTomador" label="Limpar" icon="pi pi-times" severity="secondary" text size="small" @click="limpar" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="store.loading" @click="buscar" />
      </div>
    </div>

    <div class="sgo-card p-0 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/60 text-sm text-slate-500">
        <span class="font-semibold text-slate-800">{{ store.totalPostos }}</span> posto{{ store.totalPostos !== 1 ? 's' : '' }}
      </div>
      <DataTable :value="store.postos" :loading="store.loading" striped-rows size="small" row-hover>
        <template #empty><SgoEmptyState icon="pi-map-marker" title="Nenhum posto encontrado" description="Cadastre o primeiro clicando em «Novo posto»." /></template>
        <Column field="nome" header="Nome" sortable style="min-width:200px">
          <template #body="{ data }">
            <p class="font-semibold text-slate-800 text-sm">{{ data.nome }}</p>
            <p v-if="data.cidade" class="text-xs text-slate-400">{{ data.cidade }}{{ data.uf ? ` / ${data.uf}` : '' }}</p>
          </template>
        </Column>
        <Column header="Tomador" style="min-width:160px">
          <template #body="{ data }">
            <span class="text-sm text-slate-600">{{ data.tomador?.nome_fantasia ?? data.tomador?.razao_social ?? '—' }}</span>
          </template>
        </Column>
        <Column field="endereco" header="Endereço" style="min-width:200px">
          <template #body="{ data }">
            <span class="text-sm text-slate-500">{{ data.endereco ?? '—' }}</span>
          </template>
        </Column>
        <Column field="status" header="Status" style="width:100px" sortable>
          <template #body="{ data }"><SgoBadge :status="data.status" small /></template>
        </Column>
        <Column header="" style="width:110px">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1">
              <button class="w-7 h-7 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Editar" @click="abrirEditar(data)"><i class="pi pi-pencil text-sm" /></button>
              <button class="w-7 h-7 rounded flex items-center justify-center text-purple-500 hover:bg-purple-50 transition-colors" title="Vagas" @click="abrirVagas(data)"><i class="pi pi-th-large text-sm" /></button>
              <button class="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 transition-colors"
                :class="data.status === 'ativo' ? 'text-red-500' : 'text-emerald-500'"
                :title="data.status === 'ativo' ? 'Inativar' : 'Reativar'"
                @click="abrirStatus(data)"><i :class="['pi text-sm', data.status === 'ativo' ? 'pi-ban' : 'pi-check-circle']" /></button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <CadastrosPostoModal v-model:visible="modalForm" :posto="selecionado" @saved="onSalvo" />
    <CadastrosVagasModal v-model:visible="modalVagas" :posto="selecionado" />
    <AppConfirmDialog v-model:visible="confirmStatus"
      :title="selecionado?.status === 'ativo' ? 'Inativar posto' : 'Reativar posto'"
      :message="`Confirma ${selecionado?.status === 'ativo' ? 'inativação' : 'reativação'} de ${selecionado?.nome}?`"
      :severity="selecionado?.status === 'ativo' ? 'danger' : 'info'"
      require-justificativa :loading="store.saving" @confirm="confirmarStatus" />
    <Toast />
  </div>
</template>
