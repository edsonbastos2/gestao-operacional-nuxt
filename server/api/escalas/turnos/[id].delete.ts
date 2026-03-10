import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')
  const { error } = await supabase.from('sgo_turnos').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
