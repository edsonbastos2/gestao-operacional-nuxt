<!-- pages/login.vue
     PAGE (Atomic Design): página de login. Instancia o template "auth".
     Orquestra a molécula SgoFormField e o átomo SgoAlertBanner. -->
<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const router = useRouter()

const form = ref({ email: '', senha: '' })
const erros = ref({ email: '', senha: '' })
const errorGeral = ref('')

function validar() {
  erros.value = { email: '', senha: '' }
  let ok = true
  if (!form.value.email) { erros.value.email = 'Obrigatório.'; ok = false }
  if (!form.value.senha) { erros.value.senha  = 'Obrigatório.'; ok = false }
  return ok
}

async function entrar() {
  if (!validar()) return
  errorGeral.value = ''
  try {
    await auth.login(form.value.email, form.value.senha)
    await router.push(auth.isPrimeiroAcesso ? '/primeiro-acesso' : '/dashboard')
  } catch (e: any) {
    errorGeral.value = e?.data?.message ?? 'Credenciais inválidas.'
  }
}
</script>

<template>
  <div class="w-full max-w-md">

    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-200">
        <SgoIcon name="pi-bolt" size="xl" color="white" />
      </div>
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">SGO</h1>
      <p class="text-sm text-slate-400 mt-1">Sistema de Gestão Operacional</p>
    </div>

    <!-- Card de login -->
    <div class="sgo-card shadow-sm">
      <h2 class="text-base font-semibold text-slate-700 mb-5">Acesse sua conta</h2>

      <SgoAlertBanner
        v-if="errorGeral"
        severity="error"
        :message="errorGeral"
        closable
        class="mb-4"
        @close="errorGeral = ''"
      />

      <div class="flex flex-col gap-4">
        <SgoFormField label="E-mail" field-id="email" required :error="erros.email">
          <InputText
            id="email"
            v-model="form.email"
            type="email"
            placeholder="seu@email.com"
            :invalid="!!erros.email"
            :disabled="auth.loading"
            @keyup.enter="entrar"
          />
        </SgoFormField>

        <SgoFormField label="Senha" field-id="senha" required :error="erros.senha">
          <Password
            id="senha"
            v-model="form.senha"
            placeholder="Sua senha"
            :invalid="!!erros.senha"
            :disabled="auth.loading"
            :feedback="false"
            toggle-mask
            @keyup.enter="entrar"
          />
        </SgoFormField>

        <Button
          label="Entrar"
          class="w-full mt-2"
          :loading="auth.loading"
          @click="entrar"
        />

        <p class="text-center">
          <NuxtLink to="/recuperar-senha" class="text-sm text-blue-600 hover:text-blue-800">
            Esqueceu sua senha?
          </NuxtLink>
        </p>
      </div>
    </div>

    <p class="text-center text-xs text-slate-300 mt-6">
      {{ $config.public.appName }} · v{{ $config.public.appVersion }}
    </p>
  </div>
</template>
