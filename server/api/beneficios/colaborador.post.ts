import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  const { colaborador_id, cct_beneficio_id, alocacao_id, fornecedor_id, data_adesao, status, motivo_recusa } = body
  if (!colaborador_id || !cct_beneficio_id || !alocacao_id || !data_adesao)
    throw createError({ statusCode: 400, message: 'colaborador_id, cct_beneficio_id, alocacao_id e data_adesao são obrigatórios.' })

  // Validação: benefício recusado exige motivo
  if (status === 'recusado' && !motivo_recusa?.trim())
    throw createError({ statusCode: 400, message: 'Motivo da recusa é obrigatório.' })

  // Verifica se o benefício é obrigatório (não pode recusar)
  const { data: benef } = await supabase
    .from('sgo_cct_beneficios').select('obrigatoriedade, nome').eq('id', cct_beneficio_id).single()
  if (benef?.obrigatoriedade === 'obrigatorio' && status === 'recusado')
    throw createError({ statusCode: 422, message: `O benefício "${benef.nome}" é obrigatório pela CCT e não pode ser recusado.` })

  const { data, error } = await supabase
    .from('sgo_colaborador_beneficios')
    .insert({ colaborador_id, cct_beneficio_id, alocacao_id, fornecedor_id: fornecedor_id ?? null,
              data_adesao, status: status ?? 'ativo', motivo_recusa: motivo_recusa ?? null,
              created_by: me.id, updated_by: me.id })
    .select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
