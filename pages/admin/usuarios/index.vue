<!-- pages/admin/usuarios/index.vue
     PAGE: listagem de usuários com busca, filtros, ações inline.
     Orquestra: SgoPageHeader, SgoSearchBar, SgoBadge, AppConfirmDialog -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const admin = useAdminStore()
const auth = useAuthStore()
const toast = useToast()

// Garante que só admin acessa
onMounted(async () => {
  if (!auth.isAdmin) { await navigateTo('/dashboard'); return }
  await admin.listarUsuarios()
})

// Filtros
const q = ref('')
const filtroPerfil = ref('')
const filtroStatus = ref('')

const perfilOpts = [
  { label: 'Todos os perfis', value: '' },
  { label: 'TI / Admin', value: 'ti_admin' },
  { label: 'Operação', value: 'operacao' },
  { label: 'RH', value: 'rh' },
  { label: 'Financeiro', value: 'financeiro' },
  { label: 'Controladoria', value: 'controladoria' },
  { label: 'Supervisor Externo', value: 'supervisor_externo' },
]

const statusOpts = [
  { label: 'Todos', value: '' },
  { label: 'Ativo', value: 'ativo' },
  { label: 'Inativo', value: 'inativo' },
]

async function buscar() {
  await admin.listarUsuarios({ q: q.value, perfil: filtroPerfil.value, status: filtroStatus.value })
}

// Ações
const usuarioSelecionado = ref<any>(null)
const modalCriar = ref(false)
const modalEditar = ref(false)
const modalCapacidades = ref(false)
const confirmStatus = ref(false)
const confirmDesbloquear = ref(false)
const modalSenhaTemp = ref(false)
const senhaTemp = ref('')

function abrirEditar(u: any) { usuarioSelecionado.value = u; modalEditar.value = true }
function abrirCapacidades(u: any) { usuarioSelecionado.value = u; modalCapacidades.value = true }
function abrirConfirmStatus(u: any) { usuarioSelecionado.value = u; confirmStatus.value = true }
function abrirConfirmDesbloquear(u: any) { usuarioSelecionado.value = u; confirmDesbloquear.value = true }

