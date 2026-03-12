import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)

  if (!body.colaborador_id || !body.posto_id || !body.funcao_id || !body.data_inicio)
    throw createError({ statusCode: 400, message: 'Colaborador, posto, função e data início são obrigatórios.' })

  // 1. Verifica limite de 2 alocações ativas por colaborador
  const { count: qtdColab } = await supabase
    .from('sgo_alocacoes')
    .select('*', { count: 'exact', head: true })
    .eq('colaborador_id', body.colaborador_id)
    .eq('status', 'ativo')

  if ((qtdColab ?? 0) >= 2)
    throw createError({ statusCode: 422, message: 'Colaborador já possui 2 alocações ativas.' })

  // 2. Busca a vaga correspondente ao posto + função
  const { data: vaga, error: vagaErr } = await supabase
    .from('sgo_vagas')
    .select('id, quantidade')
    .eq('posto_id', body.posto_id)
    .eq('funcao_id', body.funcao_id)
    .eq('status', 'ativo')
    .maybeSingle()

  if (vagaErr) throw createError({ statusCode: 500, message: vagaErr.message })
  if (!vaga) throw createError({ statusCode: 404, message: 'Não existe vaga ativa para esta combinação de posto e função.' })

  // 3. Conta quantos já estão alocados nesta vaga
  const { count: qtdVaga } = await supabase
    .from('sgo_alocacoes')
    .select('*', { count: 'exact', head: true })
    .eq('vaga_id', vaga.id)
    .eq('status', 'ativo')

  if ((qtdVaga ?? 0) >= vaga.quantidade)
    throw createError({
      statusCode: 422,
      message: `Vaga lotada. Esta vaga permite ${vaga.quantidade} profissional(is) e já possui ${qtdVaga} alocado(s).`
    })

  // 4. Define como principal se for a primeira alocação
  const principal = (qtdColab ?? 0) === 0 ? true : (body.principal ?? false)

  // 5. Cria a alocação vinculada à vaga
  const { data, error } = await supabase
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

  return {
    ...data,
    posto:  (data as any).sgo_postos,
    funcao: (data as any).sgo_funcoes,
    vaga_id: vaga.id,
    saldo_restante: vaga.quantidade - (qtdVaga ?? 0) - 1,
  }
})
