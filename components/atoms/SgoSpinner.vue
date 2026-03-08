<!-- atoms/SgoSpinner.vue
     ATOM: indicador visual de carregamento.
     Sem props de lógica — apenas presentacional. -->
<script setup lang="ts">
defineProps<{ size?: 'sm' | 'md' | 'lg'; label?: string }>()
const sizeMap = { sm: '1rem', md: '2rem', lg: '3rem' }
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-8">
    <ProgressSpinner
      :style="{ width: sizeMap[size ?? 'md'], height: sizeMap[size ?? 'md'] }"
      strokeWidth="4"
      animationDuration=".8s"
    />
    <p v-if="label" class="text-sm text-slate-400">{{ label }}</p>
  </div>
</template>
