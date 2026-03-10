import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  if (!q.competencia) throw createError({ statusCode: 400, message: 'competencia obrigatório.' })
  let query = supabase.from('sgo_calendario')
    .select('*, sgo_colaboradores(id,nome), sgo_escalas(id,nome), sgo_turnos(id,nome,hora_inicio,hora_fim)')
    .eq('competencia', q.competencia as string).order('data')
  if (q.colaborador_id) query = query.eq('colaborador_id', q.colaborador_id as string)
  if (q.escala_id)      query = query.eq('escala_id', q.escala_id as string)
  if (q.posto_id) {
    // filtra via colaboradores com alocação no posto
    const { data: alocs } = await supabase.from('sgo_alocacoes')
      .select('colaborador_id').eq('posto_id', q.posto_id as string).eq('status', 'ativo')
    const ids = (alocs ?? []).map(a => a.colaborador_id)
    if (ids.length) query = query.in('colaborador_id', ids)
    else return { data: [] }
  }
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: (data ?? []).map(d => ({
    ...d,
    colaborador: (d as any).sgo_colaboradores,
    escala: (d as any).sgo_escalas,
    turno: (d as any).sgo_turnos,
  })) }
})
