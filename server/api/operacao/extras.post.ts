import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)

  if (!body.colaborador_id || !body.alocacao_id || !body.data_extra || !body.horas || !body.motivo)
    throw createError({ statusCode: 400, message: 'Colaborador, alocação, data, horas e motivo são obrigatórios.' })

  // Bloqueia lançamento se competência estiver fechada
  const dataRef = body.data_extra
  if (dataRef) {
    const d = new Date(dataRef + 'T12:00:00')
    const { data: comp } = await supabase
      .from('sgo_competencias')
      .select('status_fechamento')
      .eq('ano', d.getFullYear())
      .eq('mes', d.getMonth() + 1)
      .single()
    if (comp?.status_fechamento === 'fechada')
      throw createError({ statusCode: 422, message: 'Competência fechada. Não é possível lançar extras para este período.' })
  }


  if (Number(body.horas) <= 0 || Number(body.horas) > 24)
    throw createError({ statusCode: 422, message: 'Horas extras devem ser entre 0 e 24.' })

  // Cobertura de falta: aprovação automática (não precisa de fluxo)
  const coberturaFalta = body.motivo === 'cobertura_falta'
  const hoje = new Date().toISOString()

  const payload: any = {
    colaborador_id: body.colaborador_id,
    alocacao_id:    body.alocacao_id,
    falta_id:       body.falta_id || null,
    data_extra:     body.data_extra,
    horas:          Number(body.horas),
    motivo:         body.motivo,
    descricao:      body.descricao || null,
    created_by: me.id, updated_by: me.id,
  }

  if (coberturaFalta) {
    // Valida que falta_id foi informado para cobertura
    if (!body.falta_id)
      throw createError({ statusCode: 422, message: 'Informe a falta que está sendo coberta.' })
    payload.status               = 'aprovado_rh'
    payload.aprovado_operacao_por = me.id
    payload.aprovado_operacao_em  = hoje
    payload.aprovado_rh_por       = me.id
    payload.aprovado_rh_em        = hoje
  } else {
    payload.status = 'pendente'
  }

  const { data, error } = await supabase.from('sgo_extras').insert(payload).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
