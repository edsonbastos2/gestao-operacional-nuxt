<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store = useCadastrosStore()
const toast = useToast()

onMounted(() => store.listarTomadores())

const q = ref(''); const filtroStatus = ref('')
const statusOpts = [{ label: 'Todos', value: '' }, { label: 'Ativo', value: 'ativo' }, { label: 'Inativo', value: 'inativo' }]

let timer: any
function buscarDebounced() { clearTimeout(timer); timer = setTimeout(buscar, 350) }
function buscar() { store.listarTomadores({ q: q.value, status: filtroStatus.value }) }
function limpar() { q.value = ''; filtroStatus.value = ''; buscar() }

const selecionado = ref<any>(null)
const modalForm = ref(false); const confirmStatus = ref(false)

function abrirNovo() { selecionado.value = null; modalForm.value = true }
function abrirEditar(t: any) { selecionado.value = t; modalForm.value = true }
function abrirStatus(t: any) { selecionado.value = t; confirmStatus.value = true }
async function onSalvo() { modalForm.value = false; await buscar() }

async function confirmarStatus(justificativa: string) {
  try {
    await store.alternarStatusTomador(selecionado.value.id, justificativa)
    toast.add({ severity: 'success', summary: 'Status alterado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 })
  } finally { confirmStatus.value = false }
}
</script>

<template>
  <div>
    <SgoPageHeader title="Tomadores" subtitle="Empresas tomadoras de serviço e seus parâmetros de benefícios." icon="pi-briefcase">
      <template #actions>
        <Button label="Novo tomador" icon="pi pi-plus" size="small" @click="abrirNovo" />
      </template>
    </SgoPageHeader>

    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[220px]">
          <IconField><InputIcon class="pi pi-search" />
            <InputText v-model="q" placeholder="Buscar por razão social ou CNPJ..." class="w-full" @input="buscarDebounced" />
          </IconField>
        </div>
        <Select v-model="filtroStatus" :options="statusOpts" option-label="label" option-value="value" class="w-36" @change="buscar" />
        <Button v-if="q || filtroStatus" label="Limpar" icon="pi pi-times" severity="secondary" text size="small" @click="limpar" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="store.loading" @click="buscar" />
      </div>
    </div>

    <div class="sgo-card p-0 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/60 text-sm text-slate-500">
        <span class="font-semibold text-slate-800">{{ store.totalTomadores }}</span> tomador{{ store.totalTomadores !== 1 ? 'es' : '' }}
      </div>
      <DataTable :value="store.tomadores" :loading="store.loading" striped-rows size="small" row-hover>
        <template #empty><SgoEmptyState icon="pi-briefcase" title="Nenhum tomador encontrado" description="Cadastre o primeiro clicando em «Novo tomador»." /></template>
        <Column field="razao_social" header="Tomador" sortable style="min-width:220px">
          <template #body="{ data }">
            <p class="font-semibold text-slate-800 text-sm">{{ data.razao_social }}</p>
            <p v-if="data.nome_fantasia" class="text-xs text-slate-400">{{ data.nome_fantasia }}</p>
          </template>
        </Column>
        <Column field="cnpj" header="CNPJ" style="width:160px">
          <template #body="{ data }"><code class="text-xs bg-slate-100 px-2 py-0.5 rounded">{{ data.cnpj }}</code></template>
        </Column>
        <Column header="Prestadora" style="min-width:160px">
          <template #body="{ data }">
            <span class="text-sm text-slate-600">{{ data.prestadora?.nome_fantasia ?? data.prestadora?.razao_social ?? '—' }}</span>
          </template>
        </Column>
        <Column header="Benefícios" style="width:140px">
          <template #body="{ data }">
            <div class="flex gap-1 flex-wrap">
              <span v-if="data.usa_vt" class="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 font-medium">VT</span>
              <span v-if="data.usa_va" class="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded px-1.5 py-0.5 font-medium">VA</span>
              <span v-if="!data.usa_vt && !data.usa_va" class="text-xs text-slate-300 italic">Nenhum</span>
            </div>
          </template>
        </Column>
        <Column field="status" header="Status" style="width:100px" sortable>
          <template #body="{ data }"><SgoBadge :status="data.status" small /></template>
        </Column>
        <Column header="" style="width:120px">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1">
              <button class="w-7 h-7 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Editar" @click="abrirEditar(data)"><i class="pi pi-pencil text-sm" /></button>
              <NuxtLink :to="`/cadastros/postos?tomador_id=${data.id}`">
                <button class="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Ver postos"><i class="pi pi-map-marker text-sm" /></button>
              </NuxtLink>
              <button class="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 transition-colors"
                :class="data.status === 'ativo' ? 'text-red-500' : 'text-emerald-500'"
                :title="data.status === 'ativo' ? 'Inativar' : 'Reativar'"
                @click="abrirStatus(data)"><i :class="['pi text-sm', data.status === 'ativo' ? 'pi-ban' : 'pi-check-circle']" /></button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <CadastrosTomadorModal v-model:visible="modalForm" :tomador="selecionado" @saved="onSalvo" />
    <AppConfirmDialog v-model:visible="confirmStatus"
      :title="selecionado?.status === 'ativo' ? 'Inativar tomador' : 'Reativar tomador'"
      :message="`Confirma ${selecionado?.status === 'ativo' ? 'inativação' : 'reativação'} de ${selecionado?.razao_social}?`"
      :severity="selecionado?.status === 'ativo' ? 'danger' : 'info'"
      require-justificativa :loading="store.saving" @confirm="confirmarStatus" />
    <Toast />
  </div>
</template>
