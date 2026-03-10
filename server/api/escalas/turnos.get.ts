import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const { escala_id } = getQuery(event)
  if (!escala_id) throw createError({ statusCode: 400, message: 'escala_id obrigatório.' })
  const { data, error } = await supabase.from('sgo_turnos').select('*')
    .eq('escala_id', escala_id as string).order('hora_inicio')
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [] }
})
