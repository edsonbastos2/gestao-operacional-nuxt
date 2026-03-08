export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  const publicas = ["/login", "/recuperar-senha", "/primeiro-acesso"];

  // Inicializa sempre que não estiver inicializado
  if (!auth.inicializado) await auth.inicializar();

  // Logado tentando acessar página pública → dashboard
  if (auth.isAutenticado && publicas.some((r) => to.path.startsWith(r))) {
    return navigateTo("/dashboard");
  }

  // Página pública → passa direto
  if (publicas.some((r) => to.path.startsWith(r))) return;

  // Não logado → login
  if (!auth.isAutenticado) {
    return navigateTo("/login");
  }
});
