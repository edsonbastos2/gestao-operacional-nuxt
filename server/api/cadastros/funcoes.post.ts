import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.nome) throw createError({ statusCode: 400, message: 'Nome é obrigatório.' })
  const { data: dup } = await supabase.from('sgo_funcoes').select('id').ilike('nome', body.nome).maybeSingle()
  if (dup) throw createError({ statusCode: 409, message: 'Função já cadastrada.' })
  const { data, error } = await supabase.from('sgo_funcoes')
    .insert({ ...body, created_by: me.id, updated_by: me.id }).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
