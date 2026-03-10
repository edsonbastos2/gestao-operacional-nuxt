import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const id = getRouterParam(event, 'id')
  const { status, justificativa } = await readBody(event)
  const allowed = ['ativo','inativo','reserva','desligado','afastado']
  if (!allowed.includes(status)) throw createError({ statusCode: 400, message: 'Status inválido.' })
  if (!justificativa?.trim()) throw createError({ statusCode: 400, message: 'Justificativa obrigatória.' })
  const updateData: any = { status, updated_by: me.id }
  if (status === 'desligado') updateData.data_demissao = new Date().toISOString().split('T')[0]
  await supabase.from('sgo_colaboradores').update(updateData).eq('id', id)
  return { status }
})
