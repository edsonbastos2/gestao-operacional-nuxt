import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, 'ti_admin')
  const { competencia_id, justificativa } = await readBody(event)
  if (!competencia_id) throw createError({ statusCode: 400, message: 'competencia_id obrigatório.' })
  if (!justificativa?.trim()) throw createError({ statusCode: 400, message: 'Justificativa obrigatória para reabrir.' })

  const { data: comp } = await supabase
    .from('sgo_competencias').select('status_fechamento').eq('id', competencia_id).single()
  if (comp?.status_fechamento !== 'fechada')
    throw createError({ statusCode: 422, message: 'Apenas competências fechadas podem ser reabertas.' })

  const { data, error } = await supabase.from('sgo_competencias').update({
    status_fechamento:        'reaberta',
    reaberto_por:             me.id,
    reaberto_em:              new Date().toISOString(),
    justificativa_reabertura: justificativa.trim(),
  }).eq('id', competencia_id).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
