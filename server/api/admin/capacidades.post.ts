import { getUsuarioAutenticado } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, "ti_admin");
  const { usuario_id, capacidade, justificativa, validade } =
    await readBody(event);

  if (!usuario_id || !capacidade || !justificativa || justificativa.length < 10)
    throw createError({
      statusCode: 400,
      message:
        "Campos obrigatórios: usuario_id, capacidade, justificativa (mín. 10 chars).",
    });

  await supabase
    .from("sgo_capacidades_usuario")
    .update({ revogada_em: new Date().toISOString(), revogada_por: me.id })
    .eq("usuario_id", usuario_id)
    .eq("capacidade", capacidade)
    .is("revogada_em", null);

  const { data: nova, error } = await supabase
    .from("sgo_capacidades_usuario")
    .insert({
      usuario_id,
      capacidade,
      gerente_id: me.id,
      justificativa: justificativa.trim(),
      validade: validade || null,
    })
    .select(
      "id, usuario_id, capacidade, gerente_id, justificativa, validade, revogada_em, created_at",
    )
    .single();

  if (error) throw createError({ statusCode: 500, message: error.message });

  await supabase.rpc("fn_audit", {
    p_entidade: "sgo_capacidades_usuario",
    p_entidade_id: nova!.id,
    p_acao: "C",
    p_usuario_id: me.id,
    p_usuario_nome: me.nome,
    p_depois: nova,
    p_justificativa: justificativa,
  });

  return { ...nova, gerente_nome: me.nome };
});
