import { getUsuarioAutenticado } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, "ti_admin");
  const id = getRouterParam(event, "id");
  const { justificativa } = await readBody(event);

  if (!justificativa || justificativa.trim().length < 10)
    throw createError({
      statusCode: 400,
      message: "Justificativa obrigatória (mín. 10 caracteres).",
    });

  const { data: alvo } = await supabase
    .from("sgo_usuarios")
    .select("id, status, nome")
    .eq("id", id)
    .maybeSingle();
  if (!alvo) throw createError({ statusCode: 404 });
  if (alvo.id === me.id)
    throw createError({
      statusCode: 400,
      message: "Não é possível inativar seu próprio usuário.",
    });

  const novoStatus = alvo.status === "ativo" ? "inativo" : "ativo";

  await supabase
    .from("sgo_usuarios")
    .update({
      status: novoStatus,
      cancelled_at: novoStatus === "inativo" ? new Date().toISOString() : null,
      cancelled_by: novoStatus === "inativo" ? me.id : null,
      cancellation_reason:
        novoStatus === "inativo" ? justificativa.trim() : null,
      updated_by: me.id,
    })
    .eq("id", id);

  await supabase.rpc("fn_audit", {
    p_entidade: "sgo_usuarios",
    p_entidade_id: id,
    p_acao: novoStatus === "inativo" ? "D" : "A",
    p_usuario_id: me.id,
    p_usuario_nome: me.nome,
    p_justificativa: justificativa.trim(),
    p_depois: { status: novoStatus },
  });

  return { status: novoStatus };
});
