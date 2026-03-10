<script setup lang="ts">
const props = defineProps<{ visible: boolean; feriado?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()
const store = useEscalasStore()
const toast = useToast()
const isEdicao = computed(() => !!props.feriado?.id)

const tipoOpts = [{ label: 'Nacional', value: 'nacional' }, { label: 'Estadual', value: 'estadual' }, { label: 'Municipal', value: 'municipal' }]
const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const ufOpts = [{ label: 'Todos', value: '' }, ...ufs.map(u => ({ label: u, value: u }))]

const form = ref<any>({ data: '', nome: '', tipo: 'nacional', uf: '', municipio: '', recorrente: true })
const erros = ref({ data: '', nome: '' })

watch(() => props.visible, v => {
  if (v) form.value = props.feriado ? { ...props.feriado } : { data: '', nome: '', tipo: 'nacional', uf: '', municipio: '', recorrente: true }
  erros.value = { data: '', nome: '' }
})

async function salvar() {
  erros.value = { data: '', nome: '' }
  let ok = true
  if (!form.value.data) { erros.value.data = 'Obrigatório.'; ok = false }
  if (!form.value.nome.trim()) { erros.value.nome = 'Obrigatório.'; ok = false }
  if (!ok) return
  try {
    await store.salvarFeriado(form.value, isEdicao.value ? props.feriado.id : undefined)
    toast.add({ severity: 'success', summary: isEdicao.value ? 'Feriado atualizado.' : 'Feriado cadastrado.', life: 3000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}
</script>
<template>
  <Dialog :visible="visible" :header="isEdicao ? 'Editar Feriado' : 'Novo Feriado'" :style="{ width: '440px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="form-grid form-grid-2 py-1">
      <SgoFormField label="Data" field-id="data" required :error="erros.data">
        <DatePicker id="data" v-model="form.data" date-format="dd/mm/yy" show-icon class="w-full" :invalid="!!erros.data" />
      </SgoFormField>
      <SgoFormField label="Tipo" field-id="tipo">
        <Select id="tipo" v-model="form.tipo" :options="tipoOpts" option-label="label" option-value="value" />
      </SgoFormField>
      <SgoFormField label="Nome" field-id="nome" required :error="erros.nome" class="col-span-2">
        <InputText id="nome" v-model="form.nome" :invalid="!!erros.nome" placeholder="Ex: Natal" />
      </SgoFormField>
      <SgoFormField v-if="form.tipo !== 'nacional'" label="UF" field-id="uf">
        <Select id="uf" v-model="form.uf" :options="ufOpts" option-label="label" option-value="value" />
      </SgoFormField>
      <SgoFormField v-if="form.tipo === 'municipal'" label="Município" field-id="mun">
        <InputText id="mun" v-model="form.municipio" />
      </SgoFormField>
      <div class="flex items-center gap-2 col-span-2 mt-1">
        <ToggleSwitch v-model="form.recorrente" />
        <span class="text-sm text-slate-600">Recorrente todo ano</span>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Cancelar" severity="secondary" outlined @click="$emit('update:visible', false)" />
        <Button :label="isEdicao ? 'Salvar' : 'Cadastrar'" :loading="store.saving" @click="salvar" />
      </div>
    </template>
  </Dialog>
</template>
