<script setup lang="ts">
const props = defineProps<{ visible: boolean; escala?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()
const store = useEscalasStore()
const cadastros = useCadastrosStore()
const toast = useToast()
const isEdicao = computed(() => !!props.escala?.id)

const form = ref<any>({ nome: '', descricao: '', posto_id: '', funcao_id: '' })
const erros = ref({ nome: '' })

const postoOpts = computed(() => [{ label: '— Nenhum —', value: '' }, ...cadastros.postos.filter(p => p.status === 'ativo').map(p => ({ label: p.nome, value: p.id }))])
const funcaoOpts = computed(() => [{ label: '— Nenhuma —', value: '' }, ...cadastros.funcoes.filter(f => f.status === 'ativo').map(f => ({ label: f.nome, value: f.id }))])

watch(() => props.visible, v => {
  if (v) {
    cadastros.listarPostos({ status: 'ativo' }); cadastros.listarFuncoes({ status: 'ativo' })
    form.value = props.escala ? { nome: props.escala.nome, descricao: props.escala.descricao ?? '', posto_id: props.escala.posto_id ?? '', funcao_id: props.escala.funcao_id ?? '' } : { nome: '', descricao: '', posto_id: '', funcao_id: '' }
    erros.value = { nome: '' }
  }
})

async function salvar() {
  erros.value = { nome: '' }
  if (!form.value.nome.trim()) { erros.value.nome = 'Obrigatório.'; return }
  try {
    await store.salvarEscala(form.value, isEdicao.value ? props.escala.id : undefined)
    toast.add({ severity: 'success', summary: isEdicao.value ? 'Escala atualizada.' : 'Escala cadastrada.', life: 3000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}
</script>
<template>
  <Dialog :visible="visible" :header="isEdicao ? 'Editar Escala' : 'Nova Escala'" :style="{ width: '480px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="form-grid form-grid-2 py-1">
      <SgoFormField label="Nome da escala" field-id="nome" required :error="erros.nome" class="col-span-2">
        <InputText id="nome" v-model="form.nome" :invalid="!!erros.nome" />
      </SgoFormField>
      <SgoFormField label="Posto" field-id="posto">
        <Select id="posto" v-model="form.posto_id" :options="postoOpts" option-label="label" option-value="value" />
      </SgoFormField>
      <SgoFormField label="Função" field-id="func">
        <Select id="func" v-model="form.funcao_id" :options="funcaoOpts" option-label="label" option-value="value" />
      </SgoFormField>
      <SgoFormField label="Descrição" field-id="desc" class="col-span-2">
        <Textarea id="desc" v-model="form.descricao" rows="2" class="w-full" />
      </SgoFormField>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Cancelar" severity="secondary" outlined @click="$emit('update:visible', false)" />
        <Button :label="isEdicao ? 'Salvar' : 'Cadastrar'" :loading="store.saving" @click="salvar" />
      </div>
    </template>
  </Dialog>
</template>
