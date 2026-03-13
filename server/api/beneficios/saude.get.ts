import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  if (!q.colaborador_id) throw createError({ statusCode: 400, message: 'colaborador_id é obrigatório.' })
  const { data, error } = await supabase
    .from('sgo_saude_planos')
    .select('*, sgo_beneficio_fornecedores(id,nome), sgo_saude_dependentes(*, sgo_dependentes(id,nome,parentesco,cpf))')
    .eq('colaborador_id', q.colaborador_id as string)
    .order('data_inclusao', { ascending: false })
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [] }
})
