<script setup lang="ts">
const auth = useAuthStore();
const competencia = useCompetenciaStore();

const perfilLabel: Record<string, string> = {
  ti_admin: "TI / Admin",
  operacao: "Operação",
  rh: "RH",
  financeiro: "Financeiro",
  controladoria: "Controladoria",
  supervisor_externo: "Supervisor Externo",
};
</script>

<template>
  <div>
    <SgoPageHeader
      title="Dashboard"
      icon="pi-home"
      :subtitle="`Bem-vindo, ${auth.usuario?.nome ?? ''}!`"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SgoStatCard
        title="Competência"
        :value="competencia.label ?? 'Não configurada'"
        icon="pi-calendar"
        icon-bg="bg-blue-50"
        icon-color="#2563eb"
      />
      <SgoStatCard
        title="Status"
        :value="
          competencia.atual ? (competencia.aberta ? 'Aberta' : 'Fechada') : '—'
        "
        icon="pi-check-circle"
        :icon-bg="competencia.aberta ? 'bg-green-50' : 'bg-slate-50'"
        :icon-color="competencia.aberta ? '#16a34a' : '#64748b'"
      />
      <SgoStatCard
        title="Perfil"
        :value="perfilLabel[auth.perfilAtual ?? ''] ?? '—'"
        icon="pi-shield"
        icon-bg="bg-slate-50"
        icon-color="#64748b"
      />
      <SgoStatCard
        title="Capacidades"
        :value="auth.usuario?.capacidades?.length ?? 0"
        icon="pi-lock"
        icon-bg="bg-amber-50"
        icon-color="#d97706"
      />
    </div>

    <!-- Acesso rápido -->
    <div class="sgo-card">
      <p class="sgo-card-title mb-4">Acesso rápido</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <NuxtLink
          v-if="auth.isAdmin"
          to="/admin/usuarios"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center"
        >
          <i class="pi pi-users text-blue-600" style="font-size: 1.5rem" />
          <span class="text-sm font-medium text-slate-700">Usuários</span>
        </NuxtLink>
        <NuxtLink
          v-if="auth.isOperacao || auth.isAdmin"
          to="/cadastros/prestadoras"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center"
        >
          <i class="pi pi-building text-blue-600" style="font-size: 1.5rem" />
          <span class="text-sm font-medium text-slate-700">Prestadoras</span>
        </NuxtLink>
        <NuxtLink
          v-if="auth.isOperacao || auth.isAdmin"
          to="/colaboradores"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center"
        >
          <i class="pi pi-id-card text-blue-600" style="font-size: 1.5rem" />
          <span class="text-sm font-medium text-slate-700">Colaboradores</span>
        </NuxtLink>
        <NuxtLink
          v-if="auth.isOperacao || auth.isAdmin"
          to="/operacao/faltas"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center"
        >
          <i class="pi pi-user-minus text-blue-600" style="font-size: 1.5rem" />
          <span class="text-sm font-medium text-slate-700">Faltas</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
