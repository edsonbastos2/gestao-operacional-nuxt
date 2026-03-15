import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  if (!q.colaborador_id) throw createError({ statusCode: 400, message: 'colaborador_id obrigatório.' })
  const { data, error } = await supabase
    .from('sgo_historico_salarial')
    .select('*, criado_por:created_by(nome)')
    .eq('colaborador_id', q.colaborador_id as string)
    .order('vigencia_inicio', { ascending: false })
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [] }
})
