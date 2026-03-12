<!-- organisms/AppSidebar.vue
     ORGANISM: menu lateral completo com grupos de navegação filtrados por perfil RBAC.
     Usa store de auth. É uma seção completa e autônoma da interface. -->
<script setup lang="ts">
import type { PerfilSetor } from '~/types'

const props = defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()

const auth = useAuthStore()
const route = useRoute()

interface NavItem { label: string; icon: string; route: string; critico?: boolean }
interface NavGroup { label?: string; perfis?: PerfilSetor[]; items: NavItem[] }

const grupos: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', icon: 'pi-home', route: '/dashboard' }],
  },
  {
    label: 'Administração', perfis: ['ti_admin'],
    items: [
      { label: 'Usuários',     icon: 'pi-users',  route: '/admin/usuarios' },
      { label: 'Perfis',       icon: 'pi-shield', route: '/admin/perfis' },
      { label: 'Capacidades',  icon: 'pi-lock',   route: '/admin/capacidades', critico: true },
    ],
  },
  {
    label: 'Cadastros', perfis: ['ti_admin', 'operacao', 'rh'],
    items: [
      { label: 'Prestadoras', icon: 'pi-building',    route: '/cadastros/prestadoras' },
      { label: 'Tomadores',   icon: 'pi-briefcase',   route: '/cadastros/tomadores' },
      { label: 'Postos',      icon: 'pi-map-marker',  route: '/cadastros/postos' },
      { label: 'Funções',     icon: 'pi-tag',         route: '/cadastros/funcoes' },
      { label: 'Feriados',    icon: 'pi-calendar',    route: '/cadastros/feriados' },
    ],
  },
  {
    label: 'Colaboradores', perfis: ['ti_admin', 'operacao', 'rh', 'financeiro', 'controladoria'],
    items: [
      { label: 'Candidatos',   icon: 'pi-user-plus', route: '/colaboradores/candidatos' },
      { label: 'Colaboradores',icon: 'pi-id-card',   route: '/colaboradores' },
      { label: 'Alocações',    icon: 'pi-map',       route: '/colaboradores/alocacoes' },
    ],
  },
  {
    label: 'Escalas', perfis: ['ti_admin', 'operacao'],
    items: [
      { label: 'Escalas',    icon: 'pi-list',     route: '/escalas' },
      { label: 'Turnos',     icon: 'pi-clock',    route: '/escalas/turnos' },
      { label: 'Calendário', icon: 'pi-calendar', route: '/escalas/calendario' },
    ],
  },
  {
    label: 'Operação', perfis: ['ti_admin', 'operacao', 'supervisor_externo'],
    items: [
      { label: 'Faltas',              icon: 'pi-user-minus',          route: '/operacao/faltas' },
      { label: 'Extras',              icon: 'pi-plus-circle',         route: '/operacao/extras' },
      { label: 'Aprovações',          icon: 'pi-check-circle',        route: '/operacao/aprovacoes', critico: true },
      { label: 'Feriados Trabalhados',icon: 'pi-sun',                 route: '/operacao/feriados-trabalhados' },
      { label: 'Ocorrências',         icon: 'pi-exclamation-triangle',route: '/operacao/ocorrencias' },
    ],
  },
  {
    label: 'Benefícios', perfis: ['ti_admin', 'operacao', 'rh', 'financeiro', 'controladoria'],
    items: [
      { label: 'Tipos',        icon: 'pi-list',        route: '/beneficios/tipos' },
      { label: 'Fornecedores', icon: 'pi-truck',       route: '/beneficios/fornecedores' },
      { label: 'Valores',      icon: 'pi-money-bill',  route: '/beneficios/valores' },
    ],
  },
  {
    label: 'Competência', perfis: ['ti_admin', 'operacao'],
    items: [
      { label: 'Competência', icon: 'pi-calendar-plus', route: '/competencia', critico: true },
    ],
  },
  {
    label: 'Relatórios', perfis: ['ti_admin', 'operacao', 'rh', 'financeiro', 'controladoria'],
    items: [
      { label: 'Mapa de Vagas',  icon: 'pi-map',          route: '/relatorios/mapa-vagas' },
      { label: 'Alocação',      icon: 'pi-table',        route: '/relatorios/alocacao' },
      { label: 'Operacionais',  icon: 'pi-file',         route: '/relatorios/operacionais' },
      { label: 'Benefícios',    icon: 'pi-gift',         route: '/relatorios/beneficios' },
      { label: 'Auditoria',     icon: 'pi-eye',          route: '/relatorios/auditoria' },
    ],
  },
]

const gruposFiltrados = computed(() =>
  grupos.filter(g => !g.perfis || g.perfis.includes(auth.perfilAtual as PerfilSetor))
)

const isActive = (r: string) => route.path === r || route.path.startsWith(r + '/')
</script>

<template>
  <aside :class="['sgo-sidebar', { collapsed }]">

    <!-- Logo -->
    <div class="flex items-center gap-3 px-4 border-b border-slate-100 shrink-0"
         style="height:var(--sgo-header-height)">
      <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
        <SgoIcon name="pi-bolt" size="sm" color="white" />
      </div>
      <Transition name="fade">
        <div v-if="!collapsed" class="overflow-hidden">
          <p class="font-bold text-slate-800 text-sm leading-none">SGO</p>
          <p class="text-slate-400 text-xs mt-0.5">Gestão Operacional</p>
        </div>
      </Transition>
    </div>

    <!-- Navegação -->
    <nav class="flex-1 overflow-y-auto py-2">
      <template v-for="grupo in gruposFiltrados" :key="grupo.label ?? '__root'">

        <!-- Separador de grupo -->
        <template v-if="grupo.label">
          <p v-if="!collapsed" class="px-4 pt-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider select-none">
            {{ grupo.label }}
          </p>
          <div v-else class="mx-3 my-3">
            <div class="h-px bg-slate-100" />
          </div>
        </template>

        <!-- Item de navegação -->
        <NuxtLink
          v-for="item in grupo.items"
          :key="item.route"
          :to="item.route"
          :title="collapsed ? item.label : undefined"
          :class="[
            'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-all',
            isActive(item.route)
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
          ]"
        >
          <SgoIcon
            :name="item.icon"
            size="md"
            :color="isActive(item.route) ? '#2563eb' : '#94a3b8'"
            class="shrink-0"
          />
          <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
          <SgoCapBadge v-if="item.critico && !collapsed" label="C" />
        </NuxtLink>

      </template>
    </nav>

    <!-- Botão recolher -->
    <div class="p-3 border-t border-slate-100 shrink-0">
      <button
        class="w-full flex items-center justify-center h-8 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
        @click="$emit('toggle')"
      >
        <SgoIcon :name="collapsed ? 'pi-chevron-right' : 'pi-chevron-left'" size="xs" />
      </button>
    </div>

  </aside>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 150ms, width 150ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
