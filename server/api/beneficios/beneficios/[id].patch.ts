import { getUsuarioAutenticado } from '~/server/utils/supabase'

const numOrNull = (v: any) => (v === '' || v === undefined || v === null) ? null : Number(v)
const strOrNull = (v: any) => (v === '' || v === undefined) ? null : v

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  // Remove campos relacionais
  const { sgo_ccts, created_at, created_by, ...rest } = body

  // Sanitiza campos numéricos e opcionais
  rest.valor_unitario                  = numOrNull(rest.valor_unitario)
  rest.valor_coparticipacao            = numOrNull(rest.valor_coparticipacao)
  rest.valor_desconto_fixo             = numOrNull(rest.valor_desconto_fixo)
  rest.percentual_desconto_colaborador = numOrNull(rest.percentual_desconto_colaborador) ?? 0
  rest.vigencia_fim                    = strOrNull(rest.vigencia_fim)
  rest.observacoes                     = strOrNull(rest.observacoes)
  rest.custeio_saude                   = strOrNull(rest.custeio_saude)

  const { data, error } = await supabase
    .from('sgo_cct_beneficios')
    .update({ ...rest, updated_by: me.id })
    .eq('id', id)
    .select('id, cct_id, tipo, nome, obrigatoriedade, forma_pagamento, custeio_saude, valor_coparticipacao, valor_unitario, percentual_desconto_colaborador, unidade, vigencia_inicio, vigencia_fim, status')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
