<script setup lang="ts">
const props = defineProps<{ visible: boolean; tomador?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()

const store = useCadastrosStore()
const toast = useToast()
const isEdicao = computed(() => !!props.tomador?.id)

const tipoVtOpts = [{ label: 'Dinheiro', value: 'dinheiro' }, { label: 'Cartão', value: 'cartao' }, { label: 'Vale', value: 'vale' }]

const form = ref<any>({ prestadora_id: '', razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '',
  usa_vt: false, tipo_vt: null, valor_vt_dia: null, dias_uteis_vt: 22,
  usa_va: false, valor_va_dia: null, dias_uteis_va: 22 })
const erros = ref({ prestadora_id: '', razao_social: '', cnpj: '' })

const prestadoraOpts = computed(() => store.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id })))

watch(() => props.visible, (v) => {
  if (v) {
    store.listarPrestadoras({ status: 'ativo' })
    if (props.tomador) form.value = { ...props.tomador }
    else form.value = { prestadora_id: '', razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '',
      usa_vt: false, tipo_vt: null, valor_vt_dia: null, dias_uteis_vt: 22,
      usa_va: false, valor_va_dia: null, dias_uteis_va: 22 }
    erros.value = { prestadora_id: '', razao_social: '', cnpj: '' }
  }
})

function validar() {
  erros.value = { prestadora_id: '', razao_social: '', cnpj: '' }
  let ok = true
  if (!form.value.prestadora_id) { erros.value.prestadora_id = 'Obrigatório.'; ok = false }
  if (!form.value.razao_social.trim()) { erros.value.razao_social = 'Obrigatório.'; ok = false }
  if (!form.value.cnpj.trim()) { erros.value.cnpj = 'Obrigatório.'; ok = false }
  return ok
}

async function salvar() {
  if (!validar()) return
  try {
    await store.salvarTomador(form.value, isEdicao.value ? props.tomador.id : undefined)
    toast.add({ severity: 'success', summary: isEdicao.value ? 'Tomador atualizado.' : 'Tomador cadastrado.', life: 3000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro ao salvar.', life: 4000 }) }
}
</script>

<template>
  <Dialog :visible="visible" :header="isEdicao ? 'Editar Tomador' : 'Novo Tomador'" :style="{ width: '580px' }" modal @update:visible="$emit('update:visible', $event)">
    <Tabs :value="0" class="-mx-6 -mt-2 mb-5 border-b border-slate-100">
      <TabList><Tab :value="0"><i class="pi pi-building mr-2 text-xs" />Dados</Tab><Tab :value="1"><i class="pi pi-wallet mr-2 text-xs" />Benefícios</Tab></TabList>
      <TabPanels>
        <TabPanel :value="0">
          <div class="form-grid form-grid-2 py-1">
            <SgoFormField label="Prestadora" field-id="prest" required :error="erros.prestadora_id" class="col-span-2">
              <Select id="prest" v-model="form.prestadora_id" :options="prestadoraOpts" option-label="label" option-value="value" placeholder="Selecione a prestadora" :invalid="!!erros.prestadora_id" />
            </SgoFormField>
            <SgoFormField label="Razão Social" field-id="rs" required :error="erros.razao_social" class="col-span-2">
              <InputText id="rs" v-model="form.razao_social" :invalid="!!erros.razao_social" />
            </SgoFormField>
            <SgoFormField label="Nome Fantasia" field-id="nf" class="col-span-2">
              <InputText id="nf" v-model="form.nome_fantasia" />
            </SgoFormField>
            <SgoFormField label="CNPJ" field-id="cnpj" required :error="erros.cnpj">
              <InputText id="cnpj" v-model="form.cnpj" :invalid="!!erros.cnpj" />
            </SgoFormField>
            <SgoFormField label="Telefone" field-id="tel">
              <InputText id="tel" v-model="form.telefone" />
            </SgoFormField>
            <SgoFormField label="E-mail" field-id="email" class="col-span-2">
              <InputText id="email" v-model="form.email" type="email" />
            </SgoFormField>
          </div>
        </TabPanel>
        <TabPanel :value="1">
          <div class="space-y-4 py-1">
            <div class="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div class="flex items-center gap-3 mb-3">
                <ToggleSwitch v-model="form.usa_vt" />
                <span class="font-semibold text-slate-700">Vale Transporte (VT)</span>
              </div>
              <div v-if="form.usa_vt" class="form-grid form-grid-3 mt-2">
                <SgoFormField label="Tipo" field-id="tipo_vt">
                  <Select id="tipo_vt" v-model="form.tipo_vt" :options="tipoVtOpts" option-label="label" option-value="value" />
                </SgoFormField>
                <SgoFormField label="Valor/dia (R$)" field-id="vvt">
                  <InputNumber id="vvt" v-model="form.valor_vt_dia" :min-fraction-digits="2" :max-fraction-digits="2" />
                </SgoFormField>
                <SgoFormField label="Dias úteis" field-id="dvt">
                  <InputNumber id="dvt" v-model="form.dias_uteis_vt" :min="1" :max="31" />
                </SgoFormField>
              </div>
            </div>
            <div class="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <div class="flex items-center gap-3 mb-3">
                <ToggleSwitch v-model="form.usa_va" />
                <span class="font-semibold text-slate-700">Vale Alimentação (VA)</span>
              </div>
              <div v-if="form.usa_va" class="form-grid form-grid-2 mt-2">
                <SgoFormField label="Valor/dia (R$)" field-id="vva">
                  <InputNumber id="vva" v-model="form.valor_va_dia" :min-fraction-digits="2" :max-fraction-digits="2" />
                </SgoFormField>
                <SgoFormField label="Dias úteis" field-id="dva">
                  <InputNumber id="dva" v-model="form.dias_uteis_va" :min="1" :max="31" />
                </SgoFormField>
              </div>
            </div>
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
