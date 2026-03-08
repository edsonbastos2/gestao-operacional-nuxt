<!-- pages/primeiro-acesso.vue
     PAGE (Atomic Design): troca de senha obrigatória no primeiro acesso. -->
<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const router = useRouter()

onMounted(() => { if (!auth.isPrimeiroAcesso) router.replace('/dashboard') })

const form = ref({ nova: '', confirmar: '' })
const erros = ref({ nova: '', confirmar: '' })
const errorGeral = ref('')

function validar() {
  erros.value = { nova: '', confirmar: '' }
  let ok = true
  if (form.value.nova.length < 8) { erros.value.nova = 'Mínimo 8 caracteres.'; ok = false }
  if (form.value.nova !== form.value.confirmar) { erros.value.confirmar = 'Senhas não coincidem.'; ok = false }
  return ok
}

async function salvar() {
  if (!validar()) return
  errorGeral.value = ''
  try {
    await auth.trocarSenha(form.value.nova, form.value.confirmar)
    await router.push('/dashboard')
  } catch (e: any) {
    errorGeral.value = e?.data?.message ?? 'Erro ao trocar senha.'
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 mb-4 shadow-lg shadow-amber-200">
        <SgoIcon name="pi-lock" size="xl" color="white" />
      </div>
      <h1 class="text-xl font-bold text-slate-800">Primeiro acesso</h1>
      <p class="text-sm text-slate-400 mt-1">Defina uma senha para continuar.</p>
    </div>

    <div class="sgo-card shadow-sm">
      <SgoAlertBanner
        severity="info"
        message="Por segurança, você deve definir uma nova senha antes de continuar."
        class="mb-5"
      />
      <SgoAlertBanner
        v-if="errorGeral"
        severity="error"
        :message="errorGeral"
        closable
        class="mb-4"
        @close="errorGeral = ''"
      />

      <div class="flex flex-col gap-4">
        <SgoFormField label="Nova senha" field-id="nova" required :error="erros.nova">
          <Password id="nova" v-model="form.nova" placeholder="Mínimo 8 caracteres" toggle-mask />
        </SgoFormField>

        <SgoFormField label="Confirmar senha" field-id="confirmar" required :error="erros.confirmar">
          <Password id="confirmar" v-model="form.confirmar" placeholder="Repita a nova senha" :feedback="false" toggle-mask @keyup.enter="salvar" />
        </SgoFormField>

        <Button label="Definir senha e entrar" class="w-full mt-2" :loading="auth.loading" @click="salvar" />
      </div>
    </div>
  </div>
</template>
