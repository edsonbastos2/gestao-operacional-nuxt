import { getUsuarioAutenticado } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, "ti_admin");
  const id = getRouterParam(event, "id");

  const { data: antes } = await supabase
    .from("sgo_usuarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!antes)
    throw createError({ statusCode: 404, message: "Usuário não encontrado." });

  const {
    nome,
    perfil,
    escopo_tomador_ids,
    escopo_posto_ids,
    escopo_turno_ids,
  } = await readBody(event);

  const { data: atualizado, error } = await supabase
    .from("sgo_usuarios")
    .update({
      nome,
      perfil,
      escopo_tomador_ids,
      escopo_posto_ids,
      escopo_turno_ids,
      updated_by: me.id,
    })
    .eq("id", id)
    .select(
      "id, nome, email, login, perfil, status, primeiro_acesso, tentativas_login, ultimo_acesso, created_at",
    )
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });

  await supabase.rpc("fn_audit", {
    p_entidade: "sgo_usuarios",
    p_entidade_id: id,
    p_acao: "E",
    p_usuario_id: me.id,
    p_usuario_nome: me.nome,
    p_antes: antes,
    p_depois: atualizado,
  });

  // Busca capacidades separadamente
  const { data: caps } = await supabase
    .from("sgo_capacidades_usuario")
    .select(
      "id, usuario_id, capacidade, gerente_id, justificativa, validade, revogada_em, created_at",
    )
    .eq("usuario_id", id);

  return { ...atualizado, capacidades: caps ?? [] };
});
