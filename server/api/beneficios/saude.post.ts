import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  const { dependentes, ...planoData } = body

  if (!planoData.colaborador_id || !planoData.colab_beneficio_id || !planoData.data_inclusao || !planoData.tipo)
    throw createError({ statusCode: 400, message: 'colaborador_id, colab_beneficio_id, tipo e data_inclusao são obrigatórios.' })

  if (!['saude', 'odonto'].includes(planoData.tipo))
    throw createError({ statusCode: 400, message: 'Tipo deve ser "saude" ou "odonto".' })

  // Odonto: 100% custeado pelo colaborador, sem dependentes
  if (planoData.tipo === 'odonto') {
    planoData.custeio = null
    planoData.valor_coparticipacao = null
    if (dependentes?.length)
      throw createError({ statusCode: 422, message: 'Plano odontológico é custeado 100% pelo colaborador. Dependentes não são cobertos pela prestadora.' })
  }

  // Saúde: valida custeio
  if (planoData.tipo === 'saude') {
    if (!planoData.custeio)
      throw createError({ statusCode: 400, message: 'Informe o custeio do plano de saúde.' })
    if (planoData.custeio === 'prestadora_100') planoData.valor_coparticipacao = 0

    // Valida que dependentes informados são dependentes diretos
    if (dependentes?.length) {
      const { data: deps } = await supabase
        .from('sgo_dependentes_diretos')
        .select('id, parentesco')
        .eq('colaborador_id', planoData.colaborador_id)
        .in('id', dependentes)
      if ((deps?.length ?? 0) !== dependentes.length)
        throw createError({ statusCode: 422, message: 'Somente dependentes diretos (cônjuge, filho, enteado, pai, mãe) podem ser incluídos no plano de saúde.' })
    }
  }

  const { data: plano, error } = await supabase
    .from('sgo_saude_planos')
    .insert({ ...planoData, created_by: me.id, updated_by: me.id })
    .select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })

  // Inclui dependentes diretos no plano de saúde
  if (planoData.tipo === 'saude' && dependentes?.length) {
    await supabase.from('sgo_saude_dependentes').insert(
      dependentes.map((did: string) => ({
        plano_id: plano.id,
        dependente_id: did,
        data_inclusao: planoData.data_inclusao
      }))
    )
  }

  return plano
})
