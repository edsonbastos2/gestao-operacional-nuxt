import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')
  const { data, error } = await supabase.from('sgo_colaboradores')
    .select('*, sgo_prestadoras(id,razao_social,nome_fantasia)').eq('id', id).single()
  if (error) throw createError({ statusCode: 404, message: 'Colaborador não encontrado.' })
  const [{ data: alocs }, { data: asos }, { data: deps }] = await Promise.all([
    supabase.from('sgo_alocacoes').select('*,sgo_postos(id,nome),sgo_funcoes(id,nome)').eq('colaborador_id', id).order('principal', { ascending: false }),
    supabase.from('sgo_asos').select('*').eq('colaborador_id', id).order('data_exame', { ascending: false }),
    supabase.from('sgo_dependentes').select('*').eq('colaborador_id', id).order('nome'),
  ])
  return {
    ...data,
    prestadora: (data as any).sgo_prestadoras,
    alocacoes: (alocs ?? []).map(a => ({ ...a, posto: (a as any).sgo_postos, funcao: (a as any).sgo_funcoes })),
    asos: asos ?? [],
    dependentes: deps ?? [],
  }
})
