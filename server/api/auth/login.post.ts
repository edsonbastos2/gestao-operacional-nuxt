import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { email, senha } = await readBody(event)

  if (!email || !senha)
    throw createError({ statusCode: 400, message: 'E-mail e senha são obrigatórios.' })

  const config = useRuntimeConfig()
  const supabase = createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey)

  const { data: sgoUser, error: userErr } = await supabase
    .from('sgo_usuarios')
    .select('id, nome, email, perfil, status, tentativas_login, primeiro_acesso, sgo_capacidades_usuario(capacidade, revogada_em, validade)')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (userErr || !sgoUser)
    throw createError({ statusCode: 401, message: 'Credenciais inválidas.' })

  if (sgoUser.status === 'inativo')
    throw createError({ statusCode: 403, message: 'Usuário inativo. Contate o administrador.' })

  if (sgoUser.tentativas_login >= 5)
    throw createError({ statusCode: 403, message: 'Conta bloqueada após 5 tentativas. Contate o TI.' })

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password: senha,
  })

  if (authErr || !authData.session) {
    await supabase
      .from('sgo_usuarios')
      .update({ tentativas_login: sgoUser.tentativas_login + 1 })
      .eq('id', sgoUser.id)
    throw createError({ statusCode: 401, message: 'Credenciais inválidas.' })
  }

  await supabase
    .from('sgo_usuarios')
    .update({ tentativas_login: 0, ultimo_acesso: new Date().toISOString() })
    .eq('id', sgoUser.id)

  const agora = new Date()
  const capacidades = (sgoUser.sgo_capacidades_usuario ?? [])
    .filter((c: any) => !c.revogada_em && !(c.validade && new Date(c.validade) < agora))
    .map((c: any) => c.capacidade)

  setCookie(event, 'sgo-token', authData.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return {
    id: sgoUser.id,
    nome: sgoUser.nome,
    email: sgoUser.email,
    perfil: sgoUser.perfil,
    capacidades,
    primeiro_acesso: sgoUser.primeiro_acesso,
  }
})
