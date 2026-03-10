import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.posto_id || !body.funcao_id) throw createError({ statusCode: 400, message: 'Posto e função obrigatórios.' })
  const { data: dup } = await supabase.from('sgo_vagas')
    .select('id').eq('posto_id', body.posto_id).eq('funcao_id', body.funcao_id).maybeSingle()
  if (dup) throw createError({ statusCode: 409, message: 'Já existe vaga para esta função neste posto.' })
  const { data, error } = await supabase.from('sgo_vagas')
    .insert({ ...body, created_by: me.id, updated_by: me.id }).select('*, sgo_funcoes(id, nome)').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { ...data, funcao: (data as any).sgo_funcoes }
})
