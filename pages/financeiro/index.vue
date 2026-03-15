<script setup lang="ts">
definePageMeta({ layout: 'default' })
const store      = useFinanceiroStore()
const compStore  = useCompetenciaStore()
const cadastros  = useCadastrosStore()
const toast      = useToast()

const tabAtiva          = ref(0)
const competenciaSel    = ref<any>(null)
const filtroPrestadora  = ref('')
const modalCalculo      = ref(false)
const modalSalario      = ref(false)
const colaboradores     = ref<any[]>([])
const colabSel          = ref<any>(null)
const resultadoCalculo  = ref<any>(null)
const calculando        = ref(false)

const salForm = ref<any>({ colaborador_id:'', salario:'', vigencia_inicio:'', motivo:'' })

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const toStr = (v: any) => {
  if (!v) return null
  if (typeof v === 'string') return v
  const d = v as Date
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const fmt = (v: any) => Number(v ?? 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

onMounted(async () => {
  await Promise.all([
    compStore.listar(),
    cadastros.listarPrestadoras({ status: 'ativo' }),
  ])
  const rc = await $fetch<any>('/api/colaboradores', { params: { per_page: 200 } })
  colaboradores.value = rc.data ?? []
})

const competenciaOpts = computed(() =>
  compStore.competencias.map(c => ({
    label: `${meses[c.mes-1]} ${c.ano} — ${c.status_fechamento === 'fechada' ? 'Fechada' : 'Aberta'}`,
    value: c.id,
    obj: c,
  }))
)
const prestadoraOpts = computed(() => [
  { label: 'Todas', value: '' },
  ...cadastros.prestadoras.map(p => ({ label: p.nome_fantasia ?? p.razao_social, value: p.id }))
])
const colaboradorOpts = computed(() =>
  colaboradores.value.map(c => ({ label: c.nome, value: c.id }))
)

// ── Folha ────────────────────────────────────────────────────
async function selecionarCompetencia(id: string) {
  const comp = compStore.competencias.find(c => c.id === id)
  competenciaSel.value = comp ?? null
  if (id) await store.carregarFolha(id, { prestadora_id: filtroPrestadora.value || undefined })
}

async function filtrar() {
  if (!competenciaSel.value) return
  await store.carregarFolha(competenciaSel.value.id, { prestadora_id: filtroPrestadora.value || undefined })
}

async function calcularFolha() {
  if (!competenciaSel.value) return
  calculando.value = true
  try {
    resultadoCalculo.value = await store.calcularFolha(competenciaSel.value.id)
    await store.carregarFolha(competenciaSel.value.id)
    modalCalculo.value = false
    const r = resultadoCalculo.value
    toast.add({
      severity: r.erros?.length ? 'warn' : 'success',
      summary: `Folha calculada: ${r.calculados} colaboradores. Total líquido: ${fmt(r.total_liquido)}${r.erros?.length ? ` | ${r.erros.length} sem salário.` : ''}`,
      life: 6000,
    })
  } catch {
    toast.add({ severity:'error', summary: store.error ?? 'Erro ao calcular.', life: 4000 })
  } finally { calculando.value = false }
}

// Exportar XLSX via endpoint (usa dados já calculados)
async function exportarXLSX() {
  if (!competenciaSel.value || !store.folha.length) return
  const comp = competenciaSel.value
  // Prepara dados para CSV (fallback simples)
  const headers = ['Matrícula','Colaborador','Posto','Função','Salário Base','Dias Úteis','Dias Trab.','Sal. Bruto','H.Extras','Feriados','Total Proventos','Desc.Faltas','Desc.VT','Total Descontos','Salário Líquido']
  const rows = store.folha.map(f => [
    f.colaborador_matricula ?? '',
    f.colaborador_nome,
    f.posto_nome ?? '',
    f.funcao_nome ?? '',
    f.salario_base,
    f.dias_uteis,
    f.dias_trabalhados,
    f.salario_bruto,
    f.valor_horas_extras,
    f.valor_feriados,
    f.total_proventos,
    f.desconto_faltas,
    f.desconto_vt,
    f.total_descontos,
    f.salario_liquido,
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `folha_${meses[comp.mes-1]}_${comp.ano}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ severity:'success', summary:'CSV exportado com sucesso.', life:3000 })
}

// ── Histórico salarial ────────────────────────────────────────
async function abrirHistorico(colab: any) {
  colabSel.value = colab
  salForm.value = { colaborador_id: colab.id, salario:'', vigencia_inicio:'', motivo:'' }
  await store.listarHistorico(colab.id)
  tabAtiva.value = 1
}

function abrirModalSalario(colab?: any) {
  if (colab) { colabSel.value = colab; salForm.value = { colaborador_id: colab.id, salario:'', vigencia_inicio:'', motivo:'' } }
  modalSalario.value = true
}

async function salvarSalario() {
  if (!salForm.value.colaborador_id || !salForm.value.salario || !salForm.value.vigencia_inicio) {
    toast.add({ severity:'warn', summary:'Colaborador, salário e vigência são obrigatórios.', life:3000 }); return
  }
  try {
    await store.registrarSalario({ ...salForm.value, vigencia_inicio: toStr(salForm.value.vigencia_inicio) })
    modalSalario.value = false
    toast.add({ severity:'success', summary:'Salário registrado.', life:3000 })
    if (colabSel.value) await store.listarHistorico(colabSel.value.id)
  } catch { toast.add({ severity:'error', summary: store.error ?? 'Erro.', life:4000 }) }
}

// KPIs da folha
const totalLiquido   = computed(() => store.folha.reduce((s, f) => s + Number(f.salario_liquido), 0))
const totalProventos = computed(() => store.folha.reduce((s, f) => s + Number(f.total_proventos), 0))
const totalDescontos = computed(() => store.folha.reduce((s, f) => s + Number(f.total_descontos), 0))
const semSalario     = computed(() => colaboradores.value.filter(c => c.status === 'ativo').length - store.folha.length)
</script>

<template>
  <div>
    <SgoPageHeader title="Financeiro / Folha" subtitle="Cálculo e exportação da folha de pagamento." icon="pi-money-bill" />

    <Tabs v-model:value="tabAtiva">
      <TabList>
        <Tab :value="0">Folha de Pagamento</Tab>
        <Tab :value="1">Histórico Salarial</Tab>
      </TabList>
      <TabPanels>

        <!-- ── Folha ─────────────────────────────────────────── -->
        <TabPanel :value="0">
          <!-- Seleção e ações -->
          <div class="sgo-card mb-4 flex flex-wrap gap-3 items-end">
            <SgoFormField label="Competência" field-id="fp_comp" class="w-72">
              <Select id="fp_comp" v-model="competenciaSel"
                :options="competenciaOpts" option-label="label" option-value="obj"
                placeholder="Selecione a competência" class="w-full"
                @change="selecionarCompetencia($event.value?.id)" />
            </SgoFormField>
            <SgoFormField label="Prestadora" field-id="fp_pr" class="w-56">
              <Select id="fp_pr" v-model="filtroPrestadora" :options="prestadoraOpts"
                option-label="label" option-value="value" class="w-full" @change="filtrar" />
            </SgoFormField>
            <div class="flex gap-2 ml-auto">
              <Button label="Calcular folha" icon="pi pi-calculator" severity="secondary" outlined
                :disabled="!competenciaSel" @click="modalCalculo = true" />
              <Button label="Exportar CSV" icon="pi pi-download"
                :disabled="!store.folha.length" @click="exportarXLSX" />
            </div>
          </div>

          <!-- KPIs -->
          <div v-if="store.folha.length" class="grid grid-cols-4 gap-4 mb-4">
            <SgoStatCard title="Colaboradores"    :value="store.folha.length"     icon="pi-users"       icon-bg="bg-slate-50"   icon-color="#64748b" />
            <SgoStatCard title="Total Proventos"  :value="fmt(totalProventos)"    icon="pi-arrow-up"    icon-bg="bg-emerald-50" icon-color="#059669" />
            <SgoStatCard title="Total Descontos"  :value="fmt(totalDescontos)"    icon="pi-arrow-down"  icon-bg="bg-red-50"     icon-color="#dc2626" />
            <SgoStatCard title="Total Líquido"    :value="fmt(totalLiquido)"      icon="pi-wallet"      icon-bg="bg-blue-50"    icon-color="#2563eb" />
          </div>

          <div v-if="store.loading" class="flex justify-center py-12">
            <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
          </div>
          <SgoEmptyState v-else-if="!competenciaSel" icon="pi-calendar"
            title="Selecione uma competência" description="Escolha a competência para visualizar ou calcular a folha." />
          <SgoEmptyState v-else-if="!store.folha.length" icon="pi-calculator"
            title="Folha não calculada" description="Clique em 'Calcular folha' para processar os dados desta competência." />

          <!-- Tabela folha -->
          <div v-else class="sgo-card overflow-hidden p-0">
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th class="text-left px-3 py-3 text-slate-500 font-semibold">Colaborador</th>
                    <th class="text-left px-3 py-3 text-slate-500 font-semibold">Posto</th>
                    <th class="text-right px-3 py-3 text-slate-500 font-semibold">Sal. Base</th>
                    <th class="text-center px-3 py-3 text-slate-500 font-semibold">Dias</th>
                    <th class="text-right px-3 py-3 text-slate-500 font-semibold">Sal. Bruto</th>
                    <th class="text-right px-3 py-3 text-slate-500 font-semibold">+ Extras</th>
                    <th class="text-right px-3 py-3 text-slate-500 font-semibold">+ Feriados</th>
                    <th class="text-right px-3 py-3 text-slate-500 font-semibold">- Faltas</th>
                    <th class="text-right px-3 py-3 text-slate-500 font-semibold">- VT</th>
                    <th class="text-right px-3 py-3 text-slate-500 font-semibold font-bold">Líquido</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <tr v-for="f in store.folha" :key="f.id"
                    :class="['hover:bg-slate-50 transition-colors', f.desconto_faltas > 0 ? 'bg-red-50/20' : '']">
                    <td class="px-3 py-2.5">
                      <p class="font-semibold text-slate-800">{{ f.colaborador_nome }}</p>
                      <p class="text-slate-400">{{ f.colaborador_matricula }}</p>
                    </td>
                    <td class="px-3 py-2.5 text-slate-600">{{ f.posto_nome }}<br><span class="text-slate-400">{{ f.funcao_nome }}</span></td>
                    <td class="px-3 py-2.5 text-right text-slate-600">{{ fmt(f.salario_base) }}</td>
                    <td class="px-3 py-2.5 text-center text-slate-600">
                      {{ f.dias_trabalhados }}<span class="text-slate-400">/{{ f.dias_uteis }}</span>
                    </td>
                    <td class="px-3 py-2.5 text-right text-slate-700">{{ fmt(f.salario_bruto) }}</td>
                    <td class="px-3 py-2.5 text-right">
                      <span :class="f.valor_horas_extras > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-300'">
                        {{ f.valor_horas_extras > 0 ? fmt(f.valor_horas_extras) : '—' }}
                      </span>
                    </td>
                    <td class="px-3 py-2.5 text-right">
                      <span :class="f.valor_feriados > 0 ? 'text-blue-600 font-semibold' : 'text-slate-300'">
                        {{ f.valor_feriados > 0 ? fmt(f.valor_feriados) : '—' }}
                      </span>
                    </td>
                    <td class="px-3 py-2.5 text-right">
                      <span :class="f.desconto_faltas > 0 ? 'text-red-600 font-semibold' : 'text-slate-300'">
                        {{ f.desconto_faltas > 0 ? fmt(f.desconto_faltas) : '—' }}
                      </span>
                    </td>
                    <td class="px-3 py-2.5 text-right text-slate-600">{{ fmt(f.desconto_vt) }}</td>
                    <td class="px-3 py-2.5 text-right font-bold text-slate-800">{{ fmt(f.salario_liquido) }}</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colspan="4" class="px-3 py-2.5 text-slate-500 font-semibold text-xs">TOTAIS</td>
                    <td class="px-3 py-2.5 text-right font-semibold text-slate-700">{{ fmt(store.folha.reduce((s,f)=>s+Number(f.salario_bruto),0)) }}</td>
                    <td class="px-3 py-2.5 text-right font-semibold text-emerald-600">{{ fmt(store.folha.reduce((s,f)=>s+Number(f.valor_horas_extras),0)) }}</td>
                    <td class="px-3 py-2.5 text-right font-semibold text-blue-600">{{ fmt(store.folha.reduce((s,f)=>s+Number(f.valor_feriados),0)) }}</td>
                    <td class="px-3 py-2.5 text-right font-semibold text-red-600">{{ fmt(store.folha.reduce((s,f)=>s+Number(f.desconto_faltas),0)) }}</td>
                    <td class="px-3 py-2.5 text-right font-semibold text-slate-600">{{ fmt(store.folha.reduce((s,f)=>s+Number(f.desconto_vt),0)) }}</td>
                    <td class="px-3 py-2.5 text-right font-bold text-slate-900">{{ fmt(totalLiquido) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabPanel>

        <!-- ── Histórico Salarial ─────────────────────────────── -->
        <TabPanel :value="1">
          <div class="flex justify-between items-center mb-4">
            <p class="text-sm text-slate-500">Gerencie o histórico salarial dos colaboradores.</p>
            <Button label="Registrar salário" icon="pi pi-plus" size="small" @click="abrirModalSalario()" />
          </div>

          <!-- Seleção de colaborador -->
          <div class="sgo-card mb-4">
            <SgoFormField label="Colaborador" field-id="hs_col" class="w-80">
              <Select id="hs_col" v-model="colabSel"
                :options="colaboradores" option-label="nome"
                filter placeholder="Selecione um colaborador..." class="w-full"
                @change="store.listarHistorico($event.value?.id)" />
            </SgoFormField>
          </div>

          <div v-if="store.loading" class="flex justify-center py-8">
            <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
          </div>
          <SgoEmptyState v-else-if="!colabSel" icon="pi-user" title="Selecione um colaborador"
            description="Escolha um colaborador para ver seu histórico salarial." />
          <SgoEmptyState v-else-if="!store.historicoSal.length" icon="pi-money-bill"
            title="Sem histórico salarial"
            description="Nenhum salário cadastrado para este colaborador.">
            <template #action>
              <Button label="Registrar primeiro salário" icon="pi pi-plus" size="small" @click="abrirModalSalario(colabSel)" />
            </template>
          </SgoEmptyState>
          <div v-else class="space-y-2">
            <div v-for="h in store.historicoSal" :key="h.id"
              class="flex items-center gap-4 py-3 px-4 rounded-xl border border-slate-100 hover:bg-slate-50">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                :class="h.vigencia_fim ? 'bg-slate-100' : 'bg-emerald-50'">
                <i class="pi pi-money-bill" :class="h.vigencia_fim ? 'text-slate-400' : 'text-emerald-600'" />
              </div>
              <div class="flex-1">
                <p class="font-bold text-slate-800">{{ fmt(h.salario) }}</p>
                <p class="text-xs text-slate-500 mt-0.5">
                  Vigente de {{ new Date(h.vigencia_inicio+'T12:00:00').toLocaleDateString('pt-BR') }}
                  {{ h.vigencia_fim ? `até ${new Date(h.vigencia_fim+'T12:00:00').toLocaleDateString('pt-BR')}` : '— atual' }}
                </p>
                <p v-if="h.motivo" class="text-xs text-slate-400 italic">{{ h.motivo }}</p>
              </div>
              <span :class="['text-xs font-semibold rounded px-2 py-0.5', h.vigencia_fim ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700']">
                {{ h.vigencia_fim ? 'Encerrado' : 'Vigente' }}
              </span>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <!-- Modal Calcular -->
    <Dialog v-model:visible="modalCalculo" header="Calcular Folha de Pagamento" :style="{ width: '480px' }" modal>
      <div class="space-y-4 py-1">
        <p class="text-slate-600">
          Calcular folha de <strong>{{ competenciaSel ? `${meses[competenciaSel.mes-1]} ${competenciaSel.ano}` : '' }}</strong>?
        </p>
        <div class="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700 space-y-1">
          <p class="font-semibold mb-1">O cálculo considera:</p>
          <p><i class="pi pi-check mr-2 text-xs" />Salário base vigente na competência</p>
          <p><i class="pi pi-check mr-2 text-xs" />Desconto proporcional por falta injustificada</p>
          <p><i class="pi pi-check mr-2 text-xs" />Horas extras aprovadas pelo RH (+50%)</p>
          <p><i class="pi pi-check mr-2 text-xs" />Feriados trabalhados com adicional (+100%)</p>
          <p><i class="pi pi-check mr-2 text-xs" />Desconto de VT (6% do salário)</p>
        </div>
        <div class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          <i class="pi pi-info-circle mr-2" />Um cálculo anterior para esta competência será substituído.
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalCalculo = false" />
          <Button label="Calcular" icon="pi pi-calculator" :loading="calculando" @click="calcularFolha" />
        </div>
      </template>
    </Dialog>

    <!-- Modal Salário -->
    <Dialog v-model:visible="modalSalario" header="Registrar Salário" :style="{ width: '440px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Colaborador" field-id="rs_col" class="col-span-2">
          <Select id="rs_col" v-model="salForm.colaborador_id"
            :options="colaboradorOpts" option-label="label" option-value="value"
            filter placeholder="Selecione..." class="w-full" />
        </SgoFormField>
        <SgoFormField label="Salário (R$)" field-id="rs_sal">
          <InputNumber id="rs_sal" v-model="salForm.salario" mode="decimal"
            :min-fraction-digits="2" :max-fraction-digits="2" class="w-full" />
        </SgoFormField>
        <SgoFormField label="Vigência a partir de" field-id="rs_vig">
          <DatePicker id="rs_vig" v-model="salForm.vigencia_inicio" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Motivo" field-id="rs_mot" class="col-span-2">
          <InputText id="rs_mot" v-model="salForm.motivo" placeholder="Ex: Admissão, Dissídio 2026..." class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalSalario = false" />
          <Button label="Registrar" :loading="store.saving" @click="salvarSalario" />
        </div>
      </template>
    </Dialog>

    <Toast />
  </div>
</template>