async function confirmarStatus(justificativa: string) {
  try {
    await admin.alternarStatus(usuarioSelecionado.value.id, justificativa)
    toast.add({ severity: 'success', summary: 'Status alterado com sucesso.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: admin.error ?? 'Erro.', life: 4000 }) }
  finally { confirmStatus.value = false }
}

async function confirmarDesbloquear() {
  try {
    await admin.desbloquear(usuarioSelecionado.value.id)
    toast.add({ severity: 'success', summary: 'Usuário desbloqueado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: 'Erro ao desbloquear.', life: 4000 }) }
  finally { confirmDesbloquear.value = false }
}

async function resetarSenha(u: any) {
  try {
    const res = await admin.resetarSenha(u.id)
    senhaTemp.value = res.senha_temp
    modalSenhaTemp.value = true
  } catch { toast.add({ severity: 'error', summary: 'Erro ao resetar senha.', life: 4000 }) }
}

const perfilLabel: Record<string, string> = {
  ti_admin: 'TI / Admin', operacao: 'Operação', rh: 'RH',
  financeiro: 'Financeiro', controladoria: 'Controladoria', supervisor_externo: 'Supervisor Ext.',
}
</script>

<template>
  <div>
    <!-- Cabeçalho da página -->
    <SgoPageHeader title="Usuários" subtitle="Gerencie os usuários e acessos do sistema." icon="pi-users">
      <template #actions>
        <Button label="Novo usuário" icon="pi pi-plus" size="small" @click="modalCriar = true" />
      </template>
    </SgoPageHeader>

    <!-- Filtros -->
    <div class="sgo-card mb-4">
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex-1 min-w-[200px]">
          <SgoSearchBar v-model="q" placeholder="Buscar por nome ou e-mail..." :loading="admin.loading" @search="buscar" />
        </div>
        <Select v-model="filtroPerfil" :options="perfilOpts" option-label="label" option-value="value" placeholder="Perfil" class="w-44" @change="buscar" />
        <Select v-model="filtroStatus" :options="statusOpts" option-label="label" option-value="value" placeholder="Status" class="w-36" @change="buscar" />
        <Button icon="pi pi-refresh" severity="secondary" outlined size="small" :loading="admin.loading" @click="buscar" />
      </div>
    </div>

    <!-- Tabela -->
    <div class="sgo-card p-0 overflow-hidden">
      <DataTable
        :value="admin.usuarios"
        :loading="admin.loading"
        striped-rows
        size="small"
        class="w-full"
      >
        <template #empty>
          <SgoEmptyState icon="pi-users" title="Nenhum usuário encontrado" description="Ajuste os filtros ou cadastre um novo usuário." />
        </template>

        <Column field="nome" header="Nome" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <SgoAvatar :nome="data.nome" size="sm" />
              <div>
                <p class="font-medium text-slate-700 leading-tight">{{ data.nome }}</p>
                <p class="text-xs text-slate-400">{{ data.email }}</p>
              </div>
            </div>
          </template>
        </Column>

        <Column field="login" header="Login" />

        <Column field="perfil" header="Perfil">
          <template #body="{ data }">
            <span class="text-sm text-slate-600">{{ perfilLabel[data.perfil] ?? data.perfil }}</span>
          </template>
        </Column>

        <Column header="Capacidades">
          <template #body="{ data }">
            <span v-if="!data.capacidades?.filter((c: any) => !c.revogada_em).length" class="text-xs text-slate-300">—</span>
            <div v-else class="flex flex-wrap gap-1">
              <SgoCapBadge v-for="cap in data.capacidades.filter((c: any) => !c.revogada_em)" :key="cap.id" :label="cap.capacidade.replace('_', ' ')" />
            </div>
          </template>
        </Column>

        <Column field="status" header="Status">
          <template #body="{ data }">
            <div class="flex items-center gap-1.5">
              <SgoBadge :status="data.status" small />
              <SgoCapBadge v-if="data.tentativas_login >= 5" label="Bloqueado" />
            </div>
          </template>
        </Column>

        <Column field="ultimo_acesso" header="Último acesso">
          <template #body="{ data }">
            <span class="text-xs text-slate-400">
              {{ data.ultimo_acesso ? new Date(data.ultimo_acesso).toLocaleString('pt-BR') : '—' }}
            </span>
          </template>
        </Column>

        <Column header="Ações" style="width:160px">
          <template #body="{ data }">
            <div class="flex items-center gap-1">
              <Button icon="pi pi-pencil"    text rounded size="small" severity="secondary" v-tooltip="'Editar'" @click="abrirEditar(data)" />
              <Button icon="pi pi-shield"    text rounded size="small" severity="warning"   v-tooltip="'Capacidades'" @click="abrirCapacidades(data)" />
              <Button v-if="data.tentativas_login >= 5"
                icon="pi pi-unlock" text rounded size="small" severity="info" v-tooltip="'Desbloquear'" @click="abrirConfirmDesbloquear(data)" />
              <Button icon="pi pi-power-off" text rounded size="small"
                :severity="data.status === 'ativo' ? 'danger' : 'success'"
                v-tooltip="data.status === 'ativo' ? 'Inativar' : 'Reativar'"
                :disabled="data.id === auth.usuario?.id"
                @click="abrirConfirmStatus(data)" />
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Rodapé com total -->
      <div v-if="admin.total > 0" class="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
        {{ admin.total }} usuário(s) encontrado(s)
      </div>
    </div>

    <!-- Modais -->
    <AdminUsuarioModal v-model:visible="modalCriar" @saved="buscar" />
    <AdminUsuarioModal v-model:visible="modalEditar" :usuario="usuarioSelecionado" @saved="buscar" />
    <AdminCapacidadesModal v-model:visible="modalCapacidades" :usuario="usuarioSelecionado" @saved="buscar" />

    <!-- Confirmar status -->
    <AppConfirmDialog
      v-model:visible="confirmStatus"
      :title="usuarioSelecionado?.status === 'ativo' ? 'Inativar usuário' : 'Reativar usuário'"
      :message="`Confirma ${usuarioSelecionado?.status === 'ativo' ? 'inativação' : 'reativação'} de ${usuarioSelecionado?.nome}?`"
      :severity="usuarioSelecionado?.status === 'ativo' ? 'danger' : 'info'"
      require-justificativa
      :loading="admin.saving"
      @confirm="confirmarStatus"
    />

    <!-- Confirmar desbloqueio -->
    <AppConfirmDialog
      v-model:visible="confirmDesbloquear"
      title="Desbloquear usuário"
      :message="`Desbloquear ${usuarioSelecionado?.nome}? As tentativas de login serão zeradas.`"
      severity="warning"
      :loading="admin.saving"
      @confirm="confirmarDesbloquear"
    />

    <!-- Modal senha temporária -->
    <Dialog v-model:visible="modalSenhaTemp" header="Senha temporária gerada" :style="{ width: '380px' }" modal>
      <SgoAlertBanner severity="warning" message="Anote a senha abaixo e repasse ao usuário. Ela não será exibida novamente." class="mb-4" />
      <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        <code class="flex-1 font-mono text-lg text-slate-800 tracking-widest">{{ senhaTemp }}</code>
        <Button icon="pi pi-copy" text rounded size="small" v-tooltip="'Copiar'" @click="navigator.clipboard.writeText(senhaTemp)" />
      </div>
      <template #footer>
        <Button label="Fechar" severity="secondary" @click="modalSenhaTemp = false" />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>
