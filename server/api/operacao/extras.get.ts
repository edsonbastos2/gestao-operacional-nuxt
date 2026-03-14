import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  const page = Number(q.page ?? 1); const ps = 50
  let query = supabase.from('vw_extras').select('*', { count: 'exact' })
    .order('data_extra', { ascending: false }).range((page-1)*ps, page*ps-1)
  if (q.colaborador_id) query = query.eq('colaborador_id', q.colaborador_id as string)
  if (q.status)         query = query.eq('status', q.status as string)
  if (q.motivo)         query = query.eq('motivo', q.motivo as string)
  if (q.data_inicio)    query = query.gte('data_extra', q.data_inicio as string)
  if (q.data_fim)       query = query.lte('data_extra', q.data_fim as string)
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [], total: count ?? 0 }
})
