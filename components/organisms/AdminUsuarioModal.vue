<script setup lang="ts">
import type { Usuario, CriarUsuarioPayload } from "~/stores/admin";

const props = defineProps<{
  visible: boolean;
  usuario?: Usuario | null;
}>();

const emit = defineEmits<{
  "update:visible": [boolean];
  saved: [];
  senhaGerada: [string];
}>();

const admin = useAdminStore();
const toast = useToast();
const isEdicao = computed(() => !!props.usuario?.id);
const abaAtiva = ref(0);

const form = ref({ nome: "", email: "", login: "", perfil: "" as any });
const erros = ref({ nome: "", email: "", login: "", perfil: "" });

const salvandoSenha = ref(false);
const senhaGerada = ref("");
const mostrarSenhaGerada = ref(false);
const confirmandoReset = ref(false);

const perfilOpts = [
  { label: "TI / Admin", value: "ti_admin" },
  { label: "Operação", value: "operacao" },
  { label: "RH", value: "rh" },
  { label: "Financeiro", value: "financeiro" },
  { label: "Controladoria", value: "controladoria" },
  { label: "Supervisor Externo", value: "supervisor_externo" },
];

watch(
  () => props.visible,
  (v) => {
    abaAtiva.value = 0;
    senhaGerada.value = "";
    mostrarSenhaGerada.value = false;
    confirmandoReset.value = false;
    salvandoSenha.value = false;

    if (v && props.usuario) {
      form.value = {
        nome: props.usuario.nome,
        email: props.usuario.email,
        login: props.usuario.login,
        perfil: props.usuario.perfil,
      };
      erros.value = { nome: "", email: "", login: "", perfil: "" };
    } else if (v) {
      form.value = { nome: "", email: "", login: "", perfil: "" };
      erros.value = { nome: "", email: "", login: "", perfil: "" };
    }
  },
);

function validar() {
  erros.value = { nome: "", email: "", login: "", perfil: "" };
  let ok = true;
  if (!form.value.nome.trim()) {
    erros.value.nome = "Obrigatório.";
    ok = false;
  }
  if (!form.value.email.trim()) {
    erros.value.email = "Obrigatório.";
    ok = false;
  }
  if (!isEdicao.value && !form.value.login.trim()) {
    erros.value.login = "Obrigatório.";
    ok = false;
  }
  if (!form.value.perfil) {
    erros.value.perfil = "Obrigatório.";
    ok = false;
  }
  return ok;
}

async function salvar() {
  if (!validar()) return;
  try {
    if (isEdicao.value) {
      await admin.atualizarUsuario(props.usuario!.id, {
        nome: form.value.nome,
        perfil: form.value.perfil,
      });
      toast.add({
        severity: "success",
        summary: "Usuário atualizado com sucesso.",
        life: 3000,
      });
      emit("saved");
      emit("update:visible", false);
    } else {
      const novo = await admin.criarUsuario(form.value as CriarUsuarioPayload);
      emit("senhaGerada", (novo as any)._senha_temp);
      emit("saved");
      emit("update:visible", false);
    }
  } catch {
    toast.add({
      severity: "error",
      summary: admin.error ?? "Erro ao salvar.",
      life: 4000,
    });
  }
}

async function resetarSenha() {
  salvandoSenha.value = true;
  confirmandoReset.value = false;
  try {
    const res = await admin.resetarSenha(props.usuario!.id);
    senhaGerada.value = res.senha_temp;
    mostrarSenhaGerada.value = true;
    toast.add({
      severity: "success",
      summary: "Senha temporária gerada com sucesso.",
      life: 3000,
    });
  } catch {
    toast.add({
      severity: "error",
      summary: "Erro ao resetar senha.",
      life: 4000,
    });
  } finally {
    salvandoSenha.value = false;
  }
}

