import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)

  let query = supabase
    .from('vw_ocupacao_vagas')
    .select('*')
    .order('tomador_nome')
    .order('posto_nome')

  if (q.posto_id)     query = query.eq('posto_id', q.posto_id as string)
  if (q.tomador_id)   query = query.eq('tomador_id', q.tomador_id as string)
  if (q.prestadora_id) query = query.eq('prestadora_id', q.prestadora_id as string)

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [] }
})
