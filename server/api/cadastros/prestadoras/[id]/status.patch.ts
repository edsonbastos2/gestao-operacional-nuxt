import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')
  const { justificativa } = await readBody(event)
  if (!justificativa?.trim()) throw createError({ statusCode: 400, message: 'Justificativa obrigatória.' })
  const { data: atual } = await supabase.from('sgo_prestadoras').select('status').eq('id', id).single()
  const novoStatus = atual?.status === 'ativo' ? 'inativo' : 'ativo'
  await supabase.from('sgo_prestadoras').update({
    status: novoStatus, updated_by: me.id,
    cancelled_at: novoStatus === 'inativo' ? new Date().toISOString() : null,
    cancelled_by: novoStatus === 'inativo' ? me.id : null,
    cancellation_reason: novoStatus === 'inativo' ? justificativa : null,
  }).eq('id', id)
  return { status: novoStatus }
})
