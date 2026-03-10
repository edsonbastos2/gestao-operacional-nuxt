<script setup lang="ts">
const props = defineProps<{ visible: boolean; candidato?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()
const store = useColaboradoresStore()
const cadastros = useCadastrosStore()
const toast = useToast()
const isEdicao = computed(() => !!props.candidato?.id)

const form = ref<any>({ nome: '', cpf: '', rg: '', data_nasc: '', sexo: '', email: '', telefone: '', cep: '', endereco: '', cidade: '', uf: '', funcao_id: '', posto_id: '', observacoes: '' })
const erros = ref({ nome: '', cpf: '' })

const sexoOpts = [{ label: 'Masculino', value: 'M' }, { label: 'Feminino', value: 'F' }, { label: 'Outro', value: 'O' }]

watch(() => props.visible, v => {
  if (v) {
    cadastros.listarFuncoes({ status: 'ativo' })
    cadastros.listarPostos({ status: 'ativo' })
    form.value = props.candidato ? { ...props.candidato } : { nome: '', cpf: '', rg: '', data_nasc: '', sexo: '', email: '', telefone: '', cep: '', endereco: '', cidade: '', uf: '', funcao_id: '', posto_id: '', observacoes: '' }
    erros.value = { nome: '', cpf: '' }
  }
})

async function salvar() {
  erros.value = { nome: '', cpf: '' }
  let ok = true
  if (!form.value.nome.trim()) { erros.value.nome = 'Obrigatório.'; ok = false }
  if (!form.value.cpf.trim()) { erros.value.cpf = 'Obrigatório.'; ok = false }
  if (!ok) return
  try {
    await store.salvarCandidato(form.value, isEdicao.value ? props.candidato.id : undefined)
    toast.add({ severity: 'success', summary: isEdicao.value ? 'Candidato atualizado.' : 'Candidato cadastrado.', life: 3000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro ao salvar.', life: 4000 }) }
}

const funcaoOpts = computed(() => cadastros.funcoes.map(f => ({ label: f.nome, value: f.id })))
const postoOpts = computed(() => cadastros.postos.map(p => ({ label: p.nome, value: p.id })))
</script>

<template>
  <Dialog :visible="visible" :header="isEdicao ? 'Editar Candidato' : 'Novo Candidato'" :style="{ width: '560px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="form-grid form-grid-2 py-1">
      <SgoFormField label="Nome completo" field-id="nome" required :error="erros.nome" class="col-span-2">
        <InputText id="nome" v-model="form.nome" :invalid="!!erros.nome" />
      </SgoFormField>
      <SgoFormField label="CPF" field-id="cpf" required :error="erros.cpf">
        <InputText id="cpf" v-model="form.cpf" placeholder="000.000.000-00" :invalid="!!erros.cpf" />
      </SgoFormField>
      <SgoFormField label="RG" field-id="rg">
        <InputText id="rg" v-model="form.rg" />
      </SgoFormField>
      <SgoFormField label="Data de nascimento" field-id="dn">
        <DatePicker id="dn" v-model="form.data_nasc" date-format="dd/mm/yy" show-icon class="w-full" />
      </SgoFormField>
      <SgoFormField label="Sexo" field-id="sexo">
        <Select id="sexo" v-model="form.sexo" :options="sexoOpts" option-label="label" option-value="value" placeholder="Selecione" />
      </SgoFormField>
      <SgoFormField label="E-mail" field-id="email" class="col-span-2">
        <InputText id="email" v-model="form.email" type="email" />
      </SgoFormField>
      <SgoFormField label="Telefone" field-id="tel">
        <InputText id="tel" v-model="form.telefone" />
      </SgoFormField>
      <SgoFormField label="Cidade / UF" field-id="cidade">
        <InputText id="cidade" v-model="form.cidade" placeholder="Cidade" />
      </SgoFormField>
      <SgoFormField label="Função pretendida" field-id="func" class="col-span-2">
        <Select id="func" v-model="form.funcao_id" :options="funcaoOpts" option-label="label" option-value="value" placeholder="Selecione a função" />
      </SgoFormField>
      <SgoFormField label="Posto pretendido" field-id="posto" class="col-span-2">
        <Select id="posto" v-model="form.posto_id" :options="postoOpts" option-label="label" option-value="value" placeholder="Selecione o posto" />
      </SgoFormField>
      <SgoFormField label="Observações" field-id="obs" class="col-span-2">
        <Textarea id="obs" v-model="form.observacoes" rows="2" class="w-full" />
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
