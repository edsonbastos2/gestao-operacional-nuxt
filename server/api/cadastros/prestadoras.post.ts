import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  const { razao_social, nome_fantasia, cnpj, email, telefone } = body
  if (!razao_social || !cnpj) throw createError({ statusCode: 400, message: 'Razão social e CNPJ são obrigatórios.' })
  const { data: dup } = await supabase.from('sgo_prestadoras').select('id').eq('cnpj', cnpj).maybeSingle()
  if (dup) throw createError({ statusCode: 409, message: 'CNPJ já cadastrado.' })
  const { data, error } = await supabase.from('sgo_prestadoras')
    .insert({ razao_social, nome_fantasia, cnpj, email, telefone, created_by: me.id, updated_by: me.id })
    .select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
