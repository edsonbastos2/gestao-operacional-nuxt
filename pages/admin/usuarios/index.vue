<script setup lang="ts">
definePageMeta({ layout: "default" });

const admin = useAdminStore();
const auth = useAuthStore();
const toast = useToast();

onMounted(async () => {
  if (!auth.isAdmin) {
    await navigateTo("/dashboard");
    return;
  }
  await admin.listarUsuarios();
});

const q = ref("");
const filtroPerfil = ref("");
const filtroStatus = ref("");

const perfilOpts = [
  { label: "Todos os perfis", value: "" },
  { label: "TI / Admin", value: "ti_admin" },
  { label: "Operação", value: "operacao" },
  { label: "RH", value: "rh" },
  { label: "Financeiro", value: "financeiro" },
  { label: "Controladoria", value: "controladoria" },
  { label: "Supervisor Externo", value: "supervisor_externo" },
];

const statusOpts = [
  { label: "Todos", value: "" },
  { label: "Ativo", value: "ativo" },
  { label: "Inativo", value: "inativo" },
];

const perfilLabel: Record<string, string> = {
  ti_admin: "TI / Admin",
  operacao: "Operação",
  rh: "RH",
  financeiro: "Financeiro",
  controladoria: "Controladoria",
  supervisor_externo: "Supervisor Ext.",
};

const perfilColor: Record<string, string> = {
  ti_admin: "bg-violet-100 text-violet-700 border-violet-200",
  operacao: "bg-blue-100 text-blue-700 border-blue-200",
  rh: "bg-pink-100 text-pink-700 border-pink-200",
  financeiro: "bg-emerald-100 text-emerald-700 border-emerald-200",
  controladoria: "bg-orange-100 text-orange-700 border-orange-200",
  supervisor_externo: "bg-slate-100 text-slate-600 border-slate-200",
};

async function buscar() {
  await admin.listarUsuarios({
    q: q.value,
    perfil: filtroPerfil.value,
    status: filtroStatus.value,
  });
}

let debounceTimer: ReturnType<typeof setTimeout>;
function buscarDebounced() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(buscar, 350);
}

function limparFiltros() {
  q.value = "";
  filtroPerfil.value = "";
  filtroStatus.value = "";
  buscar();
}

const usuarioSelecionado = ref<any>(null);
const modalCriar = ref(false);
const modalEditar = ref(false);
const modalCapacidades = ref(false);
const confirmStatus = ref(false);
const confirmDesbloquear = ref(false);
const modalSenhaTemp = ref(false);
const senhaTemp = ref("");

function abrirEditar(u: any) {
  usuarioSelecionado.value = u;
  modalEditar.value = true;
}
function abrirCapacidades(u: any) {
  usuarioSelecionado.value = u;
  modalCapacidades.value = true;
}
function abrirConfirmStatus(u: any) {
  usuarioSelecionado.value = u;
  confirmStatus.value = true;
}
function abrirDesbloquear(u: any) {
  usuarioSelecionado.value = u;
  confirmDesbloquear.value = true;
}

function onSenhaGerada(senha: string) {
  senhaTemp.value = senha;
  modalSenhaTemp.value = true;
}

async function confirmarStatus(justificativa: string) {
  try {
    await admin.alternarStatus(usuarioSelecionado.value.id, justificativa);
    toast.add({
      severity: "success",
      summary: "Status alterado com sucesso.",
      life: 3000,
    });
  } catch {
    toast.add({
      severity: "error",
      summary: admin.error ?? "Erro.",
      life: 4000,
    });
  } finally {
    confirmStatus.value = false;
  }
}

async function confirmarDesbloquear() {
  try {
    await admin.desbloquear(usuarioSelecionado.value.id);
    toast.add({
      severity: "success",
      summary: "Usuário desbloqueado.",
      life: 3000,
    });
  } catch {
    toast.add({
      severity: "error",
      summary: "Erro ao desbloquear.",
      life: 4000,
    });
  } finally {
    confirmDesbloquear.value = false;
  }
}

