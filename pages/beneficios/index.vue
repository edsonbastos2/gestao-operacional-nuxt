<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store    = useBeneficiosStore()
const cadastros = useCadastrosStore()
const toast    = useToast()

const tabAtiva      = ref(0)
const modalCct      = ref(false)
const modalBenef    = ref(false)
const modalForn     = ref(false)
const editandoCct   = ref<any>(null)
const editandoBenef = ref<any>(null)
const editandoForn  = ref<any>(null)
const cctSelecionada = ref<any>(null)

const filtroPrestadora = ref('')
const filtroCct        = ref('')

const tipoOpts = [
  { label: 'Vale-Transporte',    value: 'vale_transporte',  icon: 'pi-car' },
  { label: 'Vale-Alimentação',   value: 'vale_alimentacao', icon: 'pi-shopping-cart' },
  { label: 'Cesta Básica',       value: 'cesta_basica',     icon: 'pi-box' },
  { label: 'Saúde',              value: 'saude',            icon: 'pi-heart' },
  { label: 'Odonto',             value: 'odonto',           icon: 'pi-star' },
  { label: 'Outros',             value: 'outros',           icon: 'pi-tag' },
]
const formaPagOpts = [
  { label: 'Dinheiro',           value: 'dinheiro' },
  { label: 'Cartão',             value: 'cartao' },
  { label: 'Retirada física',    value: 'fisico' },
  { label: 'Depósito bancário',  value: 'deposito' },
  { label: 'Via VA (junto ao vale-alimentação)', value: 'via_va' },
]
const custeioOpts = [
  { label: 'Prestadora paga 100%',           value: 'prestadora_100' },
  { label: 'Coparticipação do colaborador',  value: 'coparticipacao' },
]
// Formas permitidas por tipo
const formasPorTipo: Record<string, string[]> = {
  vale_transporte:  ['cartao','dinheiro'],
  vale_alimentacao: ['cartao','dinheiro','deposito'],
  cesta_basica:     ['dinheiro','via_va','fisico'],
  outros:           ['dinheiro','cartao','fisico','deposito'],
}
const formasDisponiveis = computed(() => {
  const permitidas = formasPorTipo[benefForm.value.tipo]
  return permitidas ? formaPagOpts.filter(f => permitidas.includes(f.value)) : formaPagOpts
})
const obrigOpts = [
  { label: 'Obrigatório',  value: 'obrigatorio' },
  { label: 'Opcional',     value: 'opcional' },
]

const cctForm  = ref<any>({ prestadora_id:'', nome:'', sindicato:'', numero_registro:'', data_inicio:'', data_fim:'', funcoes:[], observacoes:'' })
const benefForm = ref<any>({ cct_id:'', tipo:'', nome:'', obrigatoriedade:'obrigatorio', forma_pagamento:'dinheiro', custeio_saude:'', valor_coparticipacao:'', valor_unitario:'', percentual_desconto_colaborador:0, unidade:'dia', vigencia_inicio:'', vigencia_fim:'', observacoes:'' })
const fornForm  = ref<any>({ prestadora_id:'', nome:'', tipo:'', cnpj:'', contato:'', observacoes:'' })

const prestadoraOpts = computed(() => cadastros.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id })))
const funcaoOpts     = computed(() => cadastros.funcoes.map(f => ({ label: f.nome, value: f.id })))
const cctOpts        = computed(() => store.ccts.filter(c => !filtroPrestadora.value || c.prestadora_id === filtroPrestadora.value).map(c => ({ label: c.nome, value: c.id })))

const tipoLabel = (t: string) => tipoOpts.find(o => o.value === t)?.label ?? t
const tipoIcon  = (t: string) => tipoOpts.find(o => o.value === t)?.icon ?? 'pi-tag'

onMounted(async () => {
  await Promise.all([
    cadastros.listarPrestadoras({ status: 'ativo' }),
    cadastros.listarFuncoes({ status: 'ativo' }),
    store.listarCcts(),
    store.listarBeneficios(),
    store.listarFornecedores(),
  ])
})

