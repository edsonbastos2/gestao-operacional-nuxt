<script setup lang="ts">
const props = defineProps<{ visible: boolean; colaboradorId?: string }>()
const emit = defineEmits<{ 'update:visible': [boolean] }>()
const store = useColaboradoresStore()
const cadastros = useCadastrosStore()
const toast = useToast()

const colab = computed(() => store.colaboradorAtual)

// ── Alocação ──────────────────────────────────────────────────
const modalAlocacao = ref(false)
const alocForm = ref<any>({ posto_id: '', funcao_id: '', data_inicio: '', principal: false, observacoes: '' })

// Vagas disponíveis filtradas pelo posto selecionado
const vagasDisponiveis = ref<any[]>([])
const loadingVagas = ref(false)

const postoOpts = computed(() =>
  cadastros.postos.filter(p => p.status === 'ativo').map(p => ({ label: p.nome, value: p.id }))
)

// Quando o posto muda, carrega as vagas disponíveis daquele posto
watch(() => alocForm.value.posto_id, async (postoId) => {
  alocForm.value.funcao_id = ''
  vagasDisponiveis.value = []
  if (!postoId) return
  loadingVagas.value = true
  try {
    const res = await $fetch<{ data: any[] }>('/api/cadastros/vagas/ocupacao', { params: { posto_id: postoId } })
    vagasDisponiveis.value = res.data
  } catch { /* silencioso */ } finally { loadingVagas.value = false }
})

// Opções de função filtradas pelas vagas com saldo > 0
const funcaoOpts = computed(() =>
  vagasDisponiveis.value
    .filter(v => v.saldo > 0)
    .map(v => ({
      label: `${v.funcao_nome}  (${v.alocados}/${v.vagas_contratadas} alocados — ${v.saldo} vaga${v.saldo !== 1 ? 's' : ''} livre${v.saldo !== 1 ? 's' : ''})`,
      value: v.funcao_id,
    }))
)

// Vaga selecionada (para mostrar info)
const vagaSelecionada = computed(() =>
  vagasDisponiveis.value.find(v => v.funcao_id === alocForm.value.funcao_id)
)

// ── ASO ───────────────────────────────────────────────────────
const modalAso = ref(false)
const asoForm = ref<any>({ tipo: '', resultado: '', data_exame: '', data_validade: '', medico_nome: '', medico_crm: '', restricoes: '' })
const tipoAsoOpts = [
  { label: 'Admissional',      value: 'admissional' },
  { label: 'Periódico',        value: 'periodico' },
  { label: 'Demissional',      value: 'demissional' },
  { label: 'Retorno',          value: 'retorno' },
  { label: 'Mudança de função',value: 'mudanca_funcao' },
]
const resultadoAsoOpts = [
  { label: 'Apto',              value: 'apto' },
  { label: 'Apto com restrição',value: 'apto_restricao' },
  { label: 'Inapto',            value: 'inapto' },
]

// ── Dependentes ───────────────────────────────────────────────
const modalDep = ref(false)
const depForm = ref<any>({ nome: '', parentesco: '', data_nasc: '', cpf: '' })
const parentescoOpts = ['Cônjuge','Filho(a)','Pai','Mãe','Irmão/Irmã','Neto(a)','Outros'].map(v => ({ label: v, value: v }))

watch(() => props.visible, async v => {
  if (v && props.colaboradorId) {
    await store.buscarColaborador(props.colaboradorId)
    cadastros.listarPostos({ status: 'ativo' })
  }
})

