<script setup lang="ts">
const props = defineProps<{ visible: boolean; posto?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()

const store = useCadastrosStore()
const toast = useToast()
const isEdicao = computed(() => !!props.posto?.id)

const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const form = ref<any>({ tomador_id: '', nome: '', endereco: '', cidade: '', uf: '' })
const erros = ref({ tomador_id: '', nome: '' })

const tomadorOpts = computed(() => store.tomadores.map(t => ({ label: t.nome_fantasia ?? t.razao_social, value: t.id })))
const ufOpts = ufs.map(u => ({ label: u, value: u }))

watch(() => props.visible, (v) => {
  if (v) {
    store.listarTomadores({ status: 'ativo' })
    if (props.posto) form.value = { ...props.posto }
    else form.value = { tomador_id: '', nome: '', endereco: '', cidade: '', uf: '' }
    erros.value = { tomador_id: '', nome: '' }
  }
})

function validar() {
  erros.value = { tomador_id: '', nome: '' }
  let ok = true
  if (!form.value.tomador_id) { erros.value.tomador_id = 'Obrigatório.'; ok = false }
  if (!form.value.nome.trim()) { erros.value.nome = 'Obrigatório.'; ok = false }
  return ok
}

async function salvar() {
  if (!validar()) return
  try {
    await store.salvarPosto(form.value, isEdicao.value ? props.posto.id : undefined)
    toast.add({ severity: 'success', summary: isEdicao.value ? 'Posto atualizado.' : 'Posto cadastrado.', life: 3000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro ao salvar.', life: 4000 }) }
}
</script>

<template>
  <Dialog :visible="visible" :header="isEdicao ? 'Editar Posto' : 'Novo Posto'" :style="{ width: '520px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="form-grid form-grid-2 py-1">
      <SgoFormField label="Tomador" field-id="tom" required :error="erros.tomador_id" class="col-span-2">
        <Select id="tom" v-model="form.tomador_id" :options="tomadorOpts" option-label="label" option-value="value" placeholder="Selecione o tomador" :invalid="!!erros.tomador_id" />
      </SgoFormField>
      <SgoFormField label="Nome do Posto" field-id="nome" required :error="erros.nome" class="col-span-2">
        <InputText id="nome" v-model="form.nome" placeholder="Ex: Unidade Centro" :invalid="!!erros.nome" />
      </SgoFormField>
      <SgoFormField label="Endereço" field-id="end" class="col-span-2">
        <InputText id="end" v-model="form.endereco" placeholder="Rua, número, bairro" />
      </SgoFormField>
      <SgoFormField label="Cidade" field-id="cidade">
        <InputText id="cidade" v-model="form.cidade" placeholder="Cidade" />
      </SgoFormField>
      <SgoFormField label="UF" field-id="uf">
        <Select id="uf" v-model="form.uf" :options="ufOpts" option-label="label" option-value="value" placeholder="UF" />
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
