<!-- molecules/SgoAlertBanner.vue
     MOLECULE: banner de alerta contextual.
     Combina SgoIcon com mensagem e severidade. -->
<script setup lang="ts">
type Severity = 'info' | 'success' | 'warning' | 'error'

defineProps<{ severity?: Severity; title?: string; message: string; closable?: boolean }>()
defineEmits<{ close: [] }>()

const map: Record<Severity, { icon: string; bg: string; border: string; text: string }> = {
  info:    { icon: 'pi-info-circle',          bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-700' },
  success: { icon: 'pi-check-circle',         bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700' },
  warning: { icon: 'pi-exclamation-triangle', bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700' },
  error:   { icon: 'pi-times-circle',         bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700' },
}
</script>

<template>
  <div :class="['flex items-start gap-3 p-3 rounded-lg border', map[severity ?? 'info'].bg, map[severity ?? 'info'].border]">
    <SgoIcon :name="map[severity ?? 'info'].icon" size="md" :color="undefined" :class="[map[severity ?? 'info'].text, 'mt-0.5 shrink-0']" />
    <div class="flex-1 min-w-0">
      <p v-if="title" :class="['text-sm font-semibold', map[severity ?? 'info'].text]">{{ title }}</p>
      <p :class="['text-sm', map[severity ?? 'info'].text]">{{ message }}</p>
    </div>
    <button v-if="closable" :class="['shrink-0', map[severity ?? 'info'].text, 'opacity-60 hover:opacity-100']" @click="$emit('close')">
      <SgoIcon name="pi-times" size="xs" />
    </button>
  </div>
</template>
