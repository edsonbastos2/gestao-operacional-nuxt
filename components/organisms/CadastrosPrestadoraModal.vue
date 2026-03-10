<script setup lang="ts">
const props = defineProps<{ visible: boolean; prestadora?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()

const store = useCadastrosStore()
const toast = useToast()
const isEdicao = computed(() => !!props.prestadora?.id)

const form = ref({ razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '' })
const erros = ref({ razao_social: '', cnpj: '' })

watch(() => props.visible, (v) => {
  if (v && props.prestadora) form.value = { ...props.prestadora }
  else if (v) form.value = { razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '' }
  erros.value = { razao_social: '', cnpj: '' }
})

function validar() {
  erros.value = { razao_social: '', cnpj: '' }
  let ok = true
  if (!form.value.razao_social.trim()) { erros.value.razao_social = 'Obrigatório.'; ok = false }
  if (!form.value.cnpj.trim()) { erros.value.cnpj = 'Obrigatório.'; ok = false }
  return ok
}

async function salvar() {
  if (!validar()) return
  try {
    await store.salvarPrestadora(form.value, isEdicao.value ? props.prestadora.id : undefined)
    toast.add({ severity: 'success', summary: isEdicao.value ? 'Prestadora atualizada.' : 'Prestadora cadastrada.', life: 3000 })
    emit('saved'); emit('update:visible', false)
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro ao salvar.', life: 4000 }) }
}
</script>

<template>
  <Dialog :visible="visible" :header="isEdicao ? 'Editar Prestadora' : 'Nova Prestadora'" :style="{ width: '520px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="form-grid form-grid-2 py-1">
      <SgoFormField label="Razão Social" field-id="rs" required :error="erros.razao_social" class="col-span-2">
        <InputText id="rs" v-model="form.razao_social" placeholder="Nome empresarial completo" :invalid="!!erros.razao_social" />
      </SgoFormField>
      <SgoFormField label="Nome Fantasia" field-id="nf" class="col-span-2">
        <InputText id="nf" v-model="form.nome_fantasia" placeholder="Nome fantasia (opcional)" />
      </SgoFormField>
      <SgoFormField label="CNPJ" field-id="cnpj" required :error="erros.cnpj">
        <InputText id="cnpj" v-model="form.cnpj" placeholder="00.000.000/0000-00" :invalid="!!erros.cnpj" />
      </SgoFormField>
      <SgoFormField label="Telefone" field-id="tel">
        <InputText id="tel" v-model="form.telefone" placeholder="(00) 00000-0000" />
      </SgoFormField>
      <SgoFormField label="E-mail" field-id="email" class="col-span-2">
        <InputText id="email" v-model="form.email" type="email" placeholder="contato@empresa.com" />
      </SgoFormField>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Cancelar" severity="secondary" outlined @click="$emit('update:visible', false)" />
        <Button :label="isEdicao ? 'Salvar' : 'Cadastrar'" :icon="isEdicao ? 'pi pi-check' : 'pi pi-plus'" :loading="store.saving" @click="salvar" />
      </div>
    </template>
  </Dialog>
</template>
