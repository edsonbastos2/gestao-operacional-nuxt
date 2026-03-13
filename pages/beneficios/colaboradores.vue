<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store      = useBeneficiosStore()
const colabStore = useColaboradoresStore()
const cadastros  = useCadastrosStore()
const toast      = useToast()

// ── Filtros de busca ──────────────────────────────────────────
const busca          = ref('')
const filtroPrestadora = ref('')
const colaboradores  = ref<any[]>([])
const loadingColab   = ref(false)

// ── Colaborador selecionado ───────────────────────────────────
const colabSelecionado   = ref<any>(null)
const alocacoes          = ref<any[]>([])
const beneficiosPorAloc  = ref<Record<string, any[]>>({})
const depDiretos         = ref<any[]>([])
const loadingDetalhe     = ref(false)

// ── Modais ────────────────────────────────────────────────────
const modalAdesao  = ref(false)
const modalSaude   = ref(false)
const modalDep     = ref(false)
const alocacaoAtiva = ref<any>(null)

const adesaoForm = ref<any>({ cct_beneficio_id:'', fornecedor_id:'', data_adesao:'', status:'ativo', motivo_recusa:'' })
const saudeForm  = ref<any>({ tipo:'saude', fornecedor_id:'', numero_carteirinha:'', custeio:'', valor_coparticipacao:'', data_inclusao:'', dependentes:[] })
const depForm    = ref<any>({ nome:'', parentesco:'', cpf:'', data_nasc:'' })

const parentescoOpts = [
  { label: 'Cônjuge',   value: 'conjuge' },
  { label: 'Filho(a)',  value: 'filho' },
  { label: 'Enteado(a)',value: 'enteado' },
  { label: 'Pai',       value: 'pai' },
  { label: 'Mãe',       value: 'mae' },
]
const statusAdesaoOpts = [
  { label: 'Ativo (aderiu)',  value: 'ativo' },
  { label: 'Recusado',        value: 'recusado' },
]
const custeioOpts = [
  { label: 'Prestadora paga 100%',          value: 'prestadora_100' },
  { label: 'Coparticipação do colaborador', value: 'coparticipacao' },
]

// ── Computed ──────────────────────────────────────────────────
const prestadoraOpts = computed(() => [
  { label: 'Todas', value: '' },
  ...cadastros.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id }))
])

const colabFiltrados = computed(() => {
  let list = colaboradores.value
  if (busca.value) {
    const q = busca.value.toLowerCase()
    list = list.filter(c => c.nome.toLowerCase().includes(q) || c.cpf?.includes(q) || c.matricula?.includes(q))
  }
  if (filtroPrestadora.value) list = list.filter(c => c.prestadora_id === filtroPrestadora.value)
  return list
})

// Benefícios disponíveis para adesão na alocação selecionada (CCT da função)
const beneficiosDisponiveis = ref<any[]>([])

// Fornecedores do tipo do benefício selecionado
const fornecedoresDisponiveis = computed(() => {
  const benef = beneficiosDisponiveis.value.find(b => b.id === adesaoForm.value.cct_beneficio_id)
  if (!benef) return []
  return store.fornecedores.filter(f => f.tipo === benef.tipo)
})

const fornecedoresSaude = computed(() =>
  store.fornecedores.filter(f => f.tipo === saudeForm.value.tipo)
)

// Dependentes diretos disponíveis (não incluídos ainda em plano ativo de saúde)
const depDisponiveis = computed(() => depDiretos.value)

onMounted(async () => {
  loadingColab.value = true
  await Promise.all([
    cadastros.listarPrestadoras({ status: 'ativo' }),
    store.listarFornecedores(),
  ])
  const res = await $fetch<any>('/api/colaboradores', { params: { per_page: 200 } })
  colaboradores.value = res.data ?? []
  loadingColab.value = false
})

// ── Selecionar colaborador ────────────────────────────────────
async function selecionarColab(c: any) {
  colabSelecionado.value = c
  loadingDetalhe.value = true
  beneficiosPorAloc.value = {}
  try {
    // Busca alocações ativas
    const ra = await $fetch<any>('/api/colaboradores/alocacoes', { params: { colaborador_id: c.id, status: 'ativo' } })
    alocacoes.value = ra.data ?? []
    // Benefícios já aderidos
    const rb = await store.listarColabBeneficios(c.id)
    for (const aloc of alocacoes.value) {
      beneficiosPorAloc.value[aloc.id] = (rb.data ?? []).filter((b: any) => b.alocacao_id === aloc.id)
    }
    // Dependentes diretos
    const rd = await $fetch<any>('/api/beneficios/dependentes-diretos', { params: { colaborador_id: c.id } })
    depDiretos.value = rd.data ?? []
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e?.data?.message ?? 'Erro ao carregar.', life: 4000 })
  } finally { loadingDetalhe.value = false }
}

