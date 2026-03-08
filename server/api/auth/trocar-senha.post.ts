import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sgo-token')
  if (!token) throw createError({ statusCode: 401, message: 'Não autenticado.' })

  const { nova_senha, confirmar_senha } = await readBody(event)
  if (!nova_senha || nova_senha.length < 8)
    throw createError({ statusCode: 400, message: 'Senha deve ter pelo menos 8 caracteres.' })
  if (nova_senha !== confirmar_senha)
    throw createError({ statusCode: 400, message: 'Senhas não coincidem.' })

  const config = useRuntimeConfig()
  const supabase = createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw createError({ statusCode: 401, message: 'Sessão inválida.' })

  const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, { password: nova_senha })
  if (updErr) throw createError({ statusCode: 500, message: 'Erro ao atualizar senha.' })

  await supabase.from('sgo_usuarios').update({ primeiro_acesso: false }).eq('auth_user_id', user.id)
  return { success: true }
})
