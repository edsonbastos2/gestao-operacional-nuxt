import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  const page = Number(q.page ?? 1); const ps = 50

  let query = supabase.from('sgo_feriados_trabalhados')
    .select(`
      id, colaborador_id, alocacao_id, feriado_id,
      data_trabalho, horas_trabalhadas, escala_tipo, gera_pagamento,
      observacoes, created_at, updated_at, created_by,
      sgo_colaboradores(id, nome, matricula),
      sgo_alocacoes(posto_id, funcao_id, sgo_postos(nome), sgo_funcoes(nome)),
      sgo_feriados(nome, data)
    `, { count: 'exact' })
    .order('data_trabalho', { ascending: false })
    .range((page-1)*ps, page*ps-1)

  if (q.colaborador_id) query = query.eq('colaborador_id', q.colaborador_id as string)
  if (q.escala_tipo)    query = query.eq('escala_tipo', q.escala_tipo as string)

  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [], total: count ?? 0 }
})