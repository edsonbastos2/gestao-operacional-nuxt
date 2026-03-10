import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')
  const { justificativa } = await readBody(event)
  if (!justificativa?.trim()) throw createError({ statusCode: 400, message: 'Justificativa obrigatória.' })
  const { data: atual } = await supabase.from('sgo_escalas').select('status').eq('id', id).single()
  const novoStatus = atual?.status === 'ativo' ? 'inativo' : 'ativo'
  await supabase.from('sgo_escalas').update({ status: novoStatus, updated_by: me.id }).eq('id', id)
  return { status: novoStatus }
})
