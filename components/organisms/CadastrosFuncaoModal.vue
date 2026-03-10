<script setup lang="ts">
const props = defineProps<{ visible: boolean; funcao?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()

const store = useCadastrosStore()
const toast = useToast()
const isEdicao = computed(() => !!props.funcao?.id)

const form = ref({ nome: '', descricao: '', cbo: '' })
const erros = ref({ nome: '' })

watch(() => props.visible, (v) => {
  if (v && props.funcao) form.value = { nome: props.funcao.nome, descricao: props.funcao.descricao ?? '', cbo: props.funcao.cbo ?? '' }
  else if (v) form.value = { nome: '', descricao: '', cbo: '' }
  erros.value = { nome: '' }
})

async function salvar() {
  erros.value = { nome: '' }
  if (!form.value.nome.trim()) { erros.value.nome = 'Obrigatório.'; return }
  try {
    await store.salvarFuncao(form.value, isEdicao.value ? props.funcao.id : undefined)
    toast.add({ severity: 'success', summary: isEdicao.value ? 'Função atualizada.' : 'Função cadastrada.', life: 3000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro ao salvar.', life: 4000 }) }
}
</script>

<template>
  <Dialog :visible="visible" :header="isEdicao ? 'Editar Função' : 'Nova Função'" :style="{ width: '460px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="form-grid form-grid-2 py-1">
      <SgoFormField label="Nome da Função" field-id="nome" required :error="erros.nome" class="col-span-2">
        <InputText id="nome" v-model="form.nome" placeholder="Ex: Vigilante Patrimonial" :invalid="!!erros.nome" />
      </SgoFormField>
      <SgoFormField label="CBO" field-id="cbo">
        <InputText id="cbo" v-model="form.cbo" placeholder="0000-00" />
      </SgoFormField>
      <div />
      <SgoFormField label="Descrição" field-id="desc" class="col-span-2">
        <Textarea id="desc" v-model="form.descricao" placeholder="Descrição da função (opcional)" rows="3" class="w-full" />
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
