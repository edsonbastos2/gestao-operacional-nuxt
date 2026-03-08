<!-- molecules/SgoFormField.vue
     MOLECULE: combina label, slot de input, hint e mensagem de erro.
     Usa o átomo SgoCapBadge para indicar campos críticos.
     Não contém lógica de negócio. -->
<script setup lang="ts">
defineProps<{
  label: string
  fieldId?: string
  required?: boolean
  error?: string | null
  hint?: string
  critico?: boolean
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="fieldId" class="text-sm font-medium text-slate-700 flex items-center gap-2 flex-wrap">
      {{ label }}
      <span v-if="required" class="text-red-500 leading-none">*</span>
      <SgoCapBadge v-if="critico" label="Crítico" />
    </label>

    <slot />

    <p v-if="error" class="flex items-center gap-1 text-xs text-red-500 mt-0.5">
      <i class="pi pi-exclamation-circle" style="font-size:11px" />
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-xs text-slate-400 mt-0.5">{{ hint }}</p>
  </div>
</template>
