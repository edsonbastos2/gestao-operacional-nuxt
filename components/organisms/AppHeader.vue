<!-- organisms/AppHeader.vue
     ORGANISM: cabeçalho principal da aplicação. Usa stores de auth e competencia.
     Composto pelas moléculas e átomos: SgoAvatar, SgoBadge, SgoIcon. -->
<script setup lang="ts">
defineEmits<{ toggle: [] }>()

const auth = useAuthStore()
const competencia = useCompetenciaStore()
const route = useRoute()

const breadcrumbs = computed(() =>
  route.path.split('/').filter(Boolean).map((seg, i, arr) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    to: '/' + arr.slice(0, i + 1).join('/'),
  }))
)

const menu = ref()
const menuItems = [
  {
    label: 'Sair',
    icon: 'pi pi-sign-out',
    command: () => auth.logout(),
  },
]
</script>

<template>
  <header class="sgo-header justify-between">

    <!-- Esquerda: toggle + breadcrumb -->
    <div class="flex items-center gap-3 min-w-0">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors shrink-0"
        @click="$emit('toggle')"
      >
        <SgoIcon name="pi-bars" size="md" color="#64748b" />
      </button>

      <nav class="flex items-center gap-1 text-sm min-w-0">
        <NuxtLink to="/dashboard" class="text-slate-400 hover:text-slate-600 shrink-0">
          <SgoIcon name="pi-home" size="xs" />
        </NuxtLink>
        <template v-for="(b, i) in breadcrumbs" :key="b.to">
          <SgoIcon name="pi-chevron-right" size="xs" color="#cbd5e1" class="shrink-0" />
          <NuxtLink
            :to="b.to"
            :class="[
              'truncate',
              i === breadcrumbs.length - 1
                ? 'text-slate-700 font-medium'
                : 'text-slate-400 hover:text-slate-600',
            ]"
          >
            {{ b.label }}
          </NuxtLink>
        </template>
      </nav>
    </div>

    <!-- Direita: competência + usuário -->
    <div class="flex items-center gap-3 shrink-0">

      <!-- Indicador de competência (molecule inline) -->
      <div v-if="competencia.label"
           class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
        <SgoIcon name="pi-calendar" size="xs" color="#94a3b8" />
        <span class="text-xs font-medium text-slate-600">{{ competencia.label }}</span>
        <SgoBadge :status="competencia.aberta ? 'aberta' : 'fechada'" small />
      </div>

      <!-- Menu do usuário -->
      <button
        class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        @click="menu.toggle($event)"
      >
        <SgoAvatar :nome="auth.usuario?.nome ?? 'U'" size="sm" />
        <span class="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
          {{ auth.usuario?.nome }}
        </span>
        <SgoIcon name="pi-chevron-down" size="xs" color="#94a3b8" />
      </button>
      <Menu ref="menu" :model="menuItems" popup />

    </div>
  </header>
</template>
