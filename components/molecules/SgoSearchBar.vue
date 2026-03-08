<!-- molecules/SgoSearchBar.vue
     MOLECULE: combina SgoIcon + InputText formando barra de busca com debounce.
     Emite 'search' após 350ms de pausa na digitação. -->
<script setup lang="ts">
const props = defineProps<{ modelValue?: string; placeholder?: string; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [string]; search: [string] }>()

const local = ref(props.modelValue ?? '')
let timer: ReturnType<typeof setTimeout>

watch(() => props.modelValue, v => { if (v !== local.value) local.value = v ?? '' })

function onInput(v: string | undefined) {
  local.value = v ?? ''
  emit('update:modelValue', local.value)
  clearTimeout(timer)
  timer = setTimeout(() => emit('search', local.value), 350)
}

function limpar() { onInput('') }
</script>

<template>
  <div class="relative flex items-center">
    <SgoIcon name="pi-search" size="sm" color="#94a3b8" class="absolute left-3 pointer-events-none" />
    <InputText
      :value="local"
      :placeholder="placeholder ?? 'Buscar...'"
      class="pl-8 pr-8 w-full"
      @input="onInput(($event.target as HTMLInputElement).value)"
    />
    <button v-if="local" class="absolute right-3 text-slate-400 hover:text-slate-600" @click="limpar">
      <SgoIcon name="pi-times" size="xs" />
    </button>
    <SgoIcon v-if="loading" name="pi-spin pi-spinner" size="sm" color="#3b82f6" class="absolute right-3" />
  </div>
</template>
