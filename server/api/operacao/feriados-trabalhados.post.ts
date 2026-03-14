import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)

  if (!body.colaborador_id || !body.alocacao_id || !body.data_trabalho || !body.escala_tipo)
    throw createError({ statusCode: 400, message: 'Colaborador, alocação, data e tipo de escala são obrigatórios.' })

  if (!['12x36', 'outros'].includes(body.escala_tipo))
    throw createError({ statusCode: 422, message: 'Escala inválida. Use: 12x36 ou outros.' })

  const { data, error } = await supabase
    .from('sgo_feriados_trabalhados')
    .insert({
      colaborador_id:    body.colaborador_id,
      alocacao_id:       body.alocacao_id,
      feriado_id:        body.feriado_id || null,
      data_trabalho:     body.data_trabalho,
      horas_trabalhadas: Number(body.horas_trabalhadas) || 8,
      escala_tipo:       body.escala_tipo,
      observacoes:       body.observacoes || null,
      created_by: me.id, updated_by: me.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505')
      throw createError({ statusCode: 422, message: 'Este colaborador já tem feriado trabalhado registrado nesta data.' })
    throw createError({ statusCode: 500, message: error.message })
  }
  return data
})
