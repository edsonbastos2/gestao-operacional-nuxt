import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.escala_id || !body.nome || !body.hora_inicio || !body.hora_fim)
    throw createError({ statusCode: 400, message: 'Escala, nome, hora início e fim obrigatórios.' })
  const { data, error } = await supabase.from('sgo_turnos')
    .insert({ ...body, created_by: me.id, updated_by: me.id }).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
