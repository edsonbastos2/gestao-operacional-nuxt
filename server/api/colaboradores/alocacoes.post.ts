import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)

  if (!body.colaborador_id || !body.posto_id || !body.funcao_id || !body.data_inicio)
    throw createError({ statusCode: 400, message: 'Colaborador, posto, função e data início são obrigatórios.' })

  // 1. Limite de 2 alocações ativas
  const { count: qtdColab } = await supabase
    .from('sgo_alocacoes')
    .select('*', { count: 'exact', head: true })
    .eq('colaborador_id', body.colaborador_id)
    .eq('status', 'ativo')
  if ((qtdColab ?? 0) >= 2)
    throw createError({ statusCode: 422, message: 'Colaborador já possui 2 alocações ativas.' })

  // 2. Verifica vaga
  const { data: vaga } = await supabase
    .from('sgo_vagas')
    .select('id, quantidade')
    .eq('posto_id', body.posto_id)
    .eq('funcao_id', body.funcao_id)
    .eq('status', 'ativo')
    .maybeSingle()
  if (!vaga) throw createError({ statusCode: 404, message: 'Não existe vaga ativa para esta combinação de posto e função.' })

  // 3. Vaga lotada?
  const { count: qtdVaga } = await supabase
    .from('sgo_alocacoes')
    .select('*', { count: 'exact', head: true })
    .eq('vaga_id', vaga.id)
    .eq('status', 'ativo')
  if ((qtdVaga ?? 0) >= vaga.quantidade)
    throw createError({ statusCode: 422, message: `Vaga lotada. Permite ${vaga.quantidade} profissional(is), já possui ${qtdVaga}.` })

  // 4. Cria alocação
  const principal = (qtdColab ?? 0) === 0 ? true : (body.principal ?? false)
  const { data: alocacao, error } = await supabase
    .from('sgo_alocacoes')
    .insert({
      colaborador_id: body.colaborador_id,
      posto_id:       body.posto_id,
      funcao_id:      body.funcao_id,
      vaga_id:        vaga.id,
      principal,
      data_inicio:    body.data_inicio,
      observacoes:    body.observacoes ?? null,
      status:         'ativo',
      created_by:     me.id,
      updated_by:     me.id,
    })
    .select('*, sgo_postos(id,nome), sgo_funcoes(id,nome)')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })

  // 5. Aplica benefícios obrigatórios automaticamente
  let beneficiosAplicados = 0
  try {
    const res = await aplicarObrigatorios(supabase, body.colaborador_id, alocacao.id, me.id)
    beneficiosAplicados = res.aplicados
  } catch { /* não bloqueia a alocação se falhar */ }

  return {
    ...alocacao,
    posto:  (alocacao as any).sgo_postos,
    funcao: (alocacao as any).sgo_funcoes,
    beneficios_aplicados: beneficiosAplicados,
  }
})

// Função interna reutilizável
async function aplicarObrigatorios(supabase: any, colaborador_id: string, alocacao_id: string, usuario_id: string) {
  const { data: aloc } = await supabase
    .from('sgo_alocacoes').select('posto_id, funcao_id').eq('id', alocacao_id).single()
  if (!aloc) return { aplicados: 0 }

  const { data: posto } = await supabase
    .from('sgo_postos').select('tomador_id, sgo_tomadores(prestadora_id)').eq('id', aloc.posto_id).single()
  const prestadora_id = (posto as any)?.sgo_tomadores?.prestadora_id
  if (!prestadora_id) return { aplicados: 0 }

  const { data: cctFuncoes } = await supabase
    .from('sgo_cct_funcoes').select('cct_id').eq('funcao_id', aloc.funcao_id)
  if (!cctFuncoes?.length) return { aplicados: 0 }

  const { data: ccts } = await supabase
    .from('sgo_ccts').select('id').in('id', cctFuncoes.map((c: any) => c.cct_id))
    .eq('prestadora_id', prestadora_id).eq('status', 'ativo')
  if (!ccts?.length) return { aplicados: 0 }

  const { data: beneficios } = await supabase
    .from('sgo_cct_beneficios').select('id')
    .in('cct_id', ccts.map((c: any) => c.id))
    .eq('obrigatoriedade', 'obrigatorio').eq('status', 'ativo')
    .or('vigencia_fim.is.null,vigencia_fim.gte.' + hoje)
  if (!beneficios?.length) return { aplicados: 0 }

  const hoje = new Date().toISOString().split('T')[0]
  let aplicados = 0
  for (const b of beneficios) {
    const { error } = await supabase.from('sgo_colaborador_beneficios').insert({
      colaborador_id, cct_beneficio_id: b.id, alocacao_id,
      data_adesao: hoje, status: 'ativo',
      created_by: usuario_id, updated_by: usuario_id
    })
    if (!error) aplicados++
  }
  return { aplicados }
}
