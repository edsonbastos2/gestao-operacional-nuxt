import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const { created_at, created_by, ...rest } = body
  const { data, error } = await supabase.from('sgo_feriados_trabalhados')
    .update({ ...rest, updated_by: me.id }).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