// ── Aplicar obrigatórios automaticamente ─────────────────────
async function aplicarObrigatorios(alocId: string) {
  try {
    const res = await store.aplicarObrigatorios(colabSelecionado.value.id, alocId)
    toast.add({ severity: 'success', summary: res.mensagem, life: 4000 })
    await selecionarColab(colabSelecionado.value)
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e?.data?.message ?? 'Erro.', life: 4000 })
  }
}

// ── Abrir modal de adesão ─────────────────────────────────────
async function abrirAdesao(aloc: any) {
  alocacaoAtiva.value = aloc
  adesaoForm.value = { cct_beneficio_id:'', fornecedor_id:'', data_adesao:'', status:'ativo', motivo_recusa:'' }
  // Busca benefícios da CCT para esta função
  beneficiosDisponiveis.value = []
  try {
    const res = await $fetch<any>('/api/beneficios/beneficios-por-alocacao', {
      params: { alocacao_id: aloc.id, colaborador_id: colabSelecionado.value.id }
    })
    beneficiosDisponiveis.value = res.data ?? []
  } catch { beneficiosDisponiveis.value = [] }
  modalAdesao.value = true
}

async function salvarAdesao() {
  if (!adesaoForm.value.cct_beneficio_id || !adesaoForm.value.data_adesao) {
    toast.add({ severity: 'warn', summary: 'Selecione o benefício e a data de adesão.', life: 3000 }); return
  }
  if (adesaoForm.value.status === 'recusado' && !adesaoForm.value.motivo_recusa?.trim()) {
    toast.add({ severity: 'warn', summary: 'Informe o motivo da recusa.', life: 3000 }); return
  }
  try {
    await store.aderirBeneficio({
      ...adesaoForm.value,
      colaborador_id: colabSelecionado.value.id,
      alocacao_id: alocacaoAtiva.value.id,
    })
    modalAdesao.value = false
    toast.add({ severity: 'success', summary: 'Adesão registrada.', life: 3000 })
    await selecionarColab(colabSelecionado.value)
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e?.data?.message ?? 'Erro.', life: 4000 })
  }
}

async function alterarStatusAdesao(id: string, status: string) {
  try {
    await store.atualizarAdesao(id, { status })
    toast.add({ severity: 'success', summary: 'Status atualizado.', life: 3000 })
    await selecionarColab(colabSelecionado.value)
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e?.data?.message ?? 'Erro.', life: 4000 })
  }
}

// ── Plano de saúde ────────────────────────────────────────────
function abrirSaude(aloc: any, tipo: 'saude' | 'odonto') {
  alocacaoAtiva.value = aloc
  saudeForm.value = { tipo, fornecedor_id:'', numero_carteirinha:'', custeio: tipo === 'saude' ? '' : null, valor_coparticipacao:'', data_inclusao:'', dependentes:[] }
  modalSaude.value = true
}

async function salvarSaude() {
  if (!saudeForm.value.data_inclusao) {
    toast.add({ severity: 'warn', summary: 'Informe a data de inclusão.', life: 3000 }); return
  }
  if (saudeForm.value.tipo === 'saude' && !saudeForm.value.custeio) {
    toast.add({ severity: 'warn', summary: 'Selecione o custeio do plano de saúde.', life: 3000 }); return
  }
  // Busca o colab_beneficio_id do plano de saúde/odonto desta alocação
  const benefAloc = (beneficiosPorAloc.value[alocacaoAtiva.value.id] ?? [])
    .find((b: any) => b.tipo === saudeForm.value.tipo && b.status === 'ativo')
  if (!benefAloc) {
    toast.add({ severity: 'warn', summary: `O colaborador não tem adesão ativa de ${saudeForm.value.tipo} nesta alocação.`, life: 4000 }); return
  }
  try {
    await $fetch('/api/beneficios/saude', {
      method: 'POST',
      body: {
        ...saudeForm.value,
        colaborador_id: colabSelecionado.value.id,
        colab_beneficio_id: benefAloc.id,
      }
    })
    modalSaude.value = false
    toast.add({ severity: 'success', summary: 'Plano cadastrado.', life: 3000 })
    await selecionarColab(colabSelecionado.value)
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e?.data?.message ?? 'Erro.', life: 4000 })
  }
}

