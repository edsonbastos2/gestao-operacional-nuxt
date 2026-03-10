import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')
  const { status, motivo } = await readBody(event)
  const allowed = ['aprovado','reprovado','desistiu']
  if (!allowed.includes(status)) throw createError({ statusCode: 400, message: 'Status inválido.' })
  if (status === 'reprovado' && !motivo?.trim())
    throw createError({ statusCode: 400, message: 'Motivo obrigatório para reprovação.' })
  await supabase.from('sgo_candidatos').update({
    status, updated_by: me.id,
    reprovado_motivo: status === 'reprovado' ? motivo : null
  }).eq('id', id)
  return { status }
})
