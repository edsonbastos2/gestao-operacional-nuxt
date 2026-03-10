import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event); const page = Number(q.page ?? 1); const ps = 20
  let query = supabase.from('sgo_colaboradores')
    .select('id,nome,cpf,matricula,data_admissao,data_demissao,status,email,telefone,prestadora_id,sgo_prestadoras(id,razao_social,nome_fantasia)', { count: 'exact' })
    .order('nome').range((page-1)*ps, page*ps-1)
  if (q.q)             query = query.ilike('nome', `%${q.q}%`)
  if (q.status)        query = query.eq('status', q.status as string)
  if (q.prestadora_id) query = query.eq('prestadora_id', q.prestadora_id as string)
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  // Busca alocações separadamente para evitar FK múltipla
  const ids = (data ?? []).map(c => c.id)
  let alocMap: Record<string, any[]> = {}
  if (ids.length) {
    const { data: alocs } = await supabase.from('sgo_alocacoes')
      .select('colaborador_id,posto_id,funcao_id,principal,status,sgo_postos(id,nome),sgo_funcoes(id,nome)')
      .in('colaborador_id', ids).eq('status', 'ativo')
    for (const a of alocs ?? []) {
      if (!alocMap[a.colaborador_id]) alocMap[a.colaborador_id] = []
      alocMap[a.colaborador_id].push({ ...a, posto: (a as any).sgo_postos, funcao: (a as any).sgo_funcoes })
    }
  }
  return {
    data: (data ?? []).map(c => ({ ...c, prestadora: (c as any).sgo_prestadoras, alocacoes: alocMap[c.id] ?? [] })),
    total: count ?? 0
  }
})
