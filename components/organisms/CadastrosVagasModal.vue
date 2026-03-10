<script setup lang="ts">
const props = defineProps<{ visible: boolean; posto?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean] }>()

const store = useCadastrosStore()
const toast = useToast()

const novaFuncaoId = ref('')
const novaQtd = ref(1)
const erroFuncao = ref('')

const funcaoOpts = computed(() => store.funcoes
  .filter(f => f.status === 'ativo')
  .map(f => ({ label: f.nome, value: f.id }))
)

watch(() => props.visible, async (v) => {
  if (v && props.posto) {
    await store.listarFuncoes({ status: 'ativo' })
    await store.listarVagas(props.posto.id)
    novaFuncaoId.value = ''; novaQtd.value = 1; erroFuncao.value = ''
  }
})

async function adicionarVaga() {
  erroFuncao.value = ''
  if (!novaFuncaoId.value) { erroFuncao.value = 'Selecione uma função.'; return }
  try {
    await store.salvarVaga({ posto_id: props.posto.id, funcao_id: novaFuncaoId.value, quantidade: novaQtd.value })
    novaFuncaoId.value = ''; novaQtd.value = 1
    toast.add({ severity: 'success', summary: 'Vaga adicionada.', life: 2000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 3000 }) }
}

async function atualizarQtd(vaga: any, novaQtdVal: number) {
  try { await store.salvarVaga({ quantidade: novaQtdVal }, vaga.id); vaga.quantidade = novaQtdVal }
  catch { toast.add({ severity: 'error', summary: 'Erro ao atualizar.', life: 3000 }) }
}

async function removerVaga(vaga: any) {
  try {
    await store.excluirVaga(vaga.id)
    store.vagas = store.vagas.filter(v => v.id !== vaga.id)
    toast.add({ severity: 'success', summary: 'Vaga removida.', life: 2000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 3000 }) }
}
</script>

<template>
  <Dialog :visible="visible" :header="`Vagas — ${posto?.nome ?? ''}`" :style="{ width: '520px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="space-y-4">
      <!-- Lista de vagas -->
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Vagas cadastradas</p>
        <div v-if="store.vagas.length === 0" class="text-sm text-slate-400 italic text-center py-4">
          Nenhuma vaga cadastrada para este posto.
        </div>
        <div v-for="vaga in store.vagas" :key="vaga.id" class="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
          <div class="flex-1">
            <p class="text-sm font-medium text-slate-700">{{ vaga.funcao?.nome ?? '—' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              :disabled="vaga.quantidade <= 1"
              @click="atualizarQtd(vaga, vaga.quantidade - 1)">
              <i class="pi pi-minus text-xs text-slate-600" />
            </button>
            <span class="text-sm font-bold text-slate-800 w-6 text-center">{{ vaga.quantidade }}</span>
            <button class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              @click="atualizarQtd(vaga, vaga.quantidade + 1)">
              <i class="pi pi-plus text-xs text-slate-600" />
            </button>
          </div>
          <button class="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
            title="Remover vaga" @click="removerVaga(vaga)">
            <i class="pi pi-trash text-sm" />
          </button>
        </div>
      </div>

      <!-- Adicionar nova vaga -->
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Adicionar vaga</p>
        <div class="flex gap-2 items-end">
          <SgoFormField label="Função" field-id="nf" class="flex-1" :error="erroFuncao">
            <Select id="nf" v-model="novaFuncaoId" :options="funcaoOpts" option-label="label" option-value="value"
              placeholder="Selecione..." :invalid="!!erroFuncao" />
          </SgoFormField>
          <SgoFormField label="Qtd" field-id="nq" style="width:80px">
            <InputNumber id="nq" v-model="novaQtd" :min="1" :max="99" />
          </SgoFormField>
          <Button icon="pi pi-plus" label="Adicionar" size="small" :loading="store.saving" @click="adicionarVaga" class="mb-[1px]" />
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Fechar" severity="secondary" @click="$emit('update:visible', false)" />
    </template>
  </Dialog>
</template>
