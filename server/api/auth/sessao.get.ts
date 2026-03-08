import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "sgo-token");
  if (!token) return null;

  const config = useRuntimeConfig();
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_KEY;
  const serviceKey = config.supabaseServiceKey;

  if (!supabaseUrl || !anonKey || !serviceKey) return null;

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: authErr,
    } = await supabaseAuth.auth.getUser(token);
    if (authErr || !user) {
      deleteCookie(event, "sgo-token");
      return null;
    }

    const supabaseService = createClient(supabaseUrl, serviceKey);

    // maybeSingle não quebra se vier mais de um ou nenhum resultado
    const { data: sgoUser } = await supabaseService
      .from("sgo_usuarios")
      .select("id, nome, email, perfil, status, primeiro_acesso")
      .eq("auth_user_id", user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();

    if (!sgoUser) {
      deleteCookie(event, "sgo-token");
      return null;
    }

    const agora = new Date();
    const { data: caps } = await supabaseService
      .from("sgo_capacidades_usuario")
      .select("capacidade, revogada_em, validade")
      .eq("usuario_id", sgoUser.id)
      .is("revogada_em", null);

    const capacidades = (caps ?? [])
      .filter((c: any) => !(c.validade && new Date(c.validade) < agora))
      .map((c: any) => c.capacidade);

    return {
      id: sgoUser.id,
      nome: sgoUser.nome,
      email: sgoUser.email,
      perfil: sgoUser.perfil,
      capacidades,
      primeiro_acesso: sgoUser.primeiro_acesso,
    };
  } catch {
    return null;
  }
});
