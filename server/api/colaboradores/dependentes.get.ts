import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const { colaborador_id } = getQuery(event)
  if (!colaborador_id) throw createError({ statusCode: 400, message: 'colaborador_id obrigatório.' })
  const { data, error } = await supabase.from('sgo_dependentes').select('*')
    .eq('colaborador_id', colaborador_id as string).order('nome')
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [] }
})
