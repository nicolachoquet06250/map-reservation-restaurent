<script setup lang="ts">
definePageMeta({
  layout: false,
});

const route = useRoute();
const token = computed(() => {
  const value = route.query.token;
  return typeof value === 'string' ? value : '';
});
</script>

<template>
  <div class="auth-wrapper">
    <LandingHeader />
    <div class="auth-page">
      <section class="auth-card">
        <header>
          <p class="eyebrow">Activation du compte</p>
          <h1>Votre espace restaurateur est prêt.</h1>
          <p class="subtitle">
            {{ token
              ? "Merci d'avoir confirmé votre adresse e-mail. Vous pouvez désormais vous connecter et finaliser votre profil."
              : "Ajoutez votre lien d'activation pour finaliser la création du compte restaurateur." }}
          </p>
        </header>

        <div class="activation-state" :class="{ missing: !token }">
          <span class="dot"></span>
          <div>
            <strong>{{ token ? 'Activation confirmée' : 'Lien manquant' }}</strong>
            <p>
              {{ token
                ? "Votre compte est activé. Pensez à garder vos identifiants en lieu sûr."
                : "Ouvrez l'e-mail de bienvenue pour accéder au lien d'activation. Il ressemble à https://votresite/activate?token=..." }}
            </p>
          </div>
        </div>

        <div class="actions">
          <NuxtLink class="btn btn-primary" to="/login">Accéder à mon espace</NuxtLink>
          <NuxtLink class="btn btn-secondary" to="/register">Créer un autre compte</NuxtLink>
        </div>
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
  width: min(520px, 100%);
  padding: 2.75rem;
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

.activation-state {
  display: flex;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 16px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
  color: #1e3a8a;
}

.activation-state.missing {
  border-color: #fee2e2;
  background: #fef2f2;
  color: #991b1b;
}

.activation-state .dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  margin-top: 0.35rem;
  background: #2563eb;
  flex-shrink: 0;
}

.activation-state.missing .dot {
  background: #ef4444;
}

.activation-state strong {
  display: block;
  margin-bottom: 0.35rem;
}

.activation-state p {
  margin: 0;
  color: inherit;
}

.actions {
  display: grid;
  gap: 0.75rem;
}

.btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-weight: 600;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-secondary {
  background: #e2e8f0;
  color: #1f2937;
}

@media (min-width: 640px) {
  .actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
