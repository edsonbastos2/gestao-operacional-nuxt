import { createClient } from "@supabase/supabase-js";
import type { H3Event } from "h3";

export function useSupabaseService() {
  const config = useRuntimeConfig();
  return createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey);
}

export function useSupabaseAnon() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
}

// Valida token e retorna o usuário SGO — lança 401/403 se inválido
export async function getUsuarioAutenticado(
  event: H3Event,
  perfilRequerido?: string,
) {
  const token = getCookie(event, "sgo-token");
  if (!token)
    throw createError({ statusCode: 401, message: "Não autenticado." });

  const {
    data: { user },
    error,
  } = await useSupabaseAnon().auth.getUser(token);
  if (error || !user)
    throw createError({ statusCode: 401, message: "Sessão inválida." });

  const supabase = useSupabaseService();
  const { data: me } = await supabase
    .from("sgo_usuarios")
    .select("id, nome, perfil, status")
    .eq("auth_user_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();

  if (!me)
    throw createError({ statusCode: 401, message: "Usuário não encontrado." });
  if (perfilRequerido && me.perfil !== perfilRequerido)
    throw createError({ statusCode: 403, message: "Acesso negado." });

  return { me, supabase };
}
