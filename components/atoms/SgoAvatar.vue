<!-- atoms/SgoAvatar.vue
     ATOM: avatar circular com inicial do nome.
     Sem lógica de negócio. -->
<script setup lang="ts">
const props = defineProps<{ nome: string; size?: 'sm' | 'md' | 'lg' }>()
const sizeMap = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }
const inicial = computed(() => props.nome?.charAt(0)?.toUpperCase() ?? '?')
</script>

<template>
  <div :class="['rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0', sizeMap[size ?? 'md']]">
    {{ inicial }}
  </div>
</template>