// ── CCTs ─────────────────────────────────────────────────────
function abrirNovaCct() { editandoCct.value = null; cctForm.value = { prestadora_id:'', nome:'', sindicato:'', numero_registro:'', data_inicio:'', data_fim:'', funcoes:[], observacoes:'' }; modalCct.value = true }
function abrirEditarCct(c: any) {
  editandoCct.value = c
  const funcIds = c.sgo_cct_funcoes?.map((cf: any) => cf.funcao_id) ?? []
  cctForm.value = {
    ...c,
    funcoes:     funcIds,
    data_inicio: toDate(c.data_inicio),
    data_fim:    toDate(c.data_fim),
  }
  modalCct.value = true
}
async function salvarCct() {
  if (!cctForm.value.prestadora_id || !cctForm.value.nome || !cctForm.value.data_inicio) {
    toast.add({ severity: 'warn', summary: 'Preencha prestadora, nome e data de início.', life: 3000 }); return
  }
  try {
    const payload = {
      ...cctForm.value,
      data_inicio: toStr(cctForm.value.data_inicio),
      data_fim:    toStr(cctForm.value.data_fim),
    }
    await store.salvarCct(payload, editandoCct.value?.id)
    modalCct.value = false
    toast.add({ severity: 'success', summary: editandoCct.value ? 'CCT atualizada.' : 'CCT cadastrada.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

// ── Benefícios ────────────────────────────────────────────────
function abrirNovoBenef(cct?: any) { editandoBenef.value = null; benefForm.value = { cct_id: cct?.id ?? '', tipo:'', nome:'', obrigatoriedade:'obrigatorio', forma_pagamento:'dinheiro', valor_unitario:'', percentual_desconto_colaborador:0, unidade:'dia', vigencia_inicio:'', vigencia_fim:'', observacoes:'' }; modalBenef.value = true }
function abrirEditarBenef(b: any) {
  editandoBenef.value = b
  benefForm.value = {
    ...b,
    vigencia_inicio: toDate(b.vigencia_inicio),
    vigencia_fim:    toDate(b.vigencia_fim),
  }
  modalBenef.value = true
}
async function salvarBenef() {
  if (!benefForm.value.cct_id || !benefForm.value.tipo || !benefForm.value.nome || !benefForm.value.vigencia_inicio) {
    toast.add({ severity: 'warn', summary: 'Preencha CCT, tipo, nome e vigência.', life: 3000 }); return
  }
  try {
    const payload = {
      ...benefForm.value,
      vigencia_inicio: toStr(benefForm.value.vigencia_inicio),
      vigencia_fim:    toStr(benefForm.value.vigencia_fim),
    }
    await store.salvarBeneficio(payload, editandoBenef.value?.id)
    await store.listarBeneficios()
    modalBenef.value = false
    toast.add({ severity: 'success', summary: editandoBenef.value ? 'Benefício atualizado.' : 'Benefício cadastrado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

// ── Fornecedores ──────────────────────────────────────────────
function abrirNovoForn() { editandoForn.value = null; fornForm.value = { prestadora_id:'', nome:'', tipo:'', cnpj:'', contato:'', observacoes:'' }; modalForn.value = true }
function abrirEditarForn(f: any) { editandoForn.value = f; fornForm.value = { ...f }; modalForn.value = true }
async function salvarForn() {
  if (!fornForm.value.prestadora_id || !fornForm.value.nome || !fornForm.value.tipo) {
    toast.add({ severity: 'warn', summary: 'Preencha prestadora, nome e tipo.', life: 3000 }); return
  }
  try {
    await store.salvarFornecedor(fornForm.value, editandoForn.value?.id)
    modalForn.value = false
    toast.add({ severity: 'success', summary: editandoForn.value ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

// Benefícios filtrados por CCT selecionada
const beneficiosFiltrados = computed(() => {
  let list = store.beneficios
  if (filtroCct.value)        list = list.filter((b: any) => b.cct_id === filtroCct.value)
  if (filtroPrestadora.value) list = list.filter((b: any) => b.sgo_ccts?.prestadora_id === filtroPrestadora.value)
  return list
})

// Converte string 'YYYY-MM-DD' → Date (DatePicker exige objeto Date)
// e Date → string para envio ao Supabase
const toDate  = (v: any): Date | null => v ? new Date(v + (typeof v === 'string' ? 'T12:00:00' : '')) : null
const toStr   = (v: any): string | null => {
  if (!v) return null
  if (typeof v === 'string') return v
  const d = v as Date
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const obrigBadge = (o: string) => o === 'obrigatorio'
  ? 'text-xs font-semibold text-red-600 bg-red-50 rounded px-2 py-0.5'
  : 'text-xs font-semibold text-slate-500 bg-slate-100 rounded px-2 py-0.5'
</script>

<template>
  <div>
    <SgoPageHeader title="Benefícios e CCTs" subtitle="Convenções Coletivas, benefícios por função e fornecedores." icon="pi-gift">
      <template #actions>
        <Button v-if="tabAtiva === 0" label="Nova CCT"         icon="pi pi-plus" size="small" @click="abrirNovaCct" />
        <Button v-if="tabAtiva === 1" label="Novo benefício"   icon="pi pi-plus" size="small" @click="abrirNovoBenef()" />
        <Button v-if="tabAtiva === 2" label="Novo fornecedor"  icon="pi pi-plus" size="small" @click="abrirNovoForn" />
      </template>
    </SgoPageHeader>

    <!-- KPIs -->
    <div class="grid grid-cols-3 gap-4 mb-4">
      <SgoStatCard title="CCTs cadastradas"   :value="store.ccts.length"        icon="pi-file-edit"    icon-bg="bg-blue-50"  icon-color="#2563eb" />
      <SgoStatCard title="Benefícios ativos"  :value="store.beneficios.length"  icon="pi-gift"         icon-bg="bg-green-50" icon-color="#16a34a" />
      <SgoStatCard title="Fornecedores"       :value="store.fornecedores.length" icon="pi-building"    icon-bg="bg-purple-50" icon-color="#7c3aed" />
    </div>

    <!-- Filtros globais -->
    <div class="sgo-card mb-4 flex flex-wrap gap-3 items-center">
      <Select v-model="filtroPrestadora" :options="[{label:'Todas as prestadoras',value:''},...prestadoraOpts]"
        option-label="label" option-value="value" class="w-56" placeholder="Prestadora" />
      <Select v-if="tabAtiva === 1" v-model="filtroCct" :options="[{label:'Todas as CCTs',value:''},...cctOpts]"
        option-label="label" option-value="value" class="w-56" placeholder="CCT" />
    </div>

    <Tabs v-model:value="tabAtiva">
      <TabList>
        <Tab :value="0">CCTs ({{ store.ccts.length }})</Tab>
        <Tab :value="1">Benefícios ({{ store.beneficios.length }})</Tab>
        <Tab :value="2">Fornecedores ({{ store.fornecedores.length }})</Tab>
      </TabList>
      <TabPanels>

        <!-- ── Tab CCTs ─────────────────────────────────────── -->
        <TabPanel :value="0">
          <div v-if="store.loading" class="flex justify-center py-12"><i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" /></div>
          <SgoEmptyState v-else-if="!store.ccts.length" icon="pi-file-edit" title="Nenhuma CCT cadastrada" description="Cadastre as Convenções Coletivas de Trabalho da prestadora." />
          <div v-else class="space-y-3">
            <div v-for="cct in store.ccts.filter(c => !filtroPrestadora || c.prestadora_id === filtroPrestadora)" :key="cct.id"
              class="sgo-card hover:shadow-md transition-shadow">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <i class="pi pi-file-edit text-blue-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="font-bold text-slate-800">{{ cct.nome }}</p>
                    <SgoBadge :status="cct.status" small />
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">
                    {{ cct.sgo_prestadoras?.nome_fantasia ?? cct.sgo_prestadoras?.razao_social }}
                    <span v-if="cct.sindicato"> • {{ cct.sindicato }}</span>
                    <span v-if="cct.numero_registro"> • Registro: {{ cct.numero_registro }}</span>
                  </p>
                  <p class="text-xs text-slate-400 mt-1">
                    Vigência: {{ new Date(cct.data_inicio).toLocaleDateString('pt-BR') }}
                    {{ cct.data_fim ? ` até ${new Date(cct.data_fim).toLocaleDateString('pt-BR')}` : ' — em vigor' }}
                  </p>
                  <!-- Funções vinculadas -->
                  <div v-if="cct.sgo_cct_funcoes?.length" class="flex flex-wrap gap-1 mt-2">
                    <span v-for="cf in cct.sgo_cct_funcoes" :key="cf.funcao_id"
                      class="text-[11px] bg-indigo-50 text-indigo-700 rounded px-2 py-0.5 font-medium">
                      {{ cf.sgo_funcoes?.nome }}
                    </span>
                  </div>
                </div>
                <div class="flex gap-1 shrink-0">
                  <button class="w-8 h-8 rounded flex items-center justify-center text-blue-500 hover:bg-blue-50" @click="abrirNovoBenef(cct)" title="Adicionar benefício">
                    <i class="pi pi-plus-circle text-sm" />
                  </button>
                  <button class="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-50" @click="abrirEditarCct(cct)">
                    <i class="pi pi-pencil text-sm" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- ── Tab Benefícios ───────────────────────────────── -->
        <TabPanel :value="1">
          <div v-if="store.loading" class="flex justify-center py-12"><i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" /></div>
          <SgoEmptyState v-else-if="!beneficiosFiltrados.length" icon="pi-gift" title="Nenhum benefício cadastrado" description="Selecione uma CCT e adicione os benefícios previstos na convenção." />
          <div v-else class="space-y-2">
            <div v-for="b in beneficiosFiltrados" :key="b.id"
              class="flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div class="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <i :class="`pi ${tipoIcon(b.tipo)} text-green-600`" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-semibold text-slate-800 text-sm">{{ b.nome }}</p>
                  <span :class="obrigBadge(b.obrigatoriedade)">{{ b.obrigatoriedade === 'obrigatorio' ? 'Obrigatório' : 'Opcional' }}</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ tipoLabel(b.tipo) }} • {{ b.sgo_ccts?.nome }}
                  <span v-if="b.valor_unitario"> • R$ {{ Number(b.valor_unitario).toFixed(2) }}/{{ b.unidade }}</span>
                  <span v-if="b.percentual_desconto_colaborador > 0"> • Desconto collab: {{ b.percentual_desconto_colaborador }}%</span>
                </p>
                <p class="text-xs text-slate-400">
                  Vigência: {{ new Date(b.vigencia_inicio).toLocaleDateString('pt-BR') }}
                  {{ b.vigencia_fim ? ` até ${new Date(b.vigencia_fim).toLocaleDateString('pt-BR')}` : '' }}
                  • Pagamento: {{ formaPagOpts.find(f => f.value === b.forma_pagamento)?.label }}
                </p>
              </div>
              <button class="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 shrink-0" @click="abrirEditarBenef(b)">
                <i class="pi pi-pencil text-sm" />
              </button>
            </div>
          </div>
        </TabPanel>

        <!-- ── Tab Fornecedores ─────────────────────────────── -->
        <TabPanel :value="2">
          <div v-if="store.loading" class="flex justify-center py-12"><i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" /></div>
          <SgoEmptyState v-else-if="!store.fornecedores.length" icon="pi-building" title="Nenhum fornecedor cadastrado" description="Cadastre operadoras de saúde, administradoras de cartão VT/VA etc." />
          <div v-else class="space-y-2">
            <div v-for="f in store.fornecedores.filter((f: any) => !filtroPrestadora || f.prestadora_id === filtroPrestadora)" :key="f.id"
              class="flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <i :class="`pi ${tipoIcon(f.tipo)} text-purple-600`" />
              </div>
              <div class="flex-1">
                <p class="font-semibold text-slate-800 text-sm">{{ f.nome }}</p>
                <p class="text-xs text-slate-500">{{ tipoLabel(f.tipo) }}<span v-if="f.cnpj"> • CNPJ: {{ f.cnpj }}</span><span v-if="f.contato"> • {{ f.contato }}</span></p>
              </div>
              <SgoBadge :status="f.status" small />
              <button class="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 shrink-0" @click="abrirEditarForn(f)">
                <i class="pi pi-pencil text-sm" />
              </button>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <!-- Modal CCT -->
    <Dialog v-model:visible="modalCct" :header="editandoCct ? 'Editar CCT' : 'Nova CCT'" :style="{ width: '540px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Prestadora" field-id="cct_pr" class="col-span-2">
          <Select id="cct_pr" v-model="cctForm.prestadora_id" :options="prestadoraOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Nome da CCT" field-id="cct_nm" class="col-span-2">
          <InputText id="cct_nm" v-model="cctForm.nome" placeholder="Ex: CCT Vigilantes 2026" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Sindicato" field-id="cct_si">
          <InputText id="cct_si" v-model="cctForm.sindicato" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Nº Registro MTE" field-id="cct_nr">
          <InputText id="cct_nr" v-model="cctForm.numero_registro" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Início de vigência" field-id="cct_di">
          <DatePicker id="cct_di" v-model="cctForm.data_inicio" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Fim de vigência" field-id="cct_df">
          <DatePicker id="cct_df" v-model="cctForm.data_fim" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Funções abrangidas" field-id="cct_fn" class="col-span-2">
          <MultiSelect id="cct_fn" v-model="cctForm.funcoes" :options="funcaoOpts" option-label="label" option-value="value"
            display="chip" placeholder="Selecione as funções" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Observações" field-id="cct_ob" class="col-span-2">
          <Textarea id="cct_ob" v-model="cctForm.observacoes" rows="2" class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalCct = false" />
          <Button :label="editandoCct ? 'Salvar' : 'Cadastrar'" :loading="store.saving" @click="salvarCct" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Benefício -->
    <Dialog v-model:visible="modalBenef" :header="editandoBenef ? 'Editar Benefício' : 'Novo Benefício'" :style="{ width: '560px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="CCT" field-id="bn_cct" class="col-span-2">
          <Select id="bn_cct" v-model="benefForm.cct_id" :options="cctOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Tipo" field-id="bn_tp">
          <Select id="bn_tp" v-model="benefForm.tipo" :options="tipoOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Obrigatoriedade" field-id="bn_ob">
          <Select id="bn_ob" v-model="benefForm.obrigatoriedade" :options="obrigOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Nome" field-id="bn_nm" class="col-span-2">
          <InputText id="bn_nm" v-model="benefForm.nome" placeholder="Ex: Vale-Alimentação CCT 2026" class="w-full" />
        </SgoFormField>

        <!-- Custeio saúde — só aparece para tipo saude -->
        <template v-if="benefForm.tipo === 'saude'">
          <SgoFormField label="Custeio do plano" field-id="bn_cs" class="col-span-2">
            <Select id="bn_cs" v-model="benefForm.custeio_saude" :options="custeioOpts" option-label="label" option-value="value" />
          </SgoFormField>
          <SgoFormField v-if="benefForm.custeio_saude === 'coparticipacao'" label="Valor coparticipação (R$/mês)" field-id="bn_cp" class="col-span-2">
            <InputNumber id="bn_cp" v-model="benefForm.valor_coparticipacao" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="2" class="w-full" />
          </SgoFormField>
          <div class="col-span-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
            <i class="pi pi-info-circle mr-2" />Dependentes no plano de saúde: somente <strong>cônjuge, filhos, enteados, pai e mãe</strong>.
          </div>
        </template>

        <!-- Odonto: aviso custo colaborador -->
        <div v-if="benefForm.tipo === 'odonto'" class="col-span-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          <i class="pi pi-exclamation-circle mr-2" /><strong>Plano odontológico</strong> é custeado 100% pelo colaborador. Dependentes não são cobertos pela prestadora.
        </div>

        <!-- Forma de pagamento — oculto para saúde/odonto -->
        <SgoFormField v-if="!['saude','odonto'].includes(benefForm.tipo)" label="Forma de pagamento" field-id="bn_fp" class="col-span-2">
          <Select id="bn_fp" v-model="benefForm.forma_pagamento" :options="formasDisponiveis" option-label="label" option-value="value" />
          <p v-if="benefForm.tipo === 'cesta_basica'" class="text-xs text-slate-400 mt-1">
            Cesta básica: dinheiro, junto ao VA ou retirada física no fornecedor.
          </p>
        </SgoFormField>

        <!-- Desconto colaborador — apenas VT (6% CLT) ou odonto -->
        <SgoFormField v-if="['vale_transporte','odonto'].includes(benefForm.tipo)" label="Desconto colaborador (%)" field-id="bn_dc" class="col-span-2">
          <InputNumber id="bn_dc" v-model="benefForm.percentual_desconto_colaborador" :min="0" :max="100" suffix="%" class="w-full" />
          <p v-if="benefForm.tipo === 'vale_transporte'" class="text-xs text-slate-400 mt-1">Padrão CLT: 6% do salário do colaborador.</p>
          <p v-if="benefForm.tipo === 'odonto'" class="text-xs text-slate-400 mt-1">Odonto: 100% custeado pelo colaborador.</p>
        </SgoFormField>

        <SgoFormField label="Valor unitário (R$)" field-id="bn_vl">
          <InputNumber id="bn_vl" v-model="benefForm.valor_unitario" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="2" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Unidade" field-id="bn_un">
          <Select id="bn_un" v-model="benefForm.unidade" :options="[{label:'Por dia',value:'dia'},{label:'Por mês',value:'mes'},{label:'Por unidade',value:'unidade'}]" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Vigência início" field-id="bn_vi">
          <DatePicker id="bn_vi" v-model="benefForm.vigencia_inicio" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Vigência fim" field-id="bn_vf">
          <DatePicker id="bn_vf" v-model="benefForm.vigencia_fim" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalBenef = false" />
          <Button :label="editandoBenef ? 'Salvar' : 'Cadastrar'" :loading="store.saving" @click="salvarBenef" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Fornecedor -->
    <Dialog v-model:visible="modalForn" :header="editandoForn ? 'Editar Fornecedor' : 'Novo Fornecedor'" :style="{ width: '480px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Prestadora" field-id="fn_pr" class="col-span-2">
          <Select id="fn_pr" v-model="fornForm.prestadora_id" :options="prestadoraOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Nome" field-id="fn_nm" class="col-span-2">
          <InputText id="fn_nm" v-model="fornForm.nome" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Tipo de benefício" field-id="fn_tp">
          <Select id="fn_tp" v-model="fornForm.tipo" :options="tipoOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="CNPJ" field-id="fn_cn">
          <InputText id="fn_cn" v-model="fornForm.cnpj" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Contato" field-id="fn_ct" class="col-span-2">
          <InputText id="fn_ct" v-model="fornForm.contato" class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalForn = false" />
          <Button :label="editandoForn ? 'Salvar' : 'Cadastrar'" :loading="store.saving" @click="salvarForn" />
        </div>
      </template>
    </Dialog>

    <Toast />
  </div>
</template>