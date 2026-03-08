<!-- atoms/SgoIcon.vue
     ATOM: menor unidade visual — só renderiza um ícone PrimeIcons.
     Sem lógica de negócio. Sem dependências de outros componentes. -->
<script setup lang="ts">
defineProps<{
  name: string            // ex: 'pi-bolt', 'pi-users'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: string          // classe tailwind de cor ou hex
}>()

const sizeMap = { xs: '10px', sm: '12px', md: '15px', lg: '20px', xl: '28px' }
</script>

<template>
  <i
    :class="['pi', name]"
    :style="{ fontSize: sizeMap[size ?? 'md'], color: color ?? 'inherit' }"
  />
</template>
