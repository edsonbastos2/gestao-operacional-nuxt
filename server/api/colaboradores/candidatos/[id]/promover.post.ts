import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const candidato_id = getRouterParam(event, 'id')
  const body = await readBody(event)
  if (!body.data_admissao || !body.prestadora_id)
    throw createError({ statusCode: 400, message: 'Data de admissão e prestadora são obrigatórios.' })
  // Busca candidato para herdar dados
  const { data: cand } = await supabase.from('sgo_candidatos').select('*').eq('id', candidato_id).single()
  if (!cand) throw createError({ statusCode: 404, message: 'Candidato não encontrado.' })
  const { data: dup } = await supabase.from('sgo_colaboradores').select('id').eq('cpf', cand.cpf).maybeSingle()
  if (dup) throw createError({ statusCode: 409, message: 'Colaborador com este CPF já existe.' })
  const { data, error } = await supabase.from('sgo_colaboradores').insert({
    candidato_id, nome: cand.nome, cpf: cand.cpf, rg: cand.rg,
    data_nasc: cand.data_nasc, sexo: cand.sexo, email: cand.email, telefone: cand.telefone,
    cep: cand.cep, endereco: cand.endereco, cidade: cand.cidade, uf: cand.uf,
    ...body, created_by: me.id, updated_by: me.id
  }).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  // Atualizar status do candidato
  await supabase.from('sgo_candidatos').update({ status: 'aprovado', updated_by: me.id }).eq('id', candidato_id)
  return data
})
