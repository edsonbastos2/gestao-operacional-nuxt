<!-- atoms/SgoBadge.vue
     ATOM: badge visual de status de entidades do sistema.
     Sem lógica de negócio. Puramente presentacional. -->
<script setup lang="ts">
type Status =
  | 'ativo' | 'inativo' | 'reserva' | 'desligado'
  | 'pendente' | 'aprovado' | 'reprovado'
  | 'aberta' | 'fechada'
  // operação — faltas
  | 'registrada' | 'cancelada'
  // operação — extras
  | 'aprovado_operacao' | 'aprovado_rh' | 'recusado' | 'cancelado'
  // benefícios
  | 'ativo' | 'recusado' | 'suspenso'

const props = defineProps<{ status: string; small?: boolean }>()

const map: Record<string, { label: string; cls: string }> = {
  // genéricos
  ativo:             { label: 'Ativo',          cls: 'badge-ativo' },
  inativo:           { label: 'Inativo',        cls: 'badge-inativo' },
  reserva:           { label: 'Reserva',        cls: 'badge-reserva' },
  desligado:         { label: 'Desligado',      cls: 'badge-desligado' },
  pendente:          { label: 'Pendente',       cls: 'badge-pendente' },
  aprovado:          { label: 'Aprovado',       cls: 'badge-aprovado' },
  reprovado:         { label: 'Reprovado',      cls: 'badge-reprovado' },
  aberta:            { label: 'Aberta',         cls: 'badge-ativo' },
  fechada:           { label: 'Fechada',        cls: 'badge-inativo' },
  // faltas
  registrada:        { label: 'Registrada',     cls: 'badge-ativo' },
  cancelada:         { label: 'Cancelada',      cls: 'badge-inativo' },
  cancelado:         { label: 'Cancelado',      cls: 'badge-inativo' },
  // extras
  aprovado_operacao: { label: 'Aprovado Op.',   cls: 'badge-pendente' },
  aprovado_rh:       { label: 'Aprovado RH',    cls: 'badge-aprovado' },
  recusado:          { label: 'Recusado',       cls: 'badge-reprovado' },
  // benefícios
  suspenso:          { label: 'Suspenso',       cls: 'badge-reserva' },
}

const item = computed(() => map[props.status] ?? { label: props.status, cls: 'badge-inativo' })
</script>

<template>
  <span :class="['badge', item.cls, small ? 'text-xs' : '']">
    {{ item.label }}
  </span>
</template>
