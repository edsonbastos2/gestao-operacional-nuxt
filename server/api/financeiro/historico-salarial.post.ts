import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.colaborador_id || !body.salario || !body.vigencia_inicio)
    throw createError({ statusCode: 400, message: 'Colaborador, salário e vigência de início são obrigatórios.' })
  if (Number(body.salario) <= 0)
    throw createError({ statusCode: 422, message: 'Salário deve ser maior que zero.' })

  // Encerra vigência anterior
  await supabase.from('sgo_historico_salarial')
    .update({ vigencia_fim: body.vigencia_inicio })
    .eq('colaborador_id', body.colaborador_id)
    .is('vigencia_fim', null)
    .lt('vigencia_inicio', body.vigencia_inicio)

  const { data, error } = await supabase.from('sgo_historico_salarial')
    .insert({ ...body, vigencia_fim: null, created_by: me.id, updated_by: me.id })
    .select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
