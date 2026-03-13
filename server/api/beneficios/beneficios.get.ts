import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  let query = supabase
    .from('sgo_cct_beneficios')
    .select('*, sgo_ccts(id,nome,prestadora_id)', { count: 'exact' })
    .order('tipo').order('vigencia_inicio', { ascending: false })
  if (q.cct_id) query = query.eq('cct_id', q.cct_id as string)
  if (q.tipo)   query = query.eq('tipo', q.tipo as string)
  if (q.status) query = query.eq('status', q.status as string)
  else          query = query.eq('status', 'ativo')
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [], total: count ?? 0 }
})
