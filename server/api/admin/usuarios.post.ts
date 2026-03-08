import { getUsuarioAutenticado } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, "ti_admin");

  const body = await readBody(event);
  const {
    nome,
    email,
    login,
    perfil,
    escopo_tomador_ids,
    escopo_posto_ids,
    escopo_turno_ids,
  } = body;

  if (!nome || !email || !login || !perfil)
    throw createError({
      statusCode: 400,
      message: "Campos obrigatórios: nome, email, login, perfil.",
    });

  if (perfil === "supervisor_externo" && !escopo_tomador_ids?.length)
    throw createError({
      statusCode: 400,
      message: "Supervisor externo requer escopo de tomadores.",
    });

  const { data: dup } = await supabase
    .from("sgo_usuarios")
    .select("id")
    .or(`email.eq.${email.toLowerCase()},login.eq.${login.toLowerCase()}`)
    .maybeSingle();
  if (dup)
    throw createError({
      statusCode: 409,
      message: "E-mail ou login já cadastrado.",
    });

  const senhaTemp = Math.random().toString(36).slice(-10) + "A1!";
  const { data: authUser, error: authErr } =
    await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: senhaTemp,
      email_confirm: true,
    });
  if (authErr || !authUser.user)
    throw createError({
      statusCode: 500,
      message: "Erro ao criar usuário no Auth.",
    });

  const { data: novo, error: insErr } = await supabase
    .from("sgo_usuarios")
    .insert({
      auth_user_id: authUser.user.id,
      nome,
      email: email.toLowerCase(),
      login: login.toLowerCase(),
      perfil,
      status: "ativo",
      primeiro_acesso: true,
      escopo_tomador_ids: escopo_tomador_ids ?? null,
      escopo_posto_ids: escopo_posto_ids ?? null,
      escopo_turno_ids: escopo_turno_ids ?? null,
      created_by: me.id,
      updated_by: me.id,
    })
    .select(
      "id, nome, email, login, perfil, status, primeiro_acesso, tentativas_login, ultimo_acesso, created_at",
    )
    .single();

  if (insErr) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw createError({ statusCode: 500, message: "Erro ao salvar usuário." });
  }

  await supabase.rpc("fn_audit", {
    p_entidade: "sgo_usuarios",
    p_entidade_id: novo!.id,
    p_acao: "C",
    p_usuario_id: me.id,
    p_usuario_nome: me.nome,
    p_depois: novo,
  });

  return { ...novo, capacidades: [], _senha_temp: senhaTemp };
});
