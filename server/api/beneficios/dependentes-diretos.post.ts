import { getUsuarioAutenticado } from '~/server/utils/supabase'

const PARENTESCOS_DIRETOS = ['conjuge','filho','enteado','pai','mae']

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)

  if (!body.colaborador_id || !body.nome || !body.parentesco)
    throw createError({ statusCode: 400, message: 'colaborador_id, nome e parentesco são obrigatórios.' })

  if (!PARENTESCOS_DIRETOS.includes(body.parentesco))
    throw createError({ statusCode: 422, message: `Parentesco inválido. Permitidos: ${PARENTESCOS_DIRETOS.join(', ')}.` })

  // Cônjuge: apenas 1 por colaborador
  if (body.parentesco === 'conjuge') {
    const { count } = await supabase
      .from('sgo_dependentes_diretos')
      .select('*', { count: 'exact', head: true })
      .eq('colaborador_id', body.colaborador_id)
      .eq('parentesco', 'conjuge')
    if ((count ?? 0) > 0)
      throw createError({ statusCode: 422, message: 'O colaborador já possui um cônjuge cadastrado.' })
  }

  const { data, error } = await supabase
    .from('sgo_dependentes_diretos')
    .insert({ ...body, created_by: me.id, updated_by: me.id })
    .select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
