import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  if (!q.colaborador_id) throw createError({ statusCode: 400, message: 'colaborador_id é obrigatório.' })
  const { data, error } = await supabase
    .from('sgo_dependentes_diretos')
    .select('*')
    .eq('colaborador_id', q.colaborador_id as string)
    .order('nome')
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [] }
})
