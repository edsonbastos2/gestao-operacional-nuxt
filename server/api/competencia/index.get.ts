import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const { data, error } = await supabase
    .from('sgo_competencias')
    .select('*, fechado_por_usuario:fechado_por(nome), reaberto_por_usuario:reaberto_por(nome)')
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [] }
})
