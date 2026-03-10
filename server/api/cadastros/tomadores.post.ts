import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  const { prestadora_id, razao_social, cnpj } = body
  if (!prestadora_id || !razao_social || !cnpj)
    throw createError({ statusCode: 400, message: 'Prestadora, razão social e CNPJ são obrigatórios.' })
  const { data: dup } = await supabase.from('sgo_tomadores').select('id').eq('cnpj', cnpj).maybeSingle()
  if (dup) throw createError({ statusCode: 409, message: 'CNPJ já cadastrado.' })
  const { data, error } = await supabase.from('sgo_tomadores')
    .insert({ ...body, created_by: me.id, updated_by: me.id }).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
