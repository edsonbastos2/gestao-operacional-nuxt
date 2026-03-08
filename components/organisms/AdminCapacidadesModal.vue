<!-- organisms/AdminCapacidadesModal.vue
     ORGANISM: modal de gestão de capacidades críticas de um usuário. -->
<script setup lang="ts">
import type { Usuario, AtribuirCapacidadePayload } from '~/stores/admin'
import type { CapacidadeCritica } from '~/types'

const props = defineProps<{ visible: boolean; usuario?: Usuario | null }>()
const emit = defineEmits<{ 'update:visible': [boolean]; saved: [] }>()

const admin = useAdminStore()
const toast = useToast()

const capacidadeOpts: { label: string; value: CapacidadeCritica; descricao: string }[] = [
  { value: 'aprovar_extras',       label: 'Aprovar Extras',        descricao: 'Aprovar lançamentos de horas extras e adicionais.' },
  { value: 'cancelar_excluir',     label: 'Cancelar / Excluir',    descricao: 'Cancelar ou excluir registros com soft delete.' },
  { value: 'reabrir_competencia',  label: 'Reabrir Competência',   descricao: 'Reabrir competência já fechada para ajustes.' },
  { value: 'ajustar_calendario',   label: 'Ajustar Calendário',    descricao: 'Modificar calendário de escalas após geração.' },
  { value: 'parametrizar_critico', label: 'Parametrizar Crítico',  descricao: 'Alterar parâmetros críticos de tomadores e postos.' },
]

const form = ref<AtribuirCapacidadePayload>({ usuario_id: '', capacidade: '' as any, justificativa: '', validade: null })
const erros = ref({ capacidade: '', justificativa: '' })
const confirmRevogar = ref(false)
const capSelecionada = ref<any>(null)

watch(() => props.visible, (v) => {
  if (v && props.usuario) {
    form.value = { usuario_id: props.usuario.id, capacidade: '' as any, justificativa: '', validade: null }
    erros.value = { capacidade: '', justificativa: '' }
  }
})

const capsAtivas = computed(() =>
  (props.usuario?.capacidades ?? []).filter(c => !c.revogada_em)
)

function temCapacidade(cap: CapacidadeCritica) {
  return capsAtivas.value.some(c => c.capacidade === cap)
}

function validar() {
  erros.value = { capacidade: '', justificativa: '' }
  let ok = true
  if (!form.value.capacidade) { erros.value.capacidade = 'Obrigatório.'; ok = false }
  if (form.value.justificativa.trim().length < 10) { erros.value.justificativa = 'Mínimo 10 caracteres.'; ok = false }
  return ok
}

async function atribuir() {
  if (!validar()) return
  try {
    await admin.atribuirCapacidade({ ...form.value, usuario_id: props.usuario!.id })
    toast.add({ severity: 'success', summary: 'Capacidade atribuída.', life: 3000 })
    form.value.capacidade = '' as any
    form.value.justificativa = ''
    emit('saved')
  } catch { toast.add({ severity: 'error', summary: admin.error ?? 'Erro.', life: 4000 }) }
}

function abrirRevogar(cap: any) { capSelecionada.value = cap; confirmRevogar.value = true }

async function confirmarRevogar(justificativa?: string) {
  try {
    await admin.revogarCapacidade(capSelecionada.value.id, props.usuario!.id, justificativa ?? 'Revogação manual.')
    toast.add({ severity: 'success', summary: 'Capacidade revogada.', life: 3000 })
    emit('saved')
  } catch { toast.add({ severity: 'error', summary: admin.error ?? 'Erro.', life: 4000 }) }
  finally { confirmRevogar.value = false }
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="`Capacidades — ${usuario?.nome ?? ''}`"
    :style="{ width: '600px' }"
    modal
    @update:visible="$emit('update:visible', $event)"
  >
    <!-- Capacidades atuais -->
    <div class="mb-5">
      <p class="text-sm font-semibold text-slate-600 mb-3">Capacidades ativas</p>
      <div v-if="!capsAtivas.length" class="text-sm text-slate-400 italic">Nenhuma capacidade atribuída.</div>
      <div v-else class="flex flex-col gap-2">
        <div v-for="cap in capsAtivas" :key="cap.id"
             class="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
          <div>
            <p class="text-sm font-medium text-amber-800">{{ capacidadeOpts.find(o => o.value === cap.capacidade)?.label }}</p>
            <p class="text-xs text-amber-600 mt-0.5">
              Concedida em {{ new Date(cap.created_at).toLocaleDateString('pt-BR') }}
              <template v-if="cap.validade"> · Válida até {{ new Date(cap.validade).toLocaleDateString('pt-BR') }}</template>
            </p>
          </div>
          <Button icon="pi pi-times" text rounded size="small" severity="danger" v-tooltip="'Revogar'" @click="abrirRevogar(cap)" />
        </div>
      </div>
    </div>

    <SgoDivider label="Atribuir nova capacidade" />

    <!-- Formulário atribuição -->
    <div class="form-grid mt-4">
      <SgoFormField label="Capacidade" required :error="erros.capacidade">
        <Select
          v-model="form.capacidade"
          :options="capacidadeOpts"
          option-label="label"
          option-value="value"
          placeholder="Selecione..."
          :invalid="!!erros.capacidade"
        >
          <template #option="{ option }">
            <div>
              <p class="font-medium text-sm">{{ option.label }}</p>
              <p class="text-xs text-slate-400">{{ option.descricao }}</p>
            </div>
          </template>
        </Select>
      </SgoFormField>

      <SgoFormField label="Validade" hint="Deixe em branco para capacidade sem prazo.">
        <DatePicker v-model="form.validade" placeholder="dd/mm/aaaa" date-format="dd/mm/yy" show-button-bar />
      </SgoFormField>

      <SgoFormField label="Justificativa" required :error="erros.justificativa" critico>
        <Textarea v-model="form.justificativa" rows="2" placeholder="Descreva o motivo da atribuição (mín. 10 caracteres)..." auto-resize />
      </SgoFormField>

      <div class="flex justify-end">
        <Button label="Atribuir capacidade" icon="pi pi-shield" :loading="admin.saving" @click="atribuir" />
      </div>
    </div>

    <template #footer>
      <Button label="Fechar" severity="secondary" @click="$emit('update:visible', false)" />
    </template>
  </Dialog>

  <AppConfirmDialog
    v-model:visible="confirmRevogar"
    title="Revogar capacidade"
    :message="`Revogar a capacidade '${capacidadeOpts.find(o => o.value === capSelecionada?.capacidade)?.label}' de ${usuario?.nome}?`"
    severity="danger"
    require-justificativa
    :loading="admin.saving"
    @confirm="confirmarRevogar"
  />
</template>
