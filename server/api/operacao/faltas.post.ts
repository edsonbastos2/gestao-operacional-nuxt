import { getUsuarioAutenticado } from '~/server/utils/supabase'
const numOrNull = (v: any) => (v === '' || v == null) ? null : Number(v)

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)

  if (!body.colaborador_id || !body.alocacao_id || !body.data_falta || !body.tipo)
    throw createError({ statusCode: 400, message: 'Colaborador, alocação, data e tipo são obrigatórios.' })

  // Atraso parcial exige horas_falta < 8
  if (body.tipo === 'atraso_parcial' && (!body.horas_falta || Number(body.horas_falta) >= 8))
    throw createError({ statusCode: 422, message: 'Atraso parcial exige horas de falta entre 0 e 8.' })

  // Suspensão disciplinar cria ocorrência automática
  const { data, error } = await supabase.from('sgo_faltas').insert({
    colaborador_id: body.colaborador_id,
    alocacao_id:    body.alocacao_id,
    data_falta:     body.data_falta,
    tipo:           body.tipo,
    horas_falta:    numOrNull(body.horas_falta) ?? 8,
    observacoes:    body.observacoes || null,
    documento_url:  body.documento_url || null,
    created_by: me.id, updated_by: me.id,
  }).select().single()
  if (error) {
    if (error.code === '23505')
      throw createError({ statusCode: 422, message: 'Já existe uma falta deste tipo registrada para este colaborador nesta data.' })
    throw createError({ statusCode: 500, message: error.message })
  }

  // Suspensão disciplinar → cria ocorrência automática
  if (body.tipo === 'suspensao_disciplinar') {
    await supabase.from('sgo_ocorrencias').insert({
      colaborador_id:  body.colaborador_id,
      alocacao_id:     body.alocacao_id,
      data_ocorrencia: body.data_falta,
      tipo:            'suspensao',
      descricao:       body.observacoes || 'Suspensão disciplinar registrada automaticamente via lançamento de falta.',
      created_by: me.id, updated_by: me.id,
    })
  }

  return data
})
