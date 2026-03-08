<!-- atoms/SgoBadge.vue
     ATOM: badge visual de status de entidades do sistema.
     Sem lógica de negócio. Puramente presentacional. -->
<script setup lang="ts">
type Status = 'ativo' | 'inativo' | 'reserva' | 'desligado' | 'pendente' | 'aprovado' | 'reprovado' | 'aberta' | 'fechada'

const props = defineProps<{ status: Status; small?: boolean }>()

const map: Record<Status, { label: string; cls: string }> = {
  ativo:     { label: 'Ativo',     cls: 'badge-ativo' },
  inativo:   { label: 'Inativo',   cls: 'badge-inativo' },
  reserva:   { label: 'Reserva',   cls: 'badge-reserva' },
  desligado: { label: 'Desligado', cls: 'badge-desligado' },
  pendente:  { label: 'Pendente',  cls: 'badge-pendente' },
  aprovado:  { label: 'Aprovado',  cls: 'badge-aprovado' },
  reprovado: { label: 'Reprovado', cls: 'badge-reprovado' },
  aberta:    { label: 'Aberta',    cls: 'badge-ativo' },
  fechada:   { label: 'Fechada',   cls: 'badge-inativo' },
}

const item = computed(() => map[props.status])
</script>

<template>
  <span :class="['badge', item.cls, small ? 'text-xs' : '']">
    {{ item.label }}
  </span>
</template>
