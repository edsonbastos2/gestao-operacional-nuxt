<!-- atoms/SgoCapBadge.vue
     ATOM: badge visual de capacidade crítica.
     Exibe o ícone de escudo indicando ação restrita. -->
<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <span class="badge-capacidade">
    <i class="pi pi-shield" style="font-size:9px" />
    {{ label ?? 'Cap. Crítica' }}
  </span>
</template>