// ── Dependentes diretos ───────────────────────────────────────
function abrirDep() {
  depForm.value = { nome:'', parentesco:'', cpf:'', data_nasc:'' }
  modalDep.value = true
}

async function salvarDep() {
  if (!depForm.value.nome || !depForm.value.parentesco) {
    toast.add({ severity: 'warn', summary: 'Nome e parentesco são obrigatórios.', life: 3000 }); return
  }
  try {
    await $fetch('/api/beneficios/dependentes-diretos', {
      method: 'POST',
      body: { ...depForm.value, colaborador_id: colabSelecionado.value.id }
    })
    modalDep.value = false
    toast.add({ severity: 'success', summary: 'Dependente adicionado.', life: 3000 })
    const rd = await $fetch<any>('/api/beneficios/dependentes-diretos', { params: { colaborador_id: colabSelecionado.value.id } })
    depDiretos.value = rd.data ?? []
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e?.data?.message ?? 'Erro.', life: 4000 })
  }
}

async function excluirDep(id: string) {
  try {
    await $fetch(`/api/beneficios/dependentes-diretos/${id}`, { method: 'DELETE' })
    depDiretos.value = depDiretos.value.filter(d => d.id !== id)
    toast.add({ severity: 'success', summary: 'Dependente removido.', life: 3000 })
  } catch (e: any) {
    toast.add({ severity: 'error', summary: e?.data?.message ?? 'Erro.', life: 4000 })
  }
}

// ── Helpers visuais ───────────────────────────────────────────
const tipoLabel: Record<string, string> = {
  vale_transporte:'Vale-Transporte', vale_alimentacao:'Vale-Alimentação',
  cesta_basica:'Cesta Básica', saude:'Saúde', odonto:'Odonto', outros:'Outros'
}
const tipoIcon: Record<string, string> = {
  vale_transporte:'pi-car', vale_alimentacao:'pi-shopping-cart',
  cesta_basica:'pi-box', saude:'pi-heart', odonto:'pi-star', outros:'pi-tag'
}
const statusColor: Record<string, string> = {
  ativo:'text-emerald-600 bg-emerald-50',
  recusado:'text-red-500 bg-red-50',
  suspenso:'text-amber-500 bg-amber-50',
  cancelado:'text-slate-400 bg-slate-100',
}
const benefSelecionado = computed(() =>
  beneficiosDisponiveis.value.find(b => b.id === adesaoForm.value.cct_beneficio_id)
)
</script>

