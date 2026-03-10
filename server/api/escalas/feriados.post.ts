import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.data || !body.nome) throw createError({ statusCode: 400, message: 'Data e nome obrigatórios.' })
  const { data, error } = await supabase.from('sgo_feriados')
    .insert({ ...body, created_by: me.id, updated_by: me.id }).select().single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Feriado já cadastrado para esta data e localidade.' })
    throw createError({ statusCode: 500, message: error.message })
  }
  return data
})
