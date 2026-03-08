<!-- organisms/AdminUsuarioModal.vue
     ORGANISM: modal de criação/edição de usuário.
     Usa moléculas SgoFormField e átomos SgoIcon. -->
<script setup lang="ts">
import type { Usuario, CriarUsuarioPayload } from '~/stores/admin'

const props = defineProps<{
  visible: boolean
  usuario?: Usuario | null
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  saved: []
}>()

const admin = useAdminStore()
const toast = useToast()
const isEdicao = computed(() => !!props.usuario?.id)

const form = ref({ nome: '', email: '', login: '', perfil: '' as any })
const erros = ref({ nome: '', email: '', login: '', perfil: '' })

const perfilOpts = [
  { label: 'TI / Admin',        value: 'ti_admin' },
  { label: 'Operação',          value: 'operacao' },
  { label: 'RH',                value: 'rh' },
  { label: 'Financeiro',        value: 'financeiro' },
  { label: 'Controladoria',     value: 'controladoria' },
  { label: 'Supervisor Externo',value: 'supervisor_externo' },
]

// Preenche form ao abrir edição
watch(() => props.visible, (v) => {
  if (v && props.usuario) {
    form.value = { nome: props.usuario.nome, email: props.usuario.email, login: props.usuario.login, perfil: props.usuario.perfil }
  } else if (v) {
    form.value = { nome: '', email: '', login: '', perfil: '' }
    erros.value = { nome: '', email: '', login: '', perfil: '' }
  }
})

function validar() {
  erros.value = { nome: '', email: '', login: '', perfil: '' }
  let ok = true
  if (!form.value.nome.trim()) { erros.value.nome = 'Obrigatório.'; ok = false }
  if (!form.value.email.trim()) { erros.value.email = 'Obrigatório.'; ok = false }
  if (!isEdicao.value && !form.value.login.trim()) { erros.value.login = 'Obrigatório.'; ok = false }
  if (!form.value.perfil) { erros.value.perfil = 'Obrigatório.'; ok = false }
  return ok
}

async function salvar() {
  if (!validar()) return
  try {
    if (isEdicao.value) {
      await admin.atualizarUsuario(props.usuario!.id, { nome: form.value.nome, perfil: form.value.perfil })
      toast.add({ severity: 'success', summary: 'Usuário atualizado.', life: 3000 })
    } else {
      const novo = await admin.criarUsuario(form.value as CriarUsuarioPayload)
      toast.add({ severity: 'success', summary: `Usuário criado. Senha temp: ${(novo as any)._senha_temp}`, life: 8000 })
    }
    emit('saved')
    emit('update:visible', false)
  } catch {
    toast.add({ severity: 'error', summary: admin.error ?? 'Erro ao salvar.', life: 4000 })
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="isEdicao ? 'Editar usuário' : 'Novo usuário'"
    :style="{ width: '520px' }"
    modal
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="form-grid form-grid-2 py-1">
      <SgoFormField label="Nome completo" field-id="nome" required :error="erros.nome" class="col-span-2">
        <InputText id="nome" v-model="form.nome" placeholder="Nome do usuário" :invalid="!!erros.nome" />
      </SgoFormField>

      <SgoFormField label="E-mail" field-id="email" required :error="erros.email">
        <InputText id="email" v-model="form.email" type="email" placeholder="email@empresa.com" :invalid="!!erros.email" :disabled="isEdicao" />
      </SgoFormField>

      <SgoFormField label="Login" field-id="login" required :error="erros.login">
        <InputText id="login" v-model="form.login" placeholder="login.usuario" :invalid="!!erros.login" :disabled="isEdicao" />
      </SgoFormField>

      <SgoFormField label="Perfil" field-id="perfil" required :error="erros.perfil" class="col-span-2">
        <Select
          id="perfil"
          v-model="form.perfil"
          :options="perfilOpts"
          option-label="label"
          option-value="value"
          placeholder="Selecione o perfil"
          :invalid="!!erros.perfil"
        />
      </SgoFormField>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Cancelar" severity="secondary" outlined @click="$emit('update:visible', false)" />
        <Button :label="isEdicao ? 'Salvar' : 'Criar usuário'" :loading="admin.saving" @click="salvar" />
      </div>
    </template>
  </Dialog>
</template>