<template>
  <div>
    <SgoPageHeader title="Benefícios dos Colaboradores" subtitle="Gerencie adesões, planos e dependentes." icon="pi-id-card" />

    <div class="grid grid-cols-12 gap-4">

      <!-- Lista de colaboradores -->
      <div class="col-span-12 lg:col-span-4">
        <div class="sgo-card h-full">
          <div class="flex flex-col gap-2 mb-3">
            <InputText v-model="busca" placeholder="Buscar por nome, CPF ou matrícula..." class="w-full" />
            <Select v-model="filtroPrestadora" :options="prestadoraOpts" option-label="label" option-value="value" class="w-full" />
          </div>
          <div v-if="loadingColab" class="flex justify-center py-8">
            <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:1.5rem" />
          </div>
          <div v-else-if="!colabFiltrados.length" class="text-center py-6 text-slate-400 text-sm">Nenhum colaborador encontrado.</div>
          <div v-else class="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            <button
              v-for="c in colabFiltrados" :key="c.id"
              :class="['w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3',
                colabSelecionado?.id === c.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent']"
              @click="selecionarColab(c)">
              <SgoAvatar :name="c.nome" size="sm" />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-slate-800 text-sm truncate">{{ c.nome }}</p>
                <p class="text-xs text-slate-400 truncate">{{ c.matricula ?? c.cpf }}</p>
              </div>
              <SgoBadge :status="c.status" small />
            </button>
          </div>
        </div>
      </div>

      <!-- Painel direito -->
      <div class="col-span-12 lg:col-span-8">
        <!-- Placeholder -->
        <div v-if="!colabSelecionado" class="sgo-card flex items-center justify-center h-64">
          <SgoEmptyState icon="pi-arrow-left" title="Selecione um colaborador" description="Clique em um colaborador na lista para gerenciar seus benefícios." />
        </div>

        <!-- Loading -->
        <div v-else-if="loadingDetalhe" class="sgo-card flex items-center justify-center h-64">
          <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
        </div>

        <div v-else class="space-y-4">
          <!-- Cabeçalho do colaborador -->
          <div class="sgo-card flex items-center gap-4">
            <SgoAvatar :name="colabSelecionado.nome" size="lg" />
            <div class="flex-1">
              <p class="font-bold text-slate-800 text-lg">{{ colabSelecionado.nome }}</p>
              <p class="text-sm text-slate-500">{{ colabSelecionado.cpf }} <span v-if="colabSelecionado.matricula">• Matrícula: {{ colabSelecionado.matricula }}</span></p>
            </div>
            <Button label="Dependentes diretos" icon="pi pi-users" severity="secondary" outlined size="small" @click="abrirDep" />
          </div>

          <!-- Dependentes diretos cadastrados -->
          <div v-if="depDiretos.length" class="sgo-card py-3">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dependentes diretos</p>
            <div class="flex flex-wrap gap-2">
              <div v-for="d in depDiretos" :key="d.id"
                class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                <span class="font-medium text-slate-700">{{ d.nome }}</span>
                <span class="text-xs text-slate-400 capitalize">{{ d.parentesco }}</span>
                <button class="text-red-400 hover:text-red-600 ml-1" @click="excluirDep(d.id)">
                  <i class="pi pi-times text-xs" />
                </button>
              </div>
            </div>
          </div>

          <!-- Benefícios por alocação -->
          <div v-if="!alocacoes.length" class="sgo-card">
            <SgoEmptyState icon="pi-map-marker" title="Sem alocações ativas" description="O colaborador precisa estar alocado em um posto para receber benefícios." />
          </div>

          <div v-for="aloc in alocacoes" :key="aloc.id" class="sgo-card">
            <!-- Header da alocação -->
            <div class="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
              <div>
                <div class="flex items-center gap-2">
                  <i class="pi pi-map-marker text-blue-500 text-sm" />
                  <p class="font-bold text-slate-800">{{ aloc.posto?.nome ?? aloc.posto_id }}</p>
                  <span v-if="aloc.principal" class="text-[10px] bg-blue-100 text-blue-600 rounded px-1.5 py-0.5 font-semibold">PRINCIPAL</span>
                </div>
                <p class="text-xs text-slate-400 ml-5">{{ aloc.funcao?.nome ?? aloc.funcao_id }}</p>
              </div>
              <div class="flex gap-2">
                <Button label="Aplicar obrigatórios" icon="pi pi-bolt" severity="secondary" outlined size="small"
                  @click="aplicarObrigatorios(aloc.id)" />
                <Button label="Adicionar" icon="pi pi-plus" size="small" @click="abrirAdesao(aloc)" />
              </div>
            </div>

            <!-- Lista de benefícios desta alocação -->
            <div v-if="!(beneficiosPorAloc[aloc.id]?.length)" class="text-center py-4 text-slate-400 text-sm italic">
              Nenhum benefício aderido. Clique em "Aplicar obrigatórios" para registrar automaticamente os da CCT.
            </div>
            <div v-else class="space-y-2">
              <div v-for="b in beneficiosPorAloc[aloc.id]" :key="b.id"
                class="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50">
                <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <i :class="`pi ${tipoIcon[b.tipo] ?? 'pi-tag'} text-blue-500 text-sm`" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-700">{{ b.beneficio_nome }}</p>
                  <p class="text-xs text-slate-400">
                    {{ tipoLabel[b.tipo] }}
                    <span v-if="b.valor_unitario"> • R$ {{ Number(b.valor_unitario).toFixed(2) }}/{{ b.unidade }}</span>
                    <span v-if="b.custeio_saude === 'coparticipacao'"> • Copart. R$ {{ Number(b.valor_coparticipacao).toFixed(2) }}/mês</span>
                    <span v-if="b.custeio_saude === 'prestadora_100'"> • Prestadora paga 100%</span>
                    <span v-if="b.fornecedor_nome"> • {{ b.fornecedor_nome }}</span>
                  </p>
                  <p v-if="b.motivo_recusa" class="text-xs text-red-500 mt-0.5">Recusa: {{ b.motivo_recusa }}</p>
                </div>
                <span :class="['text-xs font-semibold rounded px-2 py-0.5 capitalize shrink-0', statusColor[b.status]]">
                  {{ b.status }}
                </span>
                <!-- Ações rápidas -->
                <div class="flex gap-1 shrink-0">
                  <button v-if="['saude','odonto'].includes(b.tipo) && b.status === 'ativo'"
                    class="w-7 h-7 rounded flex items-center justify-center text-blue-400 hover:bg-blue-50"
                    title="Cadastrar plano" @click="abrirSaude(aloc, b.tipo)">
                    <i class="pi pi-credit-card text-xs" />
                  </button>
                  <button v-if="b.status === 'ativo'"
                    class="w-7 h-7 rounded flex items-center justify-center text-amber-400 hover:bg-amber-50"
                    title="Suspender" @click="alterarStatusAdesao(b.id, 'suspenso')">
                    <i class="pi pi-pause text-xs" />
                  </button>
                  <button v-if="b.status === 'suspenso'"
                    class="w-7 h-7 rounded flex items-center justify-center text-emerald-500 hover:bg-emerald-50"
                    title="Reativar" @click="alterarStatusAdesao(b.id, 'ativo')">
                    <i class="pi pi-play text-xs" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Adesão -->
    <Dialog v-model:visible="modalAdesao" header="Registrar Adesão a Benefício" :style="{ width: '480px' }" modal>
      <div class="space-y-4 py-1">
        <div class="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm text-slate-600">
          Alocação: <strong>{{ alocacaoAtiva?.posto?.nome }}</strong> — {{ alocacaoAtiva?.funcao?.nome }}
        </div>

        <SgoFormField label="Benefício" field-id="ad_bn">
          <div v-if="!beneficiosDisponiveis.length" class="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <i class="pi pi-exclamation-circle mr-2" />Nenhuma CCT encontrada para esta função. Cadastre a CCT e vincule a função.
          </div>
          <Select v-else id="ad_bn" v-model="adesaoForm.cct_beneficio_id"
            :options="beneficiosDisponiveis.map(b => ({ label: `${tipoLabel[b.tipo]} — ${b.nome}`, value: b.id }))"
            option-label="label" option-value="value" placeholder="Selecione o benefício" class="w-full" />
        </SgoFormField>

        <!-- Info do benefício selecionado -->
        <div v-if="benefSelecionado" class="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 space-y-1">
          <p><strong>{{ benefSelecionado.nome }}</strong></p>
          <p>Obrigatoriedade: <strong>{{ benefSelecionado.obrigatoriedade === 'obrigatorio' ? 'Obrigatório pela CCT' : 'Opcional' }}</strong></p>
          <p v-if="benefSelecionado.valor_unitario">Valor: R$ {{ Number(benefSelecionado.valor_unitario).toFixed(2) }}/{{ benefSelecionado.unidade }}</p>
          <p v-if="benefSelecionado.percentual_desconto_colaborador > 0">Desconto colaborador: {{ benefSelecionado.percentual_desconto_colaborador }}%</p>
          <p v-if="benefSelecionado.custeio_saude === 'prestadora_100'">Custeio: Prestadora paga 100%</p>
          <p v-if="benefSelecionado.custeio_saude === 'coparticipacao'">Coparticipação: R$ {{ Number(benefSelecionado.valor_coparticipacao).toFixed(2) }}/mês</p>
        </div>

        <SgoFormField label="Status" field-id="ad_st">
          <Select id="ad_st" v-model="adesaoForm.status"
            :options="benefSelecionado?.obrigatoriedade === 'obrigatorio' ? statusAdesaoOpts.filter(o => o.value === 'ativo') : statusAdesaoOpts"
            option-label="label" option-value="value" class="w-full" />
          <p v-if="benefSelecionado?.obrigatoriedade === 'obrigatorio'" class="text-xs text-red-500 mt-1">
            Benefício obrigatório pela CCT — não pode ser recusado.
          </p>
        </SgoFormField>

        <SgoFormField v-if="adesaoForm.status === 'recusado'" label="Motivo da recusa" field-id="ad_mr">
          <Textarea id="ad_mr" v-model="adesaoForm.motivo_recusa" rows="2" class="w-full" />
        </SgoFormField>

        <SgoFormField v-if="fornecedoresDisponiveis.length" label="Fornecedor / Operadora" field-id="ad_fn">
          <Select id="ad_fn" v-model="adesaoForm.fornecedor_id"
            :options="[{label:'Nenhum',value:''},...fornecedoresDisponiveis.map(f => ({label:f.nome,value:f.id}))]"
            option-label="label" option-value="value" class="w-full" />
        </SgoFormField>

        <SgoFormField label="Data de adesão" field-id="ad_dt">
          <DatePicker id="ad_dt" v-model="adesaoForm.data_adesao" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalAdesao = false" />
          <Button label="Registrar" :loading="store.saving" @click="salvarAdesao" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Plano de Saúde / Odonto -->
    <Dialog v-model:visible="modalSaude" :header="saudeForm.tipo === 'saude' ? 'Cadastrar Plano de Saúde' : 'Cadastrar Plano Odonto'" :style="{ width: '480px' }" modal>
      <div class="space-y-4 py-1">
        <!-- Aviso odonto -->
        <div v-if="saudeForm.tipo === 'odonto'" class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          <i class="pi pi-info-circle mr-2" />Plano odontológico custeado 100% pelo colaborador. Dependentes não são incluídos.
        </div>

        <SgoFormField v-if="saudeForm.tipo === 'saude'" label="Custeio" field-id="pl_cu">
          <Select id="pl_cu" v-model="saudeForm.custeio" :options="custeioOpts" option-label="label" option-value="value" class="w-full" />
        </SgoFormField>

        <SgoFormField v-if="saudeForm.tipo === 'saude' && saudeForm.custeio === 'coparticipacao'" label="Valor coparticipação (R$/mês)" field-id="pl_cp">
          <InputNumber id="pl_cp" v-model="saudeForm.valor_coparticipacao" mode="decimal" :min-fraction-digits="2" class="w-full" />
        </SgoFormField>

        <SgoFormField label="Operadora / Fornecedor" field-id="pl_op">
          <Select id="pl_op" v-model="saudeForm.fornecedor_id"
            :options="[{label:'Nenhum',value:''},...fornecedoresSaude.map(f => ({label:f.nome,value:f.id}))]"
            option-label="label" option-value="value" class="w-full" />
        </SgoFormField>

        <SgoFormField label="Nº da carteirinha" field-id="pl_nc">
          <InputText id="pl_nc" v-model="saudeForm.numero_carteirinha" class="w-full" />
        </SgoFormField>

        <SgoFormField label="Data de inclusão" field-id="pl_dt">
          <DatePicker id="pl_dt" v-model="saudeForm.data_inclusao" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>

        <!-- Dependentes — só para saúde -->
        <div v-if="saudeForm.tipo === 'saude' && depDiretos.length">
          <p class="text-sm font-semibold text-slate-600 mb-2">Incluir dependentes diretos no plano</p>
          <div class="space-y-1">
            <label v-for="d in depDiretos" :key="d.id" class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer">
              <Checkbox v-model="saudeForm.dependentes" :value="d.id" :binary="false" />
              <span class="text-sm text-slate-700">{{ d.nome }}</span>
              <span class="text-xs text-slate-400 capitalize">{{ d.parentesco }}</span>
            </label>
          </div>
        </div>
        <div v-else-if="saudeForm.tipo === 'saude' && !depDiretos.length" class="text-sm text-slate-400 italic">
          Nenhum dependente direto cadastrado. Adicione dependentes no painel acima se necessário.
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalSaude = false" />
          <Button label="Cadastrar plano" @click="salvarSaude" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Dependente direto -->
    <Dialog v-model:visible="modalDep" header="Adicionar Dependente Direto" :style="{ width: '440px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Nome" field-id="dp_nm" class="col-span-2">
          <InputText id="dp_nm" v-model="depForm.nome" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Parentesco" field-id="dp_pr">
          <Select id="dp_pr" v-model="depForm.parentesco" :options="parentescoOpts" option-label="label" option-value="value" class="w-full" />
        </SgoFormField>
        <SgoFormField label="CPF" field-id="dp_cpf">
          <InputText id="dp_cpf" v-model="depForm.cpf" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Data de nascimento" field-id="dp_dn" class="col-span-2">
          <DatePicker id="dp_dn" v-model="depForm.data_nasc" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalDep = false" />
          <Button label="Adicionar" @click="salvarDep" />
        </div>
      </template>
    </Dialog>

    <Toast />
  </div>
</template>
