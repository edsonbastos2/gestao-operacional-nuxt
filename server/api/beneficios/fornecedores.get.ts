import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  let query = supabase.from('sgo_beneficio_fornecedores').select('*', { count: 'exact' }).order('nome')
  if (q.prestadora_id) query = query.eq('prestadora_id', q.prestadora_id as string)
  if (q.tipo)          query = query.eq('tipo', q.tipo as string)
  if (q.status)        query = query.eq('status', q.status as string)
  else                 query = query.eq('status', 'ativo')
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [], total: count ?? 0 }
})
