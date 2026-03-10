<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store = useEscalasStore()
const toast = useToast()

const ano = ref(new Date().getFullYear())
const filtroUf = ref('')
const q = ref('')

const anoOpts = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i)
const ufs = ['','AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const ufOpts = ufs.map(u => ({ label: u || 'Todos', value: u }))

onMounted(() => buscar())
function buscar() { store.listarFeriados({ ano: ano.value, uf: filtroUf.value || undefined, q: q.value }) }

let timer: any
function buscarDebounced() { clearTimeout(timer); timer = setTimeout(buscar, 350) }

const selecionado = ref<any>(null)
const modalForm = ref(false)
const confirmExcluir = ref(false)

function abrirNovo() { selecionado.value = null; modalForm.value = true }
function abrirEditar(f: any) { selecionado.value = f; modalForm.value = true }
function abrirExcluir(f: any) { selecionado.value = f; confirmExcluir.value = true }
async function onSalvo() { modalForm.value = false; await buscar() }

async function confirmarExcluir() {
  try {
    await store.excluirFeriado(selecionado.value.id)
    store.feriados = store.feriados.filter(f => f.id !== selecionado.value.id)
    toast.add({ severity: 'success', summary: 'Feriado excluído.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 })
  } finally { confirmExcluir.value = false }
}

const tipoCor: Record<string, string> = {
  nacional: 'bg-red-50 text-red-600 border-red-200',
  estadual: 'bg-amber-50 text-amber-600 border-amber-200',
  municipal: 'bg-blue-50 text-blue-600 border-blue-200',
}

// Agrupar por mês
const porMes = computed(() => {
  const meses: Record<string, any[]> = {}
  for (const f of store.feriados) {
    const mes = new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long' })
    const key = mes.charAt(0).toUpperCase() + mes.slice(1)
    if (!meses[key]) meses[key] = []
    meses[key].push(f)
  }
  return meses
})
</script>

<template>
  <div>
    <SgoPageHeader title="Feriados" subtitle="Feriados nacionais, estaduais e municipais." icon="pi-star">
      <template #actions>
        <Button label="Novo feriado" icon="pi pi-plus" size="small" @click="abrirNovo" />
      </template>
    </SgoPageHeader>

    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[180px]">
          <IconField><InputIcon class="pi pi-search" />
            <InputText v-model="q" placeholder="Buscar feriado..." class="w-full" @input="buscarDebounced" />
          </IconField>
        </div>
        <Select v-model="ano" :options="anoOpts" placeholder="Ano" class="w-28" @change="buscar" />
        <Select v-model="filtroUf" :options="ufOpts" option-label="label" option-value="value" placeholder="UF" class="w-28" @change="buscar" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="store.loading" @click="buscar" />
      </div>
    </div>

    <div v-if="store.loading" class="sgo-card flex items-center justify-center py-8">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:1.5rem" />
    </div>
    <div v-else-if="!store.feriados.length" class="sgo-card">
      <SgoEmptyState icon="pi-star" title="Nenhum feriado encontrado" description="Cadastre feriados para uso no calendário." />
    </div>
    <div v-else class="space-y-4">
      <div v-for="(feriados, mes) in porMes" :key="mes" class="sgo-card">
        <p class="text-sm font-bold text-slate-700 mb-3">{{ mes }}</p>
        <div class="divide-y divide-slate-100">
          <div v-for="f in feriados" :key="f.id" class="flex items-center gap-3 py-2.5">
            <div class="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0">
              <span class="text-xs font-bold text-slate-700 leading-none">{{ new Date(f.data + 'T00:00:00').getDate() }}</span>
              <span class="text-[9px] text-slate-400 uppercase">{{ new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }) }}</span>
            </div>
            <div class="flex-1">
              <p class="font-semibold text-slate-800 text-sm">{{ f.nome }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span :class="['text-[10px] border rounded px-1.5 py-0.5 font-medium', tipoCor[f.tipo] ?? 'bg-slate-50 text-slate-500 border-slate-200']">
                  {{ f.tipo }}{{ f.uf ? ` / ${f.uf}` : '' }}{{ f.municipio ? ` — ${f.municipio}` : '' }}
                </span>
                <span v-if="f.recorrente" class="text-[10px] text-slate-400"><i class="pi pi-refresh mr-0.5" />Anual</span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button class="w-7 h-7 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" @click="abrirEditar(f)"><i class="pi pi-pencil text-sm" /></button>
              <button class="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors" @click="abrirExcluir(f)"><i class="pi pi-trash text-sm" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EscalasFeriadoModal v-model:visible="modalForm" :feriado="selecionado" @saved="onSalvo" />
    <AppConfirmDialog v-model:visible="confirmExcluir"
      title="Excluir feriado"
      :message="`Confirma exclusão de «${selecionado?.nome}»?`"
      severity="danger" :loading="store.saving" @confirm="confirmarExcluir" />
    <Toast />
  </div>
</template>
