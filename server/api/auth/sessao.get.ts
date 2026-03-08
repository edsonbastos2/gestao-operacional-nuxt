import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sgo-token')
  if (!token) return null

  const config = useRuntimeConfig()
  const supabase = createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey)

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) { deleteCookie(event, 'sgo-token'); return null }

  const { data: sgoUser } = await supabase
    .from('sgo_usuarios')
    .select('id, nome, email, perfil, status, primeiro_acesso, sgo_capacidades_usuario(capacidade, revogada_em, validade)')
    .eq('auth_user_id', user.id)
    .eq('status', 'ativo')
    .single()

  if (!sgoUser) { deleteCookie(event, 'sgo-token'); return null }

  const agora = new Date()
  const capacidades = (sgoUser.sgo_capacidades_usuario ?? [])
    .filter((c: any) => !c.revogada_em && !(c.validade && new Date(c.validade) < agora))
    .map((c: any) => c.capacidade)

  return { id: sgoUser.id, nome: sgoUser.nome, email: sgoUser.email, perfil: sgoUser.perfil, capacidades, primeiro_acesso: sgoUser.primeiro_acesso }
})
