import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const body = await readBody(event)
  if (!body.prestadora_id || !body.nome || !body.data_inicio)
    throw createError({ statusCode: 400, message: 'Prestadora, nome e data de início são obrigatórios.' })
  // Remove funcoes do payload — não é coluna de sgo_ccts
  const { funcoes, ...cctData } = body

  const { data, error } = await supabase
    .from('sgo_ccts')
    .insert({ ...cctData, created_by: me.id, updated_by: me.id })
    .select('*, sgo_prestadoras(id,razao_social,nome_fantasia)')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })

  // Vincula funções na tabela de relacionamento
  if (funcoes?.length) {
    const { error: errFn } = await supabase.from('sgo_cct_funcoes').insert(
      funcoes.map((fid: string) => ({ cct_id: data.id, funcao_id: fid }))
    )
    if (errFn) throw createError({ statusCode: 500, message: errFn.message })
  }
  return data
})