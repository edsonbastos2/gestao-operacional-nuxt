import { getUsuarioAutenticado } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, "ti_admin");
  const id = getRouterParam(event, "id");

  const { data: alvo } = await supabase
    .from("sgo_usuarios")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!alvo?.auth_user_id) throw createError({ statusCode: 404 });

  const senhaTemp = Math.random().toString(36).slice(-10) + "A1!";
  await supabase.auth.admin.updateUserById(alvo.auth_user_id, {
    password: senhaTemp,
  });
  await supabase
    .from("sgo_usuarios")
    .update({ primeiro_acesso: true, updated_by: me.id })
    .eq("id", id);

  await supabase.rpc("fn_audit", {
    p_entidade: "sgo_usuarios",
    p_entidade_id: id,
    p_acao: "E",
    p_usuario_id: me.id,
    p_usuario_nome: me.nome,
    p_justificativa: "Reset de senha pelo administrador.",
  });

  return { senha_temp: senhaTemp };
});
