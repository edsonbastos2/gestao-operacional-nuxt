<!-- pages/dashboard/index.vue
     PAGE (Atomic Design): dashboard principal. Orquestra as moléculas SgoStatCard e SgoPageHeader. -->
<script setup lang="ts">
const auth = useAuthStore()
const competencia = useCompetenciaStore()
</script>

<template>
  <div>
    <SgoPageHeader
      title="Dashboard"
      icon="pi-home"
      :subtitle="`Bem-vindo, ${auth.usuario?.nome ?? ''}`"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SgoStatCard
        title="Competência"
        :value="competencia.label ?? '—'"
        icon="pi-calendar"
        icon-bg="bg-blue-50"
        icon-color="#2563eb"
      />
      <SgoStatCard
        title="Status"
        :value="competencia.aberta ? 'Aberta' : 'Fechada'"
        icon="pi-check-circle"
        :icon-bg="competencia.aberta ? 'bg-green-50' : 'bg-slate-50'"
        :icon-color="competencia.aberta ? '#16a34a' : '#64748b'"
      />
      <SgoStatCard
        title="Perfil"
        :value="auth.perfilAtual?.replace('_', ' ') ?? '—'"
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
  </div>
</template>