function copiarSenha() {
  navigator.clipboard.writeText(senhaTemp.value);
  toast.add({ severity: "success", summary: "Copiado!", life: 2000 });
}

const temFiltrosAtivos = computed(
  () => !!(q.value || filtroPerfil.value || filtroStatus.value),
);
const totalAtivos = computed(
  () => admin.usuarios.filter((u) => u.status === "ativo").length,
);
const totalInativos = computed(
  () => admin.usuarios.filter((u) => u.status === "inativo").length,
);
const totalBloq = computed(
  () => admin.usuarios.filter((u: any) => u.tentativas_login >= 5).length,
);

function formatarData(dt: string | null) {
  if (!dt) return null;
  const d = new Date(dt);
  return {
    data: d.toLocaleDateString("pt-BR"),
    hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

// Menu de ações por linha
const menu = ref();
const menuUsuario = ref<any>(null);

function abrirMenu(event: Event, u: any) {
  menuUsuario.value = u;
  menu.value.show(event);
}

const menuItems = computed(() => {
  const u = menuUsuario.value;
  if (!u) return [];
  return [
    {
      label: "Editar dados",
      icon: "pi pi-pencil",
      command: () => abrirEditar(u),
    },
    {
      label: "Capacidades críticas",
      icon: "pi pi-shield",
      command: () => abrirCapacidades(u),
    },
    { separator: true },
    ...(u.tentativas_login >= 5
      ? [
          {
            label: "Desbloquear acesso",
            icon: "pi pi-unlock",
            command: () => abrirDesbloquear(u),
          },
        ]
      : []),
    {
      label: u.status === "ativo" ? "Inativar usuário" : "Reativar usuário",
      icon: u.status === "ativo" ? "pi pi-ban" : "pi pi-check-circle",
      class: u.status === "ativo" ? "text-red-600" : "text-emerald-600",
      disabled: u.id === auth.usuario?.id,
      command: () => abrirConfirmStatus(u),
    },
  ];
});
</script>

<template>
  <div>
    <SgoPageHeader
      title="Usuários"
      subtitle="Gerencie usuários e permissões de acesso ao sistema."
      icon="pi-users"
    >
      <template #actions>
        <Button
          label="Novo usuário"
          icon="pi pi-plus"
          size="small"
          @click="modalCriar = true"
        />
      </template>
    </SgoPageHeader>

    <!-- KPIs -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div class="sgo-card py-3 px-4 flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"
        >
          <i class="pi pi-users text-slate-500 text-sm" />
        </div>
        <div>
          <p class="text-xs text-slate-400">Total</p>
          <p class="text-xl font-bold text-slate-800 leading-tight">
            {{ admin.total }}
          </p>
        </div>
      </div>
      <div class="sgo-card py-3 px-4 flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0"
        >
          <i class="pi pi-check-circle text-emerald-500 text-sm" />
        </div>
        <div>
          <p class="text-xs text-slate-400">Ativos</p>
          <p class="text-xl font-bold text-emerald-600 leading-tight">
            {{ totalAtivos }}
          </p>
        </div>
      </div>
      <div class="sgo-card py-3 px-4 flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"
        >
          <i class="pi pi-ban text-slate-400 text-sm" />
        </div>
        <div>
          <p class="text-xs text-slate-400">Inativos</p>
          <p class="text-xl font-bold text-slate-500 leading-tight">
            {{ totalInativos }}
          </p>
        </div>
      </div>
      <div class="sgo-card py-3 px-4 flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0"
        >
          <i class="pi pi-lock text-red-400 text-sm" />
        </div>
        <div>
          <p class="text-xs text-slate-400">Bloqueados</p>
          <p class="text-xl font-bold text-red-500 leading-tight">
            {{ totalBloq }}
          </p>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-[220px]">
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="q"
              placeholder="Buscar por nome ou e-mail..."
              class="w-full"
              @input="buscarDebounced"
            />
          </IconField>
        </div>
        <Select
          v-model="filtroPerfil"
          :options="perfilOpts"
          option-label="label"
          option-value="value"
          placeholder="Perfil"
          class="w-48"
          @change="buscar"
        />
        <Select
          v-model="filtroStatus"
          :options="statusOpts"
          option-label="label"
          option-value="value"
          placeholder="Status"
          class="w-36"
          @change="buscar"
        />
        <Button
          v-if="temFiltrosAtivos"
          label="Limpar"
          icon="pi pi-times"
          severity="secondary"
          text
          size="small"
          @click="limparFiltros"
        />
        <Button
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          size="small"
          :loading="admin.loading"
          v-tooltip="'Atualizar lista'"
          @click="buscar"
        />
      </div>
    </div>

    <!-- Tabela -->
    <div class="sgo-card p-0 overflow-hidden">
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60"
      >
        <p class="text-sm text-slate-500">
          <span v-if="admin.loading">Carregando...</span>
          <span v-else>
            <span class="font-semibold text-slate-800">{{ admin.total }}</span>
            usuário{{ admin.total !== 1 ? "s" : "" }}
            <span v-if="temFiltrosAtivos" class="text-blue-500 ml-1 text-xs">
              · filtros ativos <i class="pi pi-filter-fill text-[10px]" />
            </span>
          </span>
        </p>
      </div>

      <DataTable
        :value="admin.usuarios"
        :loading="admin.loading"
        striped-rows
        size="small"
        row-hover
        scrollable
        scroll-height="calc(100vh - 430px)"
        class="w-full"
      >
        <template #empty>
          <SgoEmptyState
            icon="pi-users"
            title="Nenhum usuário encontrado"
            :description="
              temFiltrosAtivos
                ? 'Tente ajustar os filtros de busca.'
                : 'Cadastre o primeiro usuário clicando em «Novo usuário».'
            "
          />
        </template>

        <!-- Usuário -->
        <Column field="nome" header="Usuário" sortable style="min-width: 260px">
          <template #body="{ data }">
            <div class="flex items-center gap-3 py-1.5">
              <SgoAvatar :nome="data.nome" size="sm" />
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p
                    class="font-semibold text-slate-800 text-sm leading-tight truncate"
                  >
                    {{ data.nome }}
                  </p>
                  <span
                    v-if="data.primeiro_acesso"
                    class="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 font-medium whitespace-nowrap"
                  >
                    <i class="pi pi-clock text-[9px]" /> 1º acesso
                  </span>
                  <span
                    v-if="data.tentativas_login >= 5"
                    class="inline-flex items-center gap-1 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5 font-medium whitespace-nowrap"
                  >
                    <i class="pi pi-lock text-[9px]" /> Bloqueado
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5 truncate">
                  {{ data.email }}
                </p>
              </div>
            </div>
          </template>
        </Column>

        <!-- Perfil -->
        <Column field="perfil" header="Perfil" style="width: 155px" sortable>
          <template #body="{ data }">
            <span
              :class="[
                'text-xs font-medium px-2.5 py-1 rounded-full border',
                perfilColor[data.perfil] ??
                  'bg-slate-100 text-slate-600 border-slate-200',
              ]"
            >
              {{ perfilLabel[data.perfil] ?? data.perfil }}
            </span>
          </template>
        </Column>

        <!-- Capacidades -->
        <Column header="Capacidades críticas" style="min-width: 160px">
          <template #body="{ data }">
            <div
              v-if="data.capacidades?.filter((c: any) => !c.revogada_em).length"
              class="flex flex-wrap gap-1"
            >
              <SgoCapBadge
                v-for="cap in data.capacidades.filter(
                  (c: any) => !c.revogada_em,
                )"
                :key="cap.id"
                :label="cap.capacidade.replace(/_/g, ' ')"
              />
            </div>
            <span v-else class="text-xs text-slate-300 italic">Nenhuma</span>
          </template>
        </Column>

        <!-- Status -->
        <Column field="status" header="Status" style="width: 100px" sortable>
          <template #body="{ data }">
            <SgoBadge :status="data.status" small />
          </template>
        </Column>

        <!-- Último acesso -->
        <Column
          field="ultimo_acesso"
          header="Último acesso"
          style="width: 130px"
          sortable
        >
          <template #body="{ data }">
            <template v-if="formatarData(data.ultimo_acesso)">
              <p class="text-xs text-slate-600 font-medium">
                {{ formatarData(data.ultimo_acesso)?.data }}
              </p>
              <p class="text-xs text-slate-400">
                {{ formatarData(data.ultimo_acesso)?.hora }}
              </p>
            </template>
            <span v-else class="text-xs text-slate-300 italic">Nunca</span>
          </template>
        </Column>

        <!-- Ações -->
        <Column header="" style="width: 52px" frozen align-frozen="right">
          <template #body="{ data }">
            <div class="flex items-center justify-center">
              <button
                class="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                title="Ações"
                @click="abrirMenu($event, data)"
              >
                <i class="pi pi-ellipsis-v text-sm" />
              </button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Menu de ações contextual -->
    <Menu ref="menu" :model="menuItems" popup />

    <!-- Modais -->
    <AdminUsuarioModal
      v-model:visible="modalCriar"
      @saved="buscar"
      @senha-gerada="onSenhaGerada"
    />
    <AdminUsuarioModal
      v-model:visible="modalEditar"
      :usuario="usuarioSelecionado"
      @saved="buscar"
      @senha-gerada="onSenhaGerada"
    />
    <AdminCapacidadesModal
      v-model:visible="modalCapacidades"
      :usuario="usuarioSelecionado"
      @saved="buscar"
    />

    <AppConfirmDialog
      v-model:visible="confirmStatus"
      :title="
        usuarioSelecionado?.status === 'ativo'
          ? 'Inativar usuário'
          : 'Reativar usuário'
      "
      :message="`Confirma ${usuarioSelecionado?.status === 'ativo' ? 'inativação' : 'reativação'} de ${usuarioSelecionado?.nome}?`"
      :severity="usuarioSelecionado?.status === 'ativo' ? 'danger' : 'info'"
      require-justificativa
      :loading="admin.saving"
      @confirm="confirmarStatus"
    />

    <AppConfirmDialog
      v-model:visible="confirmDesbloquear"
      title="Desbloquear usuário"
      :message="`Desbloquear ${usuarioSelecionado?.nome}? As tentativas de login serão zeradas.`"
      severity="warning"
      :loading="admin.saving"
      @confirm="confirmarDesbloquear"
    />

    <!-- Modal senha temporária -->
    <Dialog
      v-model:visible="modalSenhaTemp"
      header="Usuário criado com sucesso!"
      :style="{ width: '420px' }"
      modal
    >
      <div class="space-y-4">
        <SgoAlertBanner
          severity="warning"
          message="Anote a senha abaixo e repasse ao usuário. Ela não será exibida novamente."
        />
        <div>
          <p
            class="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide"
          >
            Senha temporária
          </p>
          <div
            class="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3"
          >
            <code
              class="flex-1 font-mono text-lg text-green-400 tracking-widest select-all"
              >{{ senhaTemp }}</code
            >
            <Button
              icon="pi pi-copy"
              text
              rounded
              size="small"
              class="text-slate-400 hover:text-white"
              v-tooltip="'Copiar'"
              @click="copiarSenha"
            />
          </div>
          <p class="text-xs text-slate-400 mt-2">
            O usuário será solicitado a trocar a senha no primeiro acesso.
          </p>
        </div>
      </div>
      <template #footer>
        <Button
          label="Entendi, já anotei"
          icon="pi pi-check"
          @click="modalSenhaTemp = false"
        />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>
