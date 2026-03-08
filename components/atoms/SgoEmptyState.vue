<!-- atoms/SgoEmptyState.vue
     ATOM: estado visual de lista/tabela vazia. -->
<script setup lang="ts">
defineProps<{ icon?: string; title?: string; description?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <i :class="['pi', icon ?? 'pi-inbox', 'text-slate-300 mb-4']" style="font-size:3rem" />
    <p class="font-medium text-slate-500 mb-1">{{ title ?? 'Nenhum registro encontrado' }}</p>
    <p v-if="description" class="text-sm text-slate-400 max-w-xs">{{ description }}</p>
    <slot />
  </div>
</template>
