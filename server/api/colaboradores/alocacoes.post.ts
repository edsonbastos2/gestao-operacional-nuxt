import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.colaborador_id || !body.posto_id || !body.funcao_id || !body.data_inicio)
    throw createError({ statusCode: 400, message: 'Colaborador, posto, função e data início são obrigatórios.' })
  const { count } = await supabase.from('sgo_alocacoes')
    .select('*', { count: 'exact', head: true })
    .eq('colaborador_id', body.colaborador_id).eq('status', 'ativo')
  if ((count ?? 0) >= 2) throw createError({ statusCode: 422, message: 'Colaborador já possui 2 alocações ativas.' })
  // Se é a primeira alocação, define como principal
  const principal = (count ?? 0) === 0 ? true : (body.principal ?? false)
  const { data, error } = await supabase.from('sgo_alocacoes')
    .insert({ ...body, principal, created_by: me.id, updated_by: me.id })
    .select('*, sgo_postos(id,nome), sgo_funcoes(id,nome)').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { ...data, posto: (data as any).sgo_postos, funcao: (data as any).sgo_funcoes }
})
