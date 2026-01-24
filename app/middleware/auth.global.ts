export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('auth_token');
  const isAuthenticated = Boolean(token.value);

  if (isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    return navigateTo('/dashboard');
  }

  if (!isAuthenticated && (to.path === '/dashboard' || to.path.startsWith('/builder'))) {
    return navigateTo('/login');
  }
});
