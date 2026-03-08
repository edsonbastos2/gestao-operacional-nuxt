<script setup lang="ts">
const competencia = useCompetenciaStore();
const collapsed = ref(false);

onMounted(async () => {
  try {
    await competencia.buscarAtual();
  } catch {
    /* silencioso */
  }
});
</script>

<template>
  <div class="sgo-layout">
    <AppSidebar :collapsed="collapsed" @toggle="collapsed = !collapsed" />
    <div :class="['sgo-main', { collapsed }]">
      <AppHeader @toggle="collapsed = !collapsed" />
      <main class="sgo-content fade-up">
        <slot />
      </main>
    </div>
  </div>
</template>
