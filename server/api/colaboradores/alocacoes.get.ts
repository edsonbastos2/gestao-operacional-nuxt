import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const { colaborador_id } = getQuery(event)
  if (!colaborador_id) throw createError({ statusCode: 400, message: 'colaborador_id obrigatório.' })
  const { data, error } = await supabase.from('sgo_alocacoes')
    .select('*, sgo_postos(id,nome), sgo_funcoes(id,nome)')
    .eq('colaborador_id', colaborador_id as string).order('principal', { ascending: false })
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: (data ?? []).map(a => ({ ...a, posto: (a as any).sgo_postos, funcao: (a as any).sgo_funcoes })) }
})
