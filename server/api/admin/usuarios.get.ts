import { getUsuarioAutenticado } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, "ti_admin");

  const query = getQuery(event);
  const page = Number(query.page ?? 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("sgo_usuarios")
    .select(
      "id, nome, email, login, perfil, status, primeiro_acesso, tentativas_login, ultimo_acesso, created_at",
      { count: "exact" },
    )
    .order("nome")
    .range(from, to);

  if (query.q) q = q.ilike("nome", `%${query.q}%`);
  if (query.perfil) q = q.eq("perfil", query.perfil as string);
  if (query.status) q = q.eq("status", query.status as string);

  const { data: usuarios, count, error } = await q;
  if (error) throw createError({ statusCode: 500, message: error.message });

  // Busca capacidades separadamente
  const ids = (usuarios ?? []).map((u) => u.id);
  const { data: caps } = ids.length
    ? await supabase
        .from("sgo_capacidades_usuario")
        .select(
          "id, usuario_id, capacidade, gerente_id, justificativa, validade, revogada_em, created_at",
        )
        .in("usuario_id", ids)
    : { data: [] };

  return {
    data: (usuarios ?? []).map((u) => ({
      ...u,
      capacidades: (caps ?? []).filter((c) => c.usuario_id === u.id),
    })),
    total: count ?? 0,
  };
});
