<!-- molecules/SgoStatCard.vue
     MOLECULE: card de KPI/métrica do dashboard.
     Combina SgoIcon com dados numéricos. -->
<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  icon: string
  iconBg?: string   // ex: 'bg-blue-50'
  iconColor?: string // ex: '#2563eb'
  trend?: string
  trendUp?: boolean
}>()
</script>

<template>
  <div class="sgo-card flex items-center gap-4">
    <div :class="['w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconBg ?? 'bg-slate-50']">
      <SgoIcon :name="icon" size="lg" :color="iconColor ?? '#64748b'" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs text-slate-400 uppercase tracking-wide truncate">{{ title }}</p>
      <p class="text-2xl font-bold text-slate-800 leading-tight">{{ value }}</p>
      <p v-if="trend" :class="['text-xs mt-0.5', trendUp ? 'text-green-600' : 'text-red-500']">
        <i :class="['pi', trendUp ? 'pi-arrow-up' : 'pi-arrow-down']" style="font-size:10px" />
        {{ trend }}
      </p>
    </div>
  </div>
</template>
