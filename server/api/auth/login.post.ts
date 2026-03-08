import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const { email, senha } = await readBody(event);

  if (!email || !senha)
    throw createError({
      statusCode: 400,
      message: "E-mail e senha são obrigatórios.",
    });

  const config = useRuntimeConfig();
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_KEY;
  const serviceKey = config.supabaseServiceKey;

  if (!supabaseUrl || !anonKey || !serviceKey)
    throw createError({
      statusCode: 500,
      message: "Variáveis de ambiente não configuradas.",
    });

  // anon key — só para autenticar o usuário (valida credenciais)
  const supabaseAuth = createClient(supabaseUrl, anonKey);
  // service key — para buscar dados internos sem RLS
  const supabaseService = createClient(supabaseUrl, serviceKey);

  // Busca usuário na tabela SGO
  const { data: sgoUser, error: userErr } = await supabaseService
    .from("sgo_usuarios")
    .select(
      "id, nome, email, perfil, status, tentativas_login, primeiro_acesso",
    )
    .eq("email", email.toLowerCase().trim())
    .single();

  if (userErr || !sgoUser)
    throw createError({ statusCode: 401, message: "Credenciais inválidas." });

  if (sgoUser.status === "inativo")
    throw createError({
      statusCode: 403,
      message: "Usuário inativo. Contate o administrador.",
    });

  if (sgoUser.tentativas_login >= 5)
    throw createError({
      statusCode: 403,
      message: "Conta bloqueada após 5 tentativas. Contate o TI.",
    });

  // Autentica com anon key — o Supabase valida email + senha corretamente
  const { data: authData, error: authErr } =
    await supabaseAuth.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: senha,
    });

  if (authErr || !authData.session) {
    await supabaseService
      .from("sgo_usuarios")
      .update({ tentativas_login: sgoUser.tentativas_login + 1 })
      .eq("id", sgoUser.id);
    throw createError({ statusCode: 401, message: "Credenciais inválidas." });
  }

  // Busca capacidades
  const agora = new Date();
  const { data: caps } = await supabaseService
    .from("sgo_capacidades_usuario")
    .select("capacidade, revogada_em, validade")
    .eq("usuario_id", sgoUser.id)
    .is("revogada_em", null);

  const capacidades = (caps ?? [])
    .filter((c: any) => !(c.validade && new Date(c.validade) < agora))
    .map((c: any) => c.capacidade);

  await supabaseService
    .from("sgo_usuarios")
    .update({ tentativas_login: 0, ultimo_acesso: new Date().toISOString() })
    .eq("id", sgoUser.id);

  setCookie(event, "sgo-token", authData.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return {
    id: sgoUser.id,
    nome: sgoUser.nome,
    email: sgoUser.email,
    perfil: sgoUser.perfil,
    capacidades,
    primeiro_acesso: sgoUser.primeiro_acesso,
  };
});
