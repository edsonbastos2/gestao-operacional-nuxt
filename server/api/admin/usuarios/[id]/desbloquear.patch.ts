import { getUsuarioAutenticado } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, "ti_admin");
  const id = getRouterParam(event, "id");

  await supabase
    .from("sgo_usuarios")
    .update({ tentativas_login: 0, bloqueado_em: null, updated_by: me.id })
    .eq("id", id);

  await supabase.rpc("fn_audit", {
    p_entidade: "sgo_usuarios",
    p_entidade_id: id,
    p_acao: "E",
    p_usuario_id: me.id,
    p_usuario_nome: me.nome,
    p_justificativa: "Desbloqueio manual pelo administrador.",
  });

  return { success: true };
});
