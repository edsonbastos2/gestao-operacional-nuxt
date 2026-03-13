import { getUsuarioAutenticado } from '~/server/utils/supabase'

// Converte string vazia ou undefined para null em campos numéricos
const numOrNull = (v: any) => (v === '' || v === undefined || v === null) ? null : Number(v)
const strOrNull = (v: any) => (v === '' || v === undefined) ? null : v

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)

  if (!body.cct_id || !body.tipo || !body.nome || !body.vigencia_inicio)
    throw createError({ statusCode: 400, message: 'CCT, tipo, nome e vigência de início são obrigatórios.' })

  // Sanitiza campos numéricos e opcionais antes de qualquer validação
  body.valor_unitario                    = numOrNull(body.valor_unitario)
  body.valor_coparticipacao              = numOrNull(body.valor_coparticipacao)
  body.valor_desconto_fixo               = numOrNull(body.valor_desconto_fixo)
  body.percentual_desconto_colaborador   = numOrNull(body.percentual_desconto_colaborador) ?? 0
  body.vigencia_fim                      = strOrNull(body.vigencia_fim)
  body.observacoes                       = strOrNull(body.observacoes)
  body.custeio_saude                     = strOrNull(body.custeio_saude)

  // ── Validações por tipo ──────────────────────────────────────
  if (body.tipo === 'odonto') {
    body.custeio_saude       = null
    body.valor_coparticipacao = null
  }

  if (body.tipo === 'saude') {
    if (!body.custeio_saude)
      throw createError({ statusCode: 400, message: 'Defina o custeio do plano de saúde: prestadora_100 ou coparticipacao.' })
    if (body.custeio_saude === 'coparticipacao' && !body.valor_coparticipacao)
      throw createError({ statusCode: 400, message: 'Informe o valor da coparticipação do colaborador.' })
    if (body.custeio_saude === 'prestadora_100') {
      body.valor_coparticipacao            = 0
      body.percentual_desconto_colaborador = 0
    }
  }

  if (body.tipo === 'cesta_basica') {
    const formasPermitidas = ['dinheiro', 'via_va', 'fisico']
    if (!formasPermitidas.includes(body.forma_pagamento))
      throw createError({ statusCode: 400, message: 'Cesta básica aceita apenas: dinheiro, via VA ou retirada física.' })
  }

  if (body.tipo === 'vale_transporte') {
    if (!body.percentual_desconto_colaborador) body.percentual_desconto_colaborador = 6
  }

  const { data, error } = await supabase
    .from('sgo_cct_beneficios')
    .insert({ ...body, created_by: me.id, updated_by: me.id })
    .select('*, sgo_ccts(id,nome)')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
