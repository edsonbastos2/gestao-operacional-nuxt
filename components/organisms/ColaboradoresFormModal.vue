<script setup lang="ts">
const props = defineProps<{ visible: boolean; colaborador?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()
const store = useColaboradoresStore()
const cadastros = useCadastrosStore()
const toast = useToast()
const isEdicao = computed(() => !!props.colaborador?.id)

const sexoOpts = [{ label: 'Masculino', value: 'M' }, { label: 'Feminino', value: 'F' }, { label: 'Outro', value: 'O' }]
const estadoCivilOpts = [
  { label: 'Solteiro(a)', value: 'solteiro' }, { label: 'Casado(a)', value: 'casado' },
  { label: 'Divorciado(a)', value: 'divorciado' }, { label: 'Viúvo(a)', value: 'viuvo' },
  { label: 'União Estável', value: 'uniao_estavel' }
]
const tipoSangOpts = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ label: v, value: v }))
const tipoContaOpts = [{ label: 'Corrente', value: 'corrente' }, { label: 'Poupança', value: 'poupanca' }, { label: 'Salário', value: 'salario' }]
const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const ufOpts = ufs.map(u => ({ label: u, value: u }))

const emptyForm = () => ({ nome: '', cpf: '', matricula: '', prestadora_id: '', data_admissao: '',
  rg: '', rg_orgao: '', rg_data_emissao: '', data_nasc: '', sexo: '', estado_civil: '', tipo_sanguineo: '',
  nome_mae: '', nome_pai: '', email: '', telefone: '', telefone2: '',
  cep: '', endereco: '', complemento: '', bairro: '', cidade: '', uf: '',
  pis_pasep: '', ctps_numero: '', ctps_serie: '', ctps_uf: '',
  titulo_eleitor: '', cnh: '', cnh_categoria: '', cnh_validade: '',
  banco: '', agencia: '', conta: '', tipo_conta: '' })

const form = ref<any>(emptyForm())
const erros = ref({ nome: '', cpf: '', data_admissao: '', prestadora_id: '' })

const prestadoraOpts = computed(() => cadastros.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id })))

watch(() => props.visible, v => {
  if (v) {
    cadastros.listarPrestadoras({ status: 'ativo' })
    form.value = props.colaborador ? { ...props.colaborador } : emptyForm()
    erros.value = { nome: '', cpf: '', data_admissao: '', prestadora_id: '' }
  }
})

