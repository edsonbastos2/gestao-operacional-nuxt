import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  if (!q.alocacao_id || !q.colaborador_id)
    throw createError({ statusCode: 400, message: 'alocacao_id e colaborador_id são obrigatórios.' })

  // Busca posto e função da alocação
  const { data: aloc } = await supabase
    .from('sgo_alocacoes')
    .select('posto_id, funcao_id')
    .eq('id', q.alocacao_id as string)
    .single()
  if (!aloc) throw createError({ statusCode: 404, message: 'Alocação não encontrada.' })

  // Busca prestadora via posto → tomador
  const { data: posto } = await supabase
    .from('sgo_postos')
    .select('tomador_id, sgo_tomadores(prestadora_id)')
    .eq('id', aloc.posto_id)
    .single()
  const prestadora_id = (posto as any)?.sgo_tomadores?.prestadora_id
  if (!prestadora_id) return { data: [] }

  // CCTs da prestadora que cobrem esta função
  const { data: cctFuncoes } = await supabase
    .from('sgo_cct_funcoes')
    .select('cct_id')
    .eq('funcao_id', aloc.funcao_id)

  if (!cctFuncoes?.length) return { data: [] }

  const cctIds = cctFuncoes.map(cf => cf.cct_id)

  // Filtra CCTs ativas da prestadora
  const { data: ccts } = await supabase
    .from('sgo_ccts')
    .select('id')
    .in('id', cctIds)
    .eq('prestadora_id', prestadora_id)
    .eq('status', 'ativo')

  if (!ccts?.length) return { data: [] }

  // Benefícios ativos dessas CCTs
  const hoje = new Date().toISOString().split('T')[0]
  const { data: beneficios } = await supabase
    .from('sgo_cct_beneficios')
    .select('*')
    .in('cct_id', ccts.map(c => c.id))
    .eq('status', 'ativo')
    .lte('vigencia_inicio', hoje)
    .or(`vigencia_fim.is.null,vigencia_fim.gte.${hoje}`)
    .order('tipo')

  // IDs já aderidos por este colaborador nesta alocação
  const { data: jaAderidos } = await supabase
    .from('sgo_colaborador_beneficios')
    .select('cct_beneficio_id')
    .eq('colaborador_id', q.colaborador_id as string)
    .eq('alocacao_id', q.alocacao_id as string)

  const aderidos = new Set(jaAderidos?.map(a => a.cct_beneficio_id) ?? [])

  // Retorna somente os que ainda não foram aderidos
  return { data: (beneficios ?? []).filter(b => !aderidos.has(b.id)) }
})
