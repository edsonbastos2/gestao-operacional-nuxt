import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  if (!q.competencia_id) throw createError({ statusCode: 400, message: 'competencia_id obrigatório.' })

  const { data: comp } = await supabase
    .from('sgo_competencias').select('data_inicio, data_fim').eq('id', q.competencia_id as string).single()
  if (!comp) throw createError({ statusCode: 404, message: 'Competência não encontrada.' })

  const [extras_pendentes, extras_rh, faltas_inj, sem_aloc] = await Promise.all([
    supabase.from('sgo_extras').select('id, sgo_colaboradores:colaborador_id(nome)', { count: 'exact' })
      .gte('data_extra', comp.data_inicio).lte('data_extra', comp.data_fim).eq('status', 'pendente'),
    supabase.from('sgo_extras').select('id, sgo_colaboradores:colaborador_id(nome)', { count: 'exact' })
      .gte('data_extra', comp.data_inicio).lte('data_extra', comp.data_fim).eq('status', 'aprovado_operacao'),
    supabase.from('sgo_faltas').select('id, sgo_colaboradores:colaborador_id(nome)', { count: 'exact' })
      .gte('data_falta', comp.data_inicio).lte('data_falta', comp.data_fim)
      .eq('tipo', 'injustificada').eq('status', 'registrada'),
    supabase.from('sgo_colaboradores').select('id, nome', { count: 'exact' })
      .eq('status', 'ativo'),
  ])

  return {
    data_inicio: comp.data_inicio,
    data_fim:    comp.data_fim,
    extras_pendentes:     { total: extras_pendentes.count ?? 0, itens: extras_pendentes.data ?? [] },
    extras_aguardando_rh: { total: extras_rh.count ?? 0,        itens: extras_rh.data ?? [] },
    faltas_injustificadas:{ total: faltas_inj.count ?? 0,        itens: faltas_inj.data ?? [] },
    tem_pendencias: (extras_pendentes.count ?? 0) + (extras_rh.count ?? 0) + (faltas_inj.count ?? 0) > 0,
  }
})
