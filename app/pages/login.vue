<script setup lang="ts">
definePageMeta({
  layout: false,
});

const isSubmitting = ref(false);
</script>

<template>
  <div class="auth-page">
    <section class="auth-card">
      <header>
        <p class="eyebrow">Accès restaurateur</p>
        <h1>Connectez-vous à votre espace.</h1>
        <p class="subtitle">Retrouvez vos plans, réservations et localisations en un seul endroit.</p>
      </header>

      <form class="auth-form" @submit.prevent="isSubmitting = true">
        <label class="field">
          <span>Email professionnel</span>
          <input type="email" placeholder="vous@restaurant.fr" autocomplete="email" required />
        </label>

        <label class="field">
          <span>Mot de passe</span>
          <input type="password" placeholder="••••••••" autocomplete="current-password" required />
        </label>

        <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
          Se connecter
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
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 56px);
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
