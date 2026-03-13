import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.prestadora_id || !body.nome || !body.tipo)
    throw createError({ statusCode: 400, message: 'Prestadora, nome e tipo são obrigatórios.' })
  const { data, error } = await supabase
    .from('sgo_beneficio_fornecedores')
    .insert({ ...body, created_by: me.id, updated_by: me.id })
    .select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
