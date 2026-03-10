<script setup lang="ts">
const props = defineProps<{ visible: boolean; candidato?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()
const store = useColaboradoresStore()
const cadastros = useCadastrosStore()
const toast = useToast()

const form = ref<any>({ prestadora_id: '', data_admissao: '', matricula: '' })
const erros = ref({ prestadora_id: '', data_admissao: '' })

watch(() => props.visible, v => {
  if (v) {
    cadastros.listarPrestadoras({ status: 'ativo' })
    form.value = { prestadora_id: '', data_admissao: '', matricula: '' }
    erros.value = { prestadora_id: '', data_admissao: '' }
  }
})

const prestadoraOpts = computed(() => cadastros.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id })))

async function confirmar() {
  erros.value = { prestadora_id: '', data_admissao: '' }
  let ok = true
  if (!form.value.prestadora_id) { erros.value.prestadora_id = 'Obrigatório.'; ok = false }
  if (!form.value.data_admissao) { erros.value.data_admissao = 'Obrigatório.'; ok = false }
  if (!ok) return
  try {
    await store.promoverParaColaborador(props.candidato.id, form.value)
    toast.add({ severity: 'success', summary: `${props.candidato.nome} promovido a colaborador!`, life: 4000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro ao promover.', life: 4000 }) }
}
</script>

<template>
  <Dialog :visible="visible" header="Promover a Colaborador" :style="{ width: '440px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="space-y-4 py-1">
      <div class="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
        <i class="pi pi-info-circle mr-2" />
        <strong>{{ candidato?.nome }}</strong> será convertido em colaborador. Os dados pessoais serão herdados do cadastro de candidato.
      </div>
      <div class="form-grid form-grid-1">
        <SgoFormField label="Prestadora" field-id="prest" required :error="erros.prestadora_id">
          <Select id="prest" v-model="form.prestadora_id" :options="prestadoraOpts" option-label="label" option-value="value" placeholder="Selecione" :invalid="!!erros.prestadora_id" />
        </SgoFormField>
        <SgoFormField label="Data de admissão" field-id="da" required :error="erros.data_admissao">
          <DatePicker id="da" v-model="form.data_admissao" date-format="dd/mm/yy" show-icon class="w-full" :invalid="!!erros.data_admissao" />
        </SgoFormField>
        <SgoFormField label="Matrícula" field-id="mat">
          <InputText id="mat" v-model="form.matricula" placeholder="Número da matrícula (opcional)" />
        </SgoFormField>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Cancelar" severity="secondary" outlined @click="$emit('update:visible', false)" />
        <Button label="Promover" icon="pi pi-user-edit" :loading="store.saving" @click="confirmar" />
      </div>
    </template>
  </Dialog>
</template>
