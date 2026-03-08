export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const auth = useAuthStore()
  const publicas = ['/login', '/recuperar-senha']

  if (publicas.some(r => to.path.startsWith(r))) return

  if (!auth.inicializado) await auth.inicializar()

  if (!auth.isAutenticado) return navigateTo('/login')

  if (auth.isPrimeiroAcesso && to.path !== '/primeiro-acesso') {
    return navigateTo('/primeiro-acesso')
  }
})
