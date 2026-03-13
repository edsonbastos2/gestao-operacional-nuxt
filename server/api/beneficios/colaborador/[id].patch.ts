import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  // Não permite reativar benefício que foi recusado para obrigatório
  if (body.status === 'recusado') {
    const { data: atual } = await supabase
      .from('sgo_colaborador_beneficios').select('cct_beneficio_id').eq('id', id).single()
    if (atual) {
      const { data: benef } = await supabase
        .from('sgo_cct_beneficios').select('obrigatoriedade, nome').eq('id', atual.cct_beneficio_id).single()
      if (benef?.obrigatoriedade === 'obrigatorio')
        throw createError({ statusCode: 422, message: `O benefício "${benef.nome}" é obrigatório pela CCT e não pode ser recusado.` })
    }
  }
  const { data, error } = await supabase
    .from('sgo_colaborador_beneficios').update({ ...body, updated_by: me.id }).eq('id', id)
    .select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
