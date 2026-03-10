import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.colaborador_id || !body.tipo || !body.resultado || !body.data_exame)
    throw createError({ statusCode: 400, message: 'Colaborador, tipo, resultado e data são obrigatórios.' })
  const { data, error } = await supabase.from('sgo_asos')
    .insert({ ...body, created_by: me.id, updated_by: me.id }).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
