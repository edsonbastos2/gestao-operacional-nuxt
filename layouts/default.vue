<!-- layouts/default.vue
     TEMPLATE (Atomic Design): estrutura da área autenticada.
     Orquestra os organismos AppSidebar e AppHeader. -->
<script setup lang="ts">
const competencia = useCompetenciaStore()
const collapsed = ref(false)

onMounted(() => competencia.buscarAtual())
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
