import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.colaborador_id || !body.data_ocorrencia || !body.tipo || !body.descricao?.trim())
    throw createError({ statusCode: 400, message: 'Colaborador, data, tipo e descrição são obrigatórios.' })
  const { data, error } = await supabase.from('sgo_ocorrencias').insert({
    ...body, descricao: body.descricao.trim(),
    created_by: me.id, updated_by: me.id,
  }).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
