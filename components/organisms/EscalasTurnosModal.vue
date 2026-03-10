<script setup lang="ts">
const props = defineProps<{ visible: boolean; escala?: any }>()
const emit = defineEmits<{ 'update:visible': [boolean] }>()
const store = useEscalasStore()
const toast = useToast()

const diasSemOpts = [
  { label: 'Dom', value: 0 }, { label: 'Seg', value: 1 }, { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 }, { label: 'Qui', value: 4 }, { label: 'Sex', value: 5 }, { label: 'Sáb', value: 6 }
]
const tipoOpts = [
  { label: 'Diurno', value: 'diurno' }, { label: 'Noturno', value: 'noturno' },
  { label: 'Misto', value: 'misto' }, { label: '12x36', value: '12x36' },
  { label: '12x24', value: '12x24' }, { label: 'Outros', value: 'outros' }
]
const emptyForm = () => ({ nome: '', tipo: 'diurno', hora_inicio: '', hora_fim: '', intervalo_min: 60, dias_semana: [1,2,3,4,5] })
const novoTurno = ref<any>(emptyForm())
const erros = ref({ nome: '', hora_inicio: '', hora_fim: '' })

watch(() => props.visible, async v => {
  if (v && props.escala) { await store.listarTurnos(props.escala.id); novoTurno.value = emptyForm() }
})

async function adicionarTurno() {
  erros.value = { nome: '', hora_inicio: '', hora_fim: '' }
  let ok = true
  if (!novoTurno.value.nome) { erros.value.nome = 'Obrigatório.'; ok = false }
  if (!novoTurno.value.hora_inicio) { erros.value.hora_inicio = 'Obrigatório.'; ok = false }
  if (!novoTurno.value.hora_fim) { erros.value.hora_fim = 'Obrigatório.'; ok = false }
  if (!ok) return
  try {
    const res = await store.salvarTurno({ ...novoTurno.value, escala_id: props.escala.id })
    store.turnos.push(res as any)
    novoTurno.value = emptyForm()
    toast.add({ severity: 'success', summary: 'Turno adicionado.', life: 2000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 3000 }) }
}

async function excluirTurno(id: string) {
  try {
    await store.excluirTurno(id)
    store.turnos = store.turnos.filter(t => t.id !== id)
    toast.add({ severity: 'success', summary: 'Turno removido.', life: 2000 })
  } catch { toast.add({ severity: 'error', summary: store.error ?? 'Erro.', life: 3000 }) }
}

const diasLabel: Record<number, string> = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' }
</script>
<template>
  <Dialog :visible="visible" :header="`Turnos — ${escala?.nome ?? ''}`" :style="{ width: '560px' }" modal @update:visible="$emit('update:visible', $event)">
    <div class="space-y-4">
      <!-- Lista -->
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Turnos cadastrados</p>
        <div v-if="!store.turnos.length" class="text-sm text-slate-400 italic text-center py-3">Nenhum turno cadastrado.</div>
        <div v-for="t in store.turnos" :key="t.id" class="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
          <div class="flex-1">
            <p class="font-semibold text-slate-800 text-sm">{{ t.nome }} <span class="text-xs font-normal text-slate-400 ml-1">{{ t.tipo }}</span></p>
            <p class="text-xs text-slate-500">{{ t.hora_inicio }} — {{ t.hora_fim }}  • intervalo {{ t.intervalo_min }}min</p>
            <div class="flex gap-1 mt-1 flex-wrap">
              <span v-for="d in t.dias_semana" :key="d" class="text-[10px] bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 font-medium">{{ diasLabel[d] }}</span>
            </div>
          </div>
          <button class="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors" @click="excluirTurno(t.id)">
            <i class="pi pi-trash text-sm" />
          </button>
        </div>
      </div>
      <!-- Novo turno -->
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Adicionar turno</p>
        <div class="form-grid form-grid-2 gap-2">
          <SgoFormField label="Nome" field-id="tn" :error="erros.nome" class="col-span-2">
            <InputText id="tn" v-model="novoTurno.nome" placeholder="Ex: Diurno 07h-15h" :invalid="!!erros.nome" />
          </SgoFormField>
          <SgoFormField label="Tipo" field-id="tt">
            <Select id="tt" v-model="novoTurno.tipo" :options="tipoOpts" option-label="label" option-value="value" />
          </SgoFormField>
          <SgoFormField label="Intervalo (min)" field-id="tint">
            <InputNumber id="tint" v-model="novoTurno.intervalo_min" :min="0" :max="120" />
          </SgoFormField>
          <SgoFormField label="Hora início" field-id="thi" :error="erros.hora_inicio">
            <InputText id="thi" v-model="novoTurno.hora_inicio" placeholder="07:00" :invalid="!!erros.hora_inicio" />
          </SgoFormField>
          <SgoFormField label="Hora fim" field-id="thf" :error="erros.hora_fim">
            <InputText id="thf" v-model="novoTurno.hora_fim" placeholder="15:00" :invalid="!!erros.hora_fim" />
          </SgoFormField>
          <div class="col-span-2">
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Dias da semana</label>
            <div class="flex gap-2 flex-wrap">
              <div v-for="d in diasSemOpts" :key="d.value" class="flex items-center gap-1">
                <Checkbox v-model="novoTurno.dias_semana" :value="d.value" :input-id="`dia_${d.value}`" />
                <label :for="`dia_${d.value}`" class="text-sm text-slate-600 cursor-pointer">{{ d.label }}</label>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end mt-3">
          <Button label="Adicionar turno" icon="pi pi-plus" size="small" :loading="store.saving" @click="adicionarTurno" />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="Fechar" severity="secondary" @click="$emit('update:visible', false)" />
    </template>
  </Dialog>
</template>
