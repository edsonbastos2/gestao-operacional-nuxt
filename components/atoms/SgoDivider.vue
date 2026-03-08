<!-- atoms/SgoDivider.vue
     ATOM: linha divisória horizontal com texto central opcional. -->
<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <div class="flex items-center gap-3 my-2">
    <div class="flex-1 h-px bg-slate-200" />
    <span v-if="label" class="text-xs text-slate-400 font-medium uppercase tracking-wider">{{ label }}</span>
    <div class="flex-1 h-px bg-slate-200" />
  </div>
</template>
