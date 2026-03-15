import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  if (!q.competencia_id) throw createError({ statusCode: 400, message: 'competencia_id obrigatório.' })
  let query = supabase.from('vw_folha_resumo').select('*').eq('competencia_id', q.competencia_id as string).order('colaborador_nome')
  if (q.prestadora_id) query = query.eq('prestadora_id', q.prestadora_id as string)
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [] }
})
