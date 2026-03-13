import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  // Remove tudo que não é coluna de sgo_ccts
  const { funcoes, sgo_prestadoras, sgo_cct_funcoes, created_at, created_by, ...rest } = body

  const { data, error } = await supabase
    .from('sgo_ccts')
    .update({ ...rest, updated_by: me.id })
    .eq('id', id)
    .select('id, nome, prestadora_id, sindicato, numero_registro, data_inicio, data_fim, status, observacoes')
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })

  // Re-sincroniza funções
  if (funcoes !== undefined) {
    await supabase.from('sgo_cct_funcoes').delete().eq('cct_id', id)
    if (funcoes.length)
      await supabase.from('sgo_cct_funcoes').insert(
        funcoes.map((fid: string) => ({ cct_id: id, funcao_id: fid }))
      )
  }

  return data
})