async function salvarAlocacao() {
  if (!alocForm.value.posto_id || !alocForm.value.funcao_id || !alocForm.value.data_inicio) {
    toast.add({ severity: 'warn', summary: 'Preencha posto, função e data de início.', life: 3000 })
    return
  }
  try {
    await store.salvarAlocacao({ ...alocForm.value, colaborador_id: props.colaboradorId })
    await store.buscarColaborador(props.colaboradorId!)
    modalAlocacao.value = false
    toast.add({ severity: 'success', summary: 'Alocação adicionada.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

async function encerrarAlocacao(id: string) {
  try {
    await store.encerrarAlocacao(id, new Date().toISOString().split('T')[0])
    await store.buscarColaborador(props.colaboradorId!)
    toast.add({ severity: 'success', summary: 'Alocação encerrada.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

async function salvarAso() {
  if (!asoForm.value.tipo || !asoForm.value.resultado || !asoForm.value.data_exame) {
    toast.add({ severity: 'warn', summary: 'Preencha tipo, resultado e data.', life: 3000 })
    return
  }
  try {
    await store.salvarAso({ ...asoForm.value, colaborador_id: props.colaboradorId })
    await store.buscarColaborador(props.colaboradorId!)
    modalAso.value = false
    toast.add({ severity: 'success', summary: 'ASO registrado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

async function salvarDependente() {
  if (!depForm.value.nome || !depForm.value.parentesco) {
    toast.add({ severity: 'warn', summary: 'Nome e parentesco são obrigatórios.', life: 3000 })
    return
  }
  try {
    await store.salvarDependente({ ...depForm.value, colaborador_id: props.colaboradorId })
    await store.buscarColaborador(props.colaboradorId!)
    modalDep.value = false
    toast.add({ severity: 'success', summary: 'Dependente adicionado.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

async function excluirDependente(id: string) {
  try {
    await store.excluirDependente(id)
    if (colab.value) colab.value.dependentes = colab.value.dependentes?.filter(d => d.id !== id)
    toast.add({ severity: 'success', summary: 'Dependente removido.', life: 3000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 4000 }) }
}

function abrirAlocacao() {
  alocForm.value = { posto_id: '', funcao_id: '', data_inicio: '', principal: false, observacoes: '' }
  vagasDisponiveis.value = []
  modalAlocacao.value = true
}
function abrirAso() {
  asoForm.value = { tipo: '', resultado: '', data_exame: '', data_validade: '', medico_nome: '', medico_crm: '', restricoes: '' }
  modalAso.value = true
}
function abrirDep() {
  depForm.value = { nome: '', parentesco: '', data_nasc: '', cpf: '' }
  modalDep.value = true
}

const resultadoColor: Record<string, string> = {
  apto: 'text-emerald-600', apto_restricao: 'text-amber-500', inapto: 'text-red-500'
}
</script>

<template>
  <Dialog :visible="visible" :header="colab?.nome ?? 'Colaborador'" :style="{ width: '800px' }" modal maximizable @update:visible="$emit('update:visible', $event)">
    <div v-if="store.loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spinner animate-spin text-blue-600" style="font-size:2rem" />
    </div>
    <div v-else-if="colab">
      <Tabs :value="0">
        <TabList>
          <Tab :value="0">Resumo</Tab>
          <Tab :value="1">Alocações ({{ colab.alocacoes?.length ?? 0 }})</Tab>
          <Tab :value="2">ASOs ({{ colab.asos?.length ?? 0 }})</Tab>
          <Tab :value="3">Dependentes ({{ colab.dependentes?.length ?? 0 }})</Tab>
        </TabList>
        <TabPanels>

          <!-- Resumo -->
          <TabPanel :value="0">
            <div class="grid grid-cols-2 gap-4 py-2">
              <div class="space-y-2">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dados pessoais</p>
                <div class="space-y-1 text-sm">
                  <p><span class="text-slate-400 w-28 inline-block">CPF:</span> <span class="font-medium">{{ colab.cpf }}</span></p>
                  <p v-if="colab.rg"><span class="text-slate-400 w-28 inline-block">RG:</span> {{ colab.rg }}</p>
                  <p v-if="colab.data_nasc"><span class="text-slate-400 w-28 inline-block">Nascimento:</span> {{ new Date(colab.data_nasc).toLocaleDateString('pt-BR') }}</p>
                  <p v-if="colab.email"><span class="text-slate-400 w-28 inline-block">E-mail:</span> {{ colab.email }}</p>
                  <p v-if="colab.telefone"><span class="text-slate-400 w-28 inline-block">Telefone:</span> {{ colab.telefone }}</p>
                  <p v-if="colab.cidade"><span class="text-slate-400 w-28 inline-block">Cidade:</span> {{ colab.cidade }}{{ colab.uf ? ` / ${colab.uf}` : '' }}</p>
                </div>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vínculo</p>
                <div class="space-y-1 text-sm">
                  <p><span class="text-slate-400 w-28 inline-block">Prestadora:</span> {{ colab.prestadora?.nome_fantasia ?? colab.prestadora?.razao_social ?? '—' }}</p>
                  <p><span class="text-slate-400 w-28 inline-block">Admissão:</span> {{ colab.data_admissao ? new Date(colab.data_admissao).toLocaleDateString('pt-BR') : '—' }}</p>
                  <p v-if="colab.matricula"><span class="text-slate-400 w-28 inline-block">Matrícula:</span> {{ colab.matricula }}</p>
                  <p><span class="text-slate-400 w-28 inline-block">Status:</span> <SgoBadge :status="colab.status" small /></p>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- Alocações -->
          <TabPanel :value="1">
            <div class="flex justify-between items-center mb-3 pt-2">
              <p class="text-sm text-slate-500">Máximo de 2 alocações ativas. Vagas são verificadas pelo contrato.</p>
              <Button
                v-if="(colab.alocacoes?.filter(a => a.status === 'ativo').length ?? 0) < 2"
                label="Adicionar" icon="pi pi-plus" size="small" @click="abrirAlocacao" />
            </div>
            <div v-if="!colab.alocacoes?.length" class="text-center py-6 text-slate-400 text-sm italic">
              Nenhuma alocação cadastrada.
            </div>
            <div v-for="a in colab.alocacoes" :key="a.id" class="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
              <div class="flex-1">
                <p class="font-semibold text-slate-800 text-sm">
                  {{ a.posto?.nome ?? '—' }}
                  <span v-if="a.principal" class="ml-2 text-[10px] bg-blue-100 text-blue-600 rounded px-1.5 py-0.5 font-semibold">PRINCIPAL</span>
                </p>
                <p class="text-xs text-slate-500">
                  {{ a.funcao?.nome ?? '—' }} • desde {{ new Date(a.data_inicio).toLocaleDateString('pt-BR') }}
                </p>
                <p v-if="a.vaga_id" class="text-[10px] text-emerald-600 mt-0.5">
                  <i class="pi pi-link mr-1" />Vinculada à vaga contratual
                </p>
              </div>
              <SgoBadge :status="a.status" small />
              <button
                v-if="a.status === 'ativo'"
                class="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                title="Encerrar alocação"
                @click="encerrarAlocacao(a.id)">
                <i class="pi pi-sign-out text-sm" />
              </button>
            </div>
          </TabPanel>

          <!-- ASOs -->
          <TabPanel :value="2">
            <div class="flex justify-end mb-3 pt-2">
              <Button label="Registrar ASO" icon="pi pi-plus" size="small" @click="abrirAso" />
            </div>
            <div v-if="!colab.asos?.length" class="text-center py-6 text-slate-400 text-sm italic">Nenhum ASO registrado.</div>
            <div v-for="a in colab.asos" :key="a.id" class="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
              <div class="flex-1">
                <p class="font-semibold text-slate-800 text-sm capitalize">{{ a.tipo.replace('_', ' ') }}</p>
                <p class="text-xs text-slate-500">
                  {{ new Date(a.data_exame).toLocaleDateString('pt-BR') }}
                  <span v-if="a.medico_nome"> • Dr(a). {{ a.medico_nome }}</span>
                  <span v-if="a.data_validade"> • val. {{ new Date(a.data_validade).toLocaleDateString('pt-BR') }}</span>
                </p>
                <p v-if="a.restricoes" class="text-xs text-amber-600 mt-0.5">Restrição: {{ a.restricoes }}</p>
              </div>
              <span :class="['text-xs font-semibold capitalize', resultadoColor[a.resultado]]">
                {{ a.resultado.replace('_', ' ') }}
              </span>
            </div>
          </TabPanel>

          <!-- Dependentes -->
          <TabPanel :value="3">
            <div class="flex justify-end mb-3 pt-2">
              <Button label="Adicionar dependente" icon="pi pi-plus" size="small" @click="abrirDep" />
            </div>
            <div v-if="!colab.dependentes?.length" class="text-center py-6 text-slate-400 text-sm italic">Nenhum dependente cadastrado.</div>
            <div v-for="d in colab.dependentes" :key="d.id" class="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
              <div class="flex-1">
                <p class="font-semibold text-slate-800 text-sm">{{ d.nome }}</p>
                <p class="text-xs text-slate-500">
                  {{ d.parentesco }}{{ d.data_nasc ? ` • ${new Date(d.data_nasc).toLocaleDateString('pt-BR')}` : '' }}{{ d.cpf ? ` • ${d.cpf}` : '' }}
                </p>
              </div>
              <button class="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors" @click="excluirDependente(d.id)">
                <i class="pi pi-trash text-sm" />
              </button>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <!-- Sub-modal Alocação -->
    <Dialog v-model:visible="modalAlocacao" header="Nova Alocação" :style="{ width: '480px' }" modal>
      <div class="space-y-4 py-1">

        <!-- Posto -->
        <SgoFormField label="Posto de trabalho" field-id="aloc_p">
          <Select
            id="aloc_p"
            v-model="alocForm.posto_id"
            :options="postoOpts"
            option-label="label"
            option-value="value"
            placeholder="Selecione o posto"
          />
        </SgoFormField>

        <!-- Vagas disponíveis após selecionar posto -->
        <div v-if="alocForm.posto_id">
          <div v-if="loadingVagas" class="text-sm text-slate-400 text-center py-2">
            <i class="pi pi-spinner animate-spin mr-1" /> Carregando vagas...
          </div>
          <div v-else-if="vagasDisponiveis.length === 0" class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <i class="pi pi-exclamation-triangle mr-2" />
            Este posto não possui vagas cadastradas. Cadastre as vagas em Cadastros → Postos antes de alocar.
          </div>
          <div v-else>
            <!-- Resumo de vagas do posto -->
            <div class="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-3">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Vagas contratadas neste posto</p>
              <div v-for="v in vagasDisponiveis" :key="v.vaga_id" class="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                <span class="font-medium text-slate-700">{{ v.funcao_nome }}</span>
                <div class="flex items-center gap-2">
                  <span class="text-slate-500 text-xs">{{ v.alocados }}/{{ v.vagas_contratadas }}</span>
                  <span :class="['text-xs font-semibold rounded px-2 py-0.5', v.saldo > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600']">
                    {{ v.saldo > 0 ? `${v.saldo} livre${v.saldo !== 1 ? 's' : ''}` : 'Lotado' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Função — só mostra vagas com saldo -->
            <SgoFormField label="Função" field-id="aloc_f">
              <div v-if="funcaoOpts.length === 0" class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                <i class="pi pi-exclamation-circle mr-2" />Todas as vagas deste posto estão lotadas.
              </div>
              <Select
                v-else
                id="aloc_f"
                v-model="alocForm.funcao_id"
                :options="funcaoOpts"
                option-label="label"
                option-value="value"
                placeholder="Selecione a função"
              />
            </SgoFormField>
          </div>
        </div>

        <!-- Info da vaga selecionada -->
        <div v-if="vagaSelecionada" class="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          <i class="pi pi-info-circle mr-2" />
          <strong>{{ vagaSelecionada.funcao_nome }}</strong> em <strong>{{ vagaSelecionada.posto_nome }}</strong>:
          {{ vagaSelecionada.alocados }} de {{ vagaSelecionada.vagas_contratadas }} alocado(s).
          Após esta alocação restarão <strong>{{ vagaSelecionada.saldo - 1 }}</strong> vaga(s).
        </div>

        <!-- Data de início -->
        <SgoFormField v-if="alocForm.funcao_id" label="Data de início" field-id="aloc_di">
          <DatePicker id="aloc_di" v-model="alocForm.data_inicio" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>

        <!-- Principal -->
        <div v-if="alocForm.funcao_id" class="flex items-center gap-2">
          <Checkbox v-model="alocForm.principal" :binary="true" input-id="aloc_pr" />
          <label for="aloc_pr" class="text-sm text-slate-600">Alocação principal</label>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalAlocacao = false" />
          <Button
            label="Confirmar alocação"
            :loading="store.saving"
            :disabled="!alocForm.posto_id || !alocForm.funcao_id || !alocForm.data_inicio"
            @click="salvarAlocacao"
          />
        </div>
      </template>
    </Dialog>

    <!-- Sub-modal ASO -->
    <Dialog v-model:visible="modalAso" header="Registrar ASO" :style="{ width: '480px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Tipo" field-id="aso_t">
          <Select id="aso_t" v-model="asoForm.tipo" :options="tipoAsoOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Resultado" field-id="aso_r">
          <Select id="aso_r" v-model="asoForm.resultado" :options="resultadoAsoOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="Data do exame" field-id="aso_de">
          <DatePicker id="aso_de" v-model="asoForm.data_exame" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Validade" field-id="aso_val">
          <DatePicker id="aso_val" v-model="asoForm.data_validade" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
        <SgoFormField label="Médico" field-id="aso_med" class="col-span-2">
          <InputText id="aso_med" v-model="asoForm.medico_nome" />
        </SgoFormField>
        <SgoFormField label="CRM" field-id="aso_crm">
          <InputText id="aso_crm" v-model="asoForm.medico_crm" />
        </SgoFormField>
        <div />
        <SgoFormField v-if="asoForm.resultado === 'apto_restricao'" label="Restrições" field-id="aso_res" class="col-span-2">
          <Textarea id="aso_res" v-model="asoForm.restricoes" rows="2" class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalAso = false" />
          <Button label="Registrar" :loading="store.saving" @click="salvarAso" />
        </div>
      </template>
    </Dialog>

    <!-- Sub-modal Dependente -->
    <Dialog v-model:visible="modalDep" header="Adicionar Dependente" :style="{ width: '420px' }" modal>
      <div class="form-grid form-grid-2 py-1">
        <SgoFormField label="Nome" field-id="dep_n" class="col-span-2">
          <InputText id="dep_n" v-model="depForm.nome" />
        </SgoFormField>
        <SgoFormField label="Parentesco" field-id="dep_par">
          <Select id="dep_par" v-model="depForm.parentesco" :options="parentescoOpts" option-label="label" option-value="value" />
        </SgoFormField>
        <SgoFormField label="CPF" field-id="dep_cpf">
          <InputText id="dep_cpf" v-model="depForm.cpf" />
        </SgoFormField>
        <SgoFormField label="Data de nascimento" field-id="dep_dn" class="col-span-2">
          <DatePicker id="dep_dn" v-model="depForm.data_nasc" date-format="dd/mm/yy" show-icon class="w-full" />
        </SgoFormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="modalDep = false" />
          <Button label="Adicionar" :loading="store.saving" @click="salvarDependente" />
        </div>
      </template>
    </Dialog>

    <template #footer>
      <Button label="Fechar" severity="secondary" @click="$emit('update:visible', false)" />
    </template>
  </Dialog>
</template>