function copiarSenha() {
  navigator.clipboard.writeText(senhaGerada.value);
  toast.add({ severity: "success", summary: "Senha copiada!", life: 2000 });
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="isEdicao ? `Editar — ${usuario?.nome}` : 'Novo usuário'"
    :style="{ width: '560px' }"
    modal
    @update:visible="$emit('update:visible', $event)"
  >
    <!-- Abas só em modo edição -->
    <Tabs
      v-if="isEdicao"
      v-model:value="abaAtiva"
      class="-mx-6 -mt-2 mb-5 border-b border-slate-100"
    >
      <TabList>
        <Tab :value="0"><i class="pi pi-user mr-2 text-xs" />Dados</Tab>
        <Tab :value="1"><i class="pi pi-lock mr-2 text-xs" />Senha</Tab>
      </TabList>
    </Tabs>

    <!-- ─── ABA DADOS (edição) ─── -->
    <template v-if="isEdicao">
      <div v-show="abaAtiva === 0" class="form-grid form-grid-2 py-1">
        <SgoFormField
          label="Nome completo"
          field-id="nome"
          required
          :error="erros.nome"
          class="col-span-2"
        >
          <InputText
            id="nome"
            v-model="form.nome"
            placeholder="Nome do usuário"
            :invalid="!!erros.nome"
          />
        </SgoFormField>

        <SgoFormField label="E-mail" field-id="email">
          <InputText
            id="email"
            v-model="form.email"
            type="email"
            disabled
            class="opacity-50 cursor-not-allowed"
          />
        </SgoFormField>

        <SgoFormField label="Login" field-id="login">
          <InputText
            id="login"
            v-model="form.login"
            disabled
            class="opacity-50 cursor-not-allowed"
          />
        </SgoFormField>

        <SgoFormField
          label="Perfil"
          field-id="perfil"
          required
          :error="erros.perfil"
          class="col-span-2"
        >
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

      <!-- ─── ABA SENHA ─── -->
      <div v-show="abaAtiva === 1" class="py-1 space-y-4">
        <!-- Senha gerada (exibida após reset) -->
        <Transition name="fade-slide">
          <div
            v-if="mostrarSenhaGerada"
            class="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <p
              class="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2"
            >
              <i class="pi pi-check-circle text-emerald-500" />
              Senha temporária gerada com sucesso
            </p>
            <div
              class="flex items-center gap-3 bg-slate-900 rounded-lg px-4 py-3 mb-2"
            >
              <code
                class="flex-1 font-mono text-lg text-green-400 tracking-widest select-all"
                >{{ senhaGerada }}</code
              >
              <Button
                icon="pi pi-copy"
                text
                rounded
                size="small"
                class="!text-slate-400 hover:!text-white"
                v-tooltip="'Copiar senha'"
                @click="copiarSenha"
              />
            </div>
            <p class="text-xs text-emerald-700">
              <i class="pi pi-info-circle mr-1" />
              Repasse esta senha ao usuário. Ele será obrigado a trocá-la no
              próximo login.
            </p>
          </div>
        </Transition>

        <!-- Card de reset -->
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"
            >
              <i class="pi pi-refresh text-amber-600" />
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-800">
                Resetar senha do usuário
              </p>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                Gera uma nova senha aleatória e força o usuário a trocar no
                próximo login. A senha atual será invalidada imediatamente.
              </p>

              <!-- Confirmação inline -->
              <div v-if="confirmandoReset" class="mt-3 flex items-center gap-2">
                <p class="text-xs text-amber-700 font-medium flex-1">
                  <i class="pi pi-exclamation-triangle mr-1" />
                  Confirma o reset de senha?
                </p>
                <Button
                  label="Sim, resetar"
                  icon="pi pi-check"
                  size="small"
                  severity="warning"
                  :loading="salvandoSenha"
                  @click="resetarSenha"
                />
                <Button
                  label="Cancelar"
                  size="small"
                  severity="secondary"
                  text
                  :disabled="salvandoSenha"
                  @click="confirmandoReset = false"
                />
              </div>

              <Button
                v-else
                label="Gerar senha temporária"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                class="mt-3"
                :loading="salvandoSenha"
                @click="confirmandoReset = true"
              />
            </div>
          </div>
        </div>

        <!-- Info status -->
        <div
          class="rounded-lg border border-slate-100 bg-white p-3 flex items-center gap-3"
        >
          <i class="pi pi-info-circle text-slate-400 text-sm" />
          <div class="text-xs text-slate-500 leading-relaxed">
            <span
              v-if="usuario?.primeiro_acesso"
              class="text-amber-600 font-medium"
            >
              Este usuário ainda não realizou o primeiro acesso.
            </span>
            <span v-else-if="usuario?.ultimo_acesso">
              Último acesso em
              <span class="font-medium text-slate-700">
                {{
                  new Date(usuario.ultimo_acesso).toLocaleDateString("pt-BR")
                }}
              </span>
              às
              <span class="font-medium text-slate-700">
                {{
                  new Date(usuario.ultimo_acesso).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }} </span
              >.
            </span>
            <span v-else>Usuário nunca acessou o sistema.</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ─── FORMULÁRIO CRIAÇÃO (sem abas) ─── -->
    <div v-else class="form-grid form-grid-2 py-1">
      <SgoFormField
        label="Nome completo"
        field-id="nome"
        required
        :error="erros.nome"
        class="col-span-2"
      >
        <InputText
          id="nome"
          v-model="form.nome"
          placeholder="Nome do usuário"
          :invalid="!!erros.nome"
        />
      </SgoFormField>

      <SgoFormField
        label="E-mail"
        field-id="email"
        required
        :error="erros.email"
      >
        <InputText
          id="email"
          v-model="form.email"
          type="email"
          placeholder="email@empresa.com"
          :invalid="!!erros.email"
        />
      </SgoFormField>

      <SgoFormField
        label="Login"
        field-id="login"
        required
        :error="erros.login"
      >
        <InputText
          id="login"
          v-model="form.login"
          placeholder="login.usuario"
          :invalid="!!erros.login"
        />
      </SgoFormField>

      <SgoFormField
        label="Perfil"
        field-id="perfil"
        required
        :error="erros.perfil"
        class="col-span-2"
      >
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
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          @click="$emit('update:visible', false)"
        />
        <Button
          v-if="!isEdicao || abaAtiva === 0"
          :label="isEdicao ? 'Salvar alterações' : 'Criar usuário'"
          :icon="isEdicao ? 'pi pi-check' : 'pi pi-plus'"
          :loading="admin.saving"
          @click="salvar"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
