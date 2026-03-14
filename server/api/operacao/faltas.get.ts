import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  const page = Number(q.page ?? 1); const ps = 50
  let query = supabase.from('vw_faltas').select('*', { count: 'exact' })
    .order('data_falta', { ascending: false }).range((page-1)*ps, page*ps-1)
  if (q.colaborador_id) query = query.eq('colaborador_id', q.colaborador_id as string)
  if (q.posto_id)       query = query.eq('alocacao_id', q.posto_id as string)
  if (q.tipo)           query = query.eq('tipo', q.tipo as string)
  if (q.status)         query = query.eq('status', q.status as string)
  if (q.data_inicio)    query = query.gte('data_falta', q.data_inicio as string)
  if (q.data_fim)       query = query.lte('data_falta', q.data_fim as string)
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [], total: count ?? 0 }
})
