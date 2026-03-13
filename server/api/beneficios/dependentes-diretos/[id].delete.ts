import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')!
  // Verifica se está em algum plano ativo antes de excluir
  const { count } = await supabase
    .from('sgo_saude_dependentes').select('*', { count:'exact', head:true })
    .eq('dependente_id', id).eq('status','ativo')
  if ((count ?? 0) > 0)
    throw createError({ statusCode: 422, message: 'Dependente está ativo em um plano de saúde. Exclua-o do plano antes de remover.' })
  const { error } = await supabase.from('sgo_dependentes_diretos').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { ok: true }
})
