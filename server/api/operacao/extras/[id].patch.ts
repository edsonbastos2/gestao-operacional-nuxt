import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')!
  const { acao, motivo_recusa } = await readBody(event)

  // Busca extra atual
  const { data: extra } = await supabase.from('sgo_extras').select('status, motivo').eq('id', id).single()
  if (!extra) throw createError({ statusCode: 404, message: 'Extra não encontrado.' })

  // Cobertura de falta não passa por aprovação
  if (extra.motivo === 'cobertura_falta')
    throw createError({ statusCode: 422, message: 'Extras de cobertura de falta são aprovados automaticamente.' })

  const agora = new Date().toISOString()
  let update: any = { updated_by: me.id }

  if (acao === 'aprovar_operacao') {
    if (extra.status !== 'pendente')
      throw createError({ statusCode: 422, message: 'Apenas extras pendentes podem ser aprovados pela operação.' })
    update.status = 'aprovado_operacao'
    update.aprovado_operacao_por = me.id
    update.aprovado_operacao_em  = agora
  } else if (acao === 'aprovar_rh') {
    if (extra.status !== 'aprovado_operacao')
      throw createError({ statusCode: 422, message: 'Extra precisa ser aprovado pela operação antes da homologação do RH.' })
    update.status = 'aprovado_rh'
    update.aprovado_rh_por = me.id
    update.aprovado_rh_em  = agora
  } else if (acao === 'recusar') {
    if (!motivo_recusa?.trim())
      throw createError({ statusCode: 400, message: 'Motivo da recusa é obrigatório.' })
    if (extra.status === 'pendente') {
      update.status = 'recusado'
      update.recusa_operacao_motivo = motivo_recusa
    } else if (extra.status === 'aprovado_operacao') {
      update.status = 'recusado'
      update.recusa_rh_motivo = motivo_recusa
    } else {
      throw createError({ statusCode: 422, message: 'Extra não pode ser recusado neste status.' })
    }
  } else if (acao === 'cancelar') {
    update.status = 'cancelado'
  } else {
    throw createError({ statusCode: 400, message: 'Ação inválida. Use: aprovar_operacao, aprovar_rh, recusar, cancelar.' })
  }

  const { data, error } = await supabase.from('sgo_extras').update(update).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
