import { getUsuarioAutenticado } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, "ti_admin");
  const id = getRouterParam(event, "id");
  const { justificativa } = await readBody(event);

  await supabase
    .from("sgo_capacidades_usuario")
    .update({ revogada_em: new Date().toISOString(), revogada_por: me.id })
    .eq("id", id);

  await supabase.rpc("fn_audit", {
    p_entidade: "sgo_capacidades_usuario",
    p_entidade_id: id,
    p_acao: "D",
    p_usuario_id: me.id,
    p_usuario_nome: me.nome,
    p_justificativa: justificativa ?? "Revogação pelo administrador.",
  });

  return { success: true };
});
