import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const { colaborador_id, alocacao_id } = await readBody(event)
  if (!colaborador_id || !alocacao_id)
    throw createError({ statusCode: 400, message: 'colaborador_id e alocacao_id são obrigatórios.' })

  // Busca a alocação para saber posto e função
  const { data: aloc } = await supabase
    .from('sgo_alocacoes').select('posto_id, funcao_id').eq('id', alocacao_id).single()
  if (!aloc) throw createError({ statusCode: 404, message: 'Alocação não encontrada.' })

  // Busca tomador → prestadora da alocação
  const { data: posto } = await supabase
    .from('sgo_postos').select('tomador_id, sgo_tomadores(prestadora_id)').eq('id', aloc.posto_id).single()
  const prestadora_id = (posto as any)?.sgo_tomadores?.prestadora_id
  if (!prestadora_id) throw createError({ statusCode: 404, message: 'Prestadora não encontrada para esta alocação.' })

  // Busca CCTs ativas da prestadora que incluam esta função
  const { data: cctFuncoes } = await supabase
    .from('sgo_cct_funcoes')
    .select('cct_id, sgo_ccts!inner(id, status, prestadora_id)')
    .eq('funcao_id', aloc.funcao_id)
    .eq('sgo_ccts.prestadora_id', prestadora_id)
    .eq('sgo_ccts.status', 'ativo')

  if (!cctFuncoes?.length) return { aplicados: 0, mensagem: 'Nenhuma CCT encontrada para esta função/prestadora.' }

  const cctIds = cctFuncoes.map(cf => cf.cct_id)

  // Busca benefícios obrigatórios dessas CCTs
  const { data: beneficios } = await supabase
    .from('sgo_cct_beneficios')
    .select('id')
    .in('cct_id', cctIds)
    .eq('obrigatoriedade', 'obrigatorio')
    .eq('status', 'ativo')
    .lte('vigencia_inicio', new Date().toISOString().split('T')[0])
    .or('vigencia_fim.is.null,vigencia_fim.gte.' + new Date().toISOString().split('T')[0])

  if (!beneficios?.length) return { aplicados: 0, mensagem: 'Nenhum benefício obrigatório encontrado.' }

  // Cria adesões apenas para os que ainda não existem
  const hoje = new Date().toISOString().split('T')[0]
  let aplicados = 0
  for (const b of beneficios) {
    const { error } = await supabase.from('sgo_colaborador_beneficios').insert({
      colaborador_id, cct_beneficio_id: b.id, alocacao_id,
      data_adesao: hoje, status: 'ativo',
      created_by: me.id, updated_by: me.id
    })
    if (!error) aplicados++
    // ignora erro de UNIQUE (já existia)
  }

  return { aplicados, mensagem: `${aplicados} benefício(s) obrigatório(s) aplicado(s) automaticamente.` }
})
