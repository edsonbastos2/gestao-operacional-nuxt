import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.nome || !body.cpf) throw createError({ statusCode: 400, message: 'Nome e CPF são obrigatórios.' })
  const { data: dup } = await supabase.from('sgo_candidatos').select('id').eq('cpf', body.cpf).maybeSingle()
  if (dup) throw createError({ statusCode: 409, message: 'CPF já cadastrado.' })
  const { data, error } = await supabase.from('sgo_candidatos')
    .insert({ ...body, created_by: me.id, updated_by: me.id }).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
