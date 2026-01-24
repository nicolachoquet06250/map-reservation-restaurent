<script setup lang="ts">
definePageMeta({
  layout: false,
});

const isSubmitting = ref(false);

const email = ref('');
const password = ref('');

const handleLogin = async () => {
  isSubmitting.value = true;
  const Notify = (await import('simple-notify')).default;
  
  try {
    const response = await $fetch('/api/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    });

    // Stockage du token
    const tokenCookie = useCookie('auth_token', {
      maxAge: 60 * 60 * 24, // On peut l'ajuster selon le TTL
      path: '/'
    });
    tokenCookie.value = response.token;

    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Connexion réussie',
      text: `Bienvenue, ${response.user.name}`,
      autoclose: true,
      autotimeout: 2000,
      position: 'right top',
    });

    await navigateTo('/dashboard');
  } catch (error: any) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Erreur de connexion',
      text: error.data?.statusMessage || 'Une erreur est survenue lors de la connexion.',
      autoclose: true,
      autotimeout: 4000,
      position: 'right top',
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="auth-wrapper">
    <LandingHeader />
    <div class="auth-page">
      <section class="auth-card">
      <header>
        <p class="eyebrow">Accès restaurateur</p>
        <h1>Connectez-vous à votre espace.</h1>
        <p class="subtitle">Retrouvez vos plans, réservations et localisations en un seul endroit.</p>
      </header>

      <form class="auth-form" @submit.prevent="handleLogin">
        <label class="field">
          <span>Email professionnel</span>
          <input 
            v-model="email"
            type="email" 
            placeholder="vous@restaurant.fr" 
            autocomplete="email" 
            required 
          />
        </label>

        <label class="field">
          <span>Mot de passe</span>
          <input 
            v-model="password"
            type="password" 
            placeholder="••••••••" 
            autocomplete="current-password" 
            required 
          />
        </label>

        <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>

      <footer class="auth-footer">
        <p>
          Pas encore de compte ?
          <NuxtLink to="/register">Créer un compte restaurateur</NuxtLink>
        </p>
      </footer>
    </section>
    </div>
  </div>
</template>

<style scoped>

.auth-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.auth-page {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 3rem 1.5rem;
}

.auth-card {
  background: white;
  width: min(460px, 100%);
  padding: 2.5rem;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  display: grid;
  gap: 2rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2563eb;
}

.subtitle {
  color: #475569;
  margin-top: 0.75rem;
}

.auth-form {
  display: grid;
  gap: 1.25rem;
}

.field {
  display: grid;
  gap: 0.5rem;
  font-weight: 600;
  color: #1f2937;
}

.field span {
  font-size: 0.9rem;
}

input {
  border-radius: 10px;
  border: 1px solid #d1d5db;
  padding: 0.75rem 0.9rem;
  font-size: 0.95rem;
}

.auth-footer {
  font-size: 0.9rem;
  color: #475569;
}

.auth-footer a {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}
</style>
