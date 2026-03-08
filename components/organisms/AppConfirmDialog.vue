<!-- organisms/AppConfirmDialog.vue
     ORGANISM: dialog de confirmação/exclusão com suporte a justificativa obrigatória.
     Usa a molécula SgoFormField e o átomo SgoIcon. -->
<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  title?: string
  message?: string
  severity?: 'danger' | 'warning' | 'info'
  requireJustificativa?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  confirm: [justificativa?: string]
  cancel: []
}>()

const justificativa = ref('')

const valido = computed(() =>
  props.requireJustificativa ? justificativa.value.trim().length >= 10 : true
)

const iconMap = {
  danger:  { icon: 'pi-exclamation-triangle', color: '#ef4444' },
  warning: { icon: 'pi-exclamation-circle',   color: '#f59e0b' },
  info:    { icon: 'pi-info-circle',           color: '#3b82f6' },
}

const severidadeAtual = computed(() => iconMap[props.severity ?? 'warning'])

function confirmar() {
  if (!valido.value) return
  emit('confirm', props.requireJustificativa ? justificativa.value.trim() : undefined)
}

function cancelar() {
  justificativa.value = ''
  emit('cancel')
  emit('update:visible', false)
}

watch(() => props.visible, v => { if (!v) justificativa.value = '' })
</script>

<template>
  <Dialog
    :visible="visible"
    :header="title ?? 'Confirmar ação'"
    :style="{ width: '440px' }"
    modal
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4">

      <!-- Mensagem -->
      <div class="flex gap-3 items-start">
        <SgoIcon
          :name="severidadeAtual.icon"
          size="lg"
          :color="severidadeAtual.color"
          class="shrink-0 mt-0.5"
        />
        <p class="text-sm text-slate-600 leading-relaxed">
          {{ message ?? 'Deseja confirmar esta ação?' }}
        </p>
      </div>

      <!-- Justificativa (quando exigida) -->
      <SgoFormField
        v-if="requireJustificativa"
        label="Justificativa"
        required
        :error="justificativa.length > 0 && justificativa.length < 10 ? 'Mínimo 10 caracteres.' : null"
      >
        <Textarea
          v-model="justificativa"
          rows="3"
          placeholder="Descreva o motivo (mínimo 10 caracteres)..."
          class="w-full"
          auto-resize
        />
      </SgoFormField>

    </div>

    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          :disabled="loading"
          @click="cancelar"
        />
        <Button
          :label="severity === 'danger' ? 'Excluir' : 'Confirmar'"
          :severity="severity === 'danger' ? 'danger' : 'primary'"
          :loading="loading"
          :disabled="!valido"
          @click="confirmar"
        />
      </div>
    </template>
  </Dialog>
</template>
