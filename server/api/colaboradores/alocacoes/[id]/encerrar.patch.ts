import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')
  const { data_fim } = await readBody(event)
  if (!data_fim) throw createError({ statusCode: 400, message: 'data_fim obrigatória.' })
  await supabase.from('sgo_alocacoes').update({ status: 'inativo', data_fim, updated_by: me.id }).eq('id', id)
  return { success: true }
})
