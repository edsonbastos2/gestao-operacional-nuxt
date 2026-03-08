<!-- molecules/SgoPageHeader.vue
     MOLECULE: cabeçalho de página composto de título, subtítulo e slot de ações.
     Usa SgoIcon e SgoCapBadge. -->
<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  icon?: string
  critico?: boolean
}>()
</script>

<template>
  <div class="flex items-start justify-between gap-4 mb-6">
    <div class="flex items-center gap-3">
      <div v-if="icon" class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <SgoIcon :name="icon" size="lg" color="#2563eb" />
      </div>
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="text-xl font-bold text-slate-800 leading-tight">{{ title }}</h1>
          <SgoCapBadge v-if="critico" />
        </div>
        <p v-if="subtitle" class="text-sm text-slate-400 mt-0.5">{{ subtitle }}</p>
      </div>
    </div>

    <!-- Slot de ações (botões) -->
    <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
