import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event); const page = Number(q.page ?? 1); const ps = 50
  let query = supabase.from('sgo_feriados').select('*', { count: 'exact' }).order('data').range((page-1)*ps, page*ps-1)
  if (q.ano) query = query.gte('data', `${q.ano}-01-01`).lte('data', `${q.ano}-12-31`)
  if (q.uf)  query = query.or(`uf.eq.${q.uf},tipo.eq.nacional`)
  if (q.q)   query = query.ilike('nome', `%${q.q}%`)
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [], total: count ?? 0 }
})