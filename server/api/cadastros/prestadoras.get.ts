import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  const page = Number(q.page ?? 1); const ps = 20
  let query = supabase.from('sgo_prestadoras')
    .select('*', { count: 'exact' }).order('razao_social').range((page-1)*ps, page*ps-1)
  if (q.q)      query = query.ilike('razao_social', `%${q.q}%`)
  if (q.status) query = query.eq('status', q.status as string)
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [], total: count ?? 0 }
})
