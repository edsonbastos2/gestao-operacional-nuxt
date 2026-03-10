import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const { posto_id } = getQuery(event)
  if (!posto_id) throw createError({ statusCode: 400, message: 'posto_id obrigatório.' })
  const { data, error } = await supabase.from('sgo_vagas')
    .select('*, sgo_funcoes(id, nome)')
    .eq('posto_id', posto_id as string).order('created_at')
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: (data ?? []).map(v => ({ ...v, funcao: v.sgo_funcoes })) }
})