async function salvar() {
  erros.value = { nome: '', cpf: '', data_admissao: '', prestadora_id: '' }
  let ok = true
  if (!form.value.nome?.trim()) { erros.value.nome = 'Obrigatório.'; ok = false }
  if (!form.value.cpf?.trim()) { erros.value.cpf = 'Obrigatório.'; ok = false }
  if (!form.value.data_admissao) { erros.value.data_admissao = 'Obrigatório.'; ok = false }
  if (!form.value.prestadora_id) { erros.value.prestadora_id = 'Obrigatório.'; ok = false }
  if (!ok) return
  try {
    await store.salvarColaborador(form.value, isEdicao.value ? props.colaborador.id : undefined)
    toast.add({ severity: 'success', summary: isEdicao.value ? 'Colaborador atualizado.' : 'Colaborador cadastrado.', life: 3000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro ao salvar.', life: 4000 }) }
}
</script>

<template>
  <Dialog :visible="visible" :header="isEdicao ? 'Editar Colaborador' : 'Novo Colaborador'" :style="{ width: '700px' }" modal @update:visible="$emit('update:visible', $event)">
    <Tabs :value="0">
      <TabList>
        <Tab :value="0">Pessoal</Tab>
        <Tab :value="1">Documentos</Tab>
        <Tab :value="2">Endereço</Tab>
        <Tab :value="3">Bancário</Tab>
        <Tab :value="4">Vínculo</Tab>
      </TabList>
      <TabPanels>
        <!-- Aba Pessoal -->
        <TabPanel :value="0">
          <div class="form-grid form-grid-2 py-2">
            <SgoFormField label="Nome completo" field-id="nome" required :error="erros.nome" class="col-span-2">
              <InputText id="nome" v-model="form.nome" :invalid="!!erros.nome" />
            </SgoFormField>
            <SgoFormField label="CPF" field-id="cpf" required :error="erros.cpf">
              <InputText id="cpf" v-model="form.cpf" :invalid="!!erros.cpf" />
            </SgoFormField>
            <SgoFormField label="Data de nascimento" field-id="dn">
              <DatePicker id="dn" v-model="form.data_nasc" date-format="dd/mm/yy" show-icon class="w-full" />
            </SgoFormField>
            <SgoFormField label="Sexo" field-id="sexo">
              <Select id="sexo" v-model="form.sexo" :options="sexoOpts" option-label="label" option-value="value" placeholder="Selecione" />
            </SgoFormField>
            <SgoFormField label="Estado civil" field-id="ec">
              <Select id="ec" v-model="form.estado_civil" :options="estadoCivilOpts" option-label="label" option-value="value" placeholder="Selecione" />
            </SgoFormField>
            <SgoFormField label="Tipo sanguíneo" field-id="ts">
              <Select id="ts" v-model="form.tipo_sanguineo" :options="tipoSangOpts" option-label="label" option-value="value" placeholder="Selecione" />
            </SgoFormField>
            <SgoFormField label="Nome da mãe" field-id="mae" class="col-span-2">
              <InputText id="mae" v-model="form.nome_mae" />
            </SgoFormField>
            <SgoFormField label="Nome do pai" field-id="pai" class="col-span-2">
              <InputText id="pai" v-model="form.nome_pai" />
            </SgoFormField>
            <SgoFormField label="E-mail" field-id="email" class="col-span-2">
              <InputText id="email" v-model="form.email" type="email" />
            </SgoFormField>
            <SgoFormField label="Telefone" field-id="tel">
              <InputText id="tel" v-model="form.telefone" />
            </SgoFormField>
            <SgoFormField label="Telefone 2" field-id="tel2">
              <InputText id="tel2" v-model="form.telefone2" />
            </SgoFormField>
          </div>
        </TabPanel>
        <!-- Aba Documentos -->
        <TabPanel :value="1">
          <div class="form-grid form-grid-2 py-2">
            <SgoFormField label="RG" field-id="rg">
              <InputText id="rg" v-model="form.rg" />
            </SgoFormField>
            <SgoFormField label="Órgão emissor" field-id="rg_org">
              <InputText id="rg_org" v-model="form.rg_orgao" />
            </SgoFormField>
            <SgoFormField label="PIS/PASEP" field-id="pis">
              <InputText id="pis" v-model="form.pis_pasep" />
            </SgoFormField>
            <SgoFormField label="CTPS Número" field-id="ctps">
              <InputText id="ctps" v-model="form.ctps_numero" />
            </SgoFormField>
            <SgoFormField label="CTPS Série" field-id="ctps_s">
              <InputText id="ctps_s" v-model="form.ctps_serie" />
            </SgoFormField>
            <SgoFormField label="CTPS UF" field-id="ctps_uf">
              <Select id="ctps_uf" v-model="form.ctps_uf" :options="ufOpts" option-label="label" option-value="value" />
            </SgoFormField>
            <SgoFormField label="Título de eleitor" field-id="te">
              <InputText id="te" v-model="form.titulo_eleitor" />
            </SgoFormField>
            <SgoFormField label="CNH" field-id="cnh">
              <InputText id="cnh" v-model="form.cnh" />
            </SgoFormField>
            <SgoFormField label="Categoria CNH" field-id="cnhcat">
              <InputText id="cnhcat" v-model="form.cnh_categoria" placeholder="A, B, AB..." />
            </SgoFormField>
            <SgoFormField label="Validade CNH" field-id="cnhval">
              <DatePicker id="cnhval" v-model="form.cnh_validade" date-format="dd/mm/yy" show-icon class="w-full" />
            </SgoFormField>
          </div>
        </TabPanel>
        <!-- Aba Endereço -->
        <TabPanel :value="2">
          <div class="form-grid form-grid-2 py-2">
            <SgoFormField label="CEP" field-id="cep">
              <InputText id="cep" v-model="form.cep" placeholder="00000-000" />
            </SgoFormField>
            <div />
            <SgoFormField label="Endereço" field-id="end" class="col-span-2">
              <InputText id="end" v-model="form.endereco" placeholder="Rua, número" />
            </SgoFormField>
            <SgoFormField label="Complemento" field-id="comp">
              <InputText id="comp" v-model="form.complemento" placeholder="Apto, bloco..." />
            </SgoFormField>
            <SgoFormField label="Bairro" field-id="bairro">
              <InputText id="bairro" v-model="form.bairro" />
            </SgoFormField>
            <SgoFormField label="Cidade" field-id="cidade">
              <InputText id="cidade" v-model="form.cidade" />
            </SgoFormField>
            <SgoFormField label="UF" field-id="uf">
              <Select id="uf" v-model="form.uf" :options="ufOpts" option-label="label" option-value="value" />
            </SgoFormField>
          </div>
        </TabPanel>
        <!-- Aba Bancário -->
        <TabPanel :value="3">
          <div class="form-grid form-grid-2 py-2">
            <SgoFormField label="Banco" field-id="banco" class="col-span-2">
              <InputText id="banco" v-model="form.banco" placeholder="Nome ou código do banco" />
            </SgoFormField>
            <SgoFormField label="Agência" field-id="agencia">
              <InputText id="agencia" v-model="form.agencia" />
            </SgoFormField>
            <SgoFormField label="Conta" field-id="conta">
              <InputText id="conta" v-model="form.conta" />
            </SgoFormField>
            <SgoFormField label="Tipo de conta" field-id="tp_conta">
              <Select id="tp_conta" v-model="form.tipo_conta" :options="tipoContaOpts" option-label="label" option-value="value" />
            </SgoFormField>
          </div>
        </TabPanel>
        <!-- Aba Vínculo -->
        <TabPanel :value="4">
          <div class="form-grid form-grid-2 py-2">
            <SgoFormField label="Prestadora" field-id="prest" required :error="erros.prestadora_id" class="col-span-2">
              <Select id="prest" v-model="form.prestadora_id" :options="prestadoraOpts" option-label="label" option-value="value" :invalid="!!erros.prestadora_id" />
            </SgoFormField>
            <SgoFormField label="Data de admissão" field-id="da" required :error="erros.data_admissao">
              <DatePicker id="da" v-model="form.data_admissao" date-format="dd/mm/yy" show-icon class="w-full" :invalid="!!erros.data_admissao" />
            </SgoFormField>
            <SgoFormField label="Matrícula" field-id="mat">
              <InputText id="mat" v-model="form.matricula" />
            </SgoFormField>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Cancelar" severity="secondary" outlined @click="$emit('update:visible', false)" />
        <Button :label="isEdicao ? 'Salvar' : 'Cadastrar'" :loading="store.saving" @click="salvar" />
      </div>
    </template>
  </Dialog>
</template>
