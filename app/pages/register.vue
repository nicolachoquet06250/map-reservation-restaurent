<script setup lang="ts">
definePageMeta({
  layout: false,
});

const currentStep = ref<1 | 2>(1);
const isSubmitting = ref(false);

const goToStep = (step: 1 | 2) => {
  currentStep.value = step;
};
</script>

<template>
  <div class="auth-page">
    <section class="auth-card">
      <header>
        <p class="eyebrow">Démarrage SaaS</p>
        <h1>Créez votre compte restaurateur.</h1>
        <p class="subtitle">
          L'inscription se fait en deux étapes : d'abord votre compte, puis le restaurant qui y sera
          automatiquement lié.
        </p>
      </header>

      <div class="steps">
        <button type="button" class="step" :class="{ active: currentStep === 1 }" @click="goToStep(1)">
          <span>1</span>Compte restaurateur
        </button>
        <button type="button" class="step" :class="{ active: currentStep === 2 }" @click="goToStep(2)">
          <span>2</span>Restaurant
        </button>
      </div>

      <form class="auth-form" @submit.prevent="isSubmitting = true">
        <div v-if="currentStep === 1" class="form-block">
          <label class="field">
            <span>Nom complet</span>
            <input type="text" placeholder="Camille Martin" autocomplete="name" required />
          </label>

          <label class="field">
            <span>Email professionnel</span>
            <input type="email" placeholder="vous@restaurant.fr" autocomplete="email" required />
          </label>

          <label class="field">
            <span>Mot de passe</span>
            <input type="password" placeholder="••••••••" autocomplete="new-password" required />
          </label>

          <label class="field">
            <span>Confirmer le mot de passe</span>
            <input type="password" placeholder="••••••••" autocomplete="new-password" required />
          </label>

          <button class="btn btn-primary" type="button" @click="goToStep(2)">
            Continuer
          </button>
        </div>

        <div v-else class="form-block">
          <label class="field">
            <span>Nom du restaurant</span>
            <input type="text" placeholder="Le Jardin Urbain" required />
          </label>

          <label class="field">
            <span>Localisation principale</span>
            <input type="text" placeholder="Paris - Rue Oberkampf" required />
          </label>

          <label class="field">
            <span>Nombre d'établissements (optionnel)</span>
            <input type="number" min="1" placeholder="1" />
          </label>

          <div class="activation-box">
            <strong>Activation du compte</strong>
            <p>
              Une fois ce formulaire validé, vous recevrez un e-mail avec un lien d'activation.
              L'espace restaurateur sera activé dès que vous cliquerez sur ce lien.
            </p>
          </div>

          <div class="actions">
            <button class="btn btn-secondary" type="button" @click="goToStep(1)">
              Retour
            </button>
            <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
              Valider et recevoir le lien d'activation
            </button>
          </div>
        </div>
      </form>

      <footer class="auth-footer">
        <p>
          Déjà inscrit ?
          <NuxtLink to="/login">Se connecter</NuxtLink>
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
  width: min(560px, 100%);
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

.steps {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.step {
  border: 1px solid #d1d5db;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}

.step span {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: white;
  border: 1px solid #d1d5db;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
}

.step.active {
  background: #2563eb;
  color: white;
  border-color: #1d4ed8;
}

.step.active span {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: white;
}

.auth-form {
  display: grid;
  gap: 1.5rem;
}

.form-block {
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

.activation-box {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 1rem;
  color: #334155;
}

.activation-box strong {
  display: block;
  margin-bottom: 0.35rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
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
