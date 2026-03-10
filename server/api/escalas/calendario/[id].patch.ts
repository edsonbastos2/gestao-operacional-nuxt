import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  // Marcar como ajuste manual (RF-033)
  const { data, error } = await supabase.from('sgo_calendario').update({
    ...body, ajustado: true, ajustado_por: me.id,
    ajustado_em: new Date().toISOString(), updated_by: me.id,
  }).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
