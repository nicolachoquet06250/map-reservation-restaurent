<script setup lang="ts">
definePageMeta({
  layout: false,
});

const currentStep = ref<1 | 2>(1);
const isStep1Completed = ref(false);
const isSubmitting = ref(false);

const formData = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  restaurantName: '',
  location: '',
  establishmentsCount: 1
});

const goToStep = (step: 1 | 2) => {
  if (step === 2 && !isStep1Completed.value) return;
  currentStep.value = step;
};

const completeStep1 = () => {
  if (formData.value.password !== formData.value.confirmPassword) {
    alert('Les mots de passe ne correspondent pas.');
    return;
  }
  isStep1Completed.value = true;
  currentStep.value = 2;
};

const handleRegister = async () => {
  isSubmitting.value = true;
  const Notify = (await import('simple-notify')).default;

  try {
    const response = await $fetch<{
      token: string,
      tokenType: 'Bearer',
      expiresAt: string,
      user: {
        id: number,
        email: string,
        name: string,
      },
    }>('/api/register', {
      method: 'POST',
      body: {
        name: formData.value.name,
        email: formData.value.email,
        password: formData.value.password,
        restaurantName: formData.value.restaurantName,
        locationName: formData.value.location,
      }
    });

    // Stockage du token
    const tokenCookie = useCookie('auth_token', {
      maxAge: 60 * 60 * 24,
      path: '/'
    });
    tokenCookie.value = response.token;

    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Compte créé',
      text: `Bienvenue, ${response.user.name}. Votre restaurant ${formData.value.restaurantName} est prêt.`,
      autoclose: true,
      autotimeout: 3000,
      position: 'right top',
    });

    await navigateTo('/dashboard');
  } catch (error: any) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: "Erreur d'inscription",
      text: error.data?.statusMessage || "Une erreur est survenue lors de l'inscription.",
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
        <button type="button" class="step" :class="{ active: currentStep === 2, disabled: !isStep1Completed }" @click="goToStep(2)" :disabled="!isStep1Completed">
          <span>2</span>Restaurant
        </button>
      </div>

      <form class="auth-form" @submit.prevent="handleRegister">
        <div v-if="currentStep === 1" class="form-block">
          <label class="field">
            <span>Nom complet</span>
            <input v-model="formData.name" type="text" placeholder="Camille Martin" autocomplete="name" required />
          </label>

          <label class="field">
            <span>Email professionnel</span>
            <input v-model="formData.email" type="email" placeholder="vous@restaurant.fr" autocomplete="email" required />
          </label>

          <label class="field">
            <span>Mot de passe</span>
            <input v-model="formData.password" type="password" placeholder="••••••••" autocomplete="new-password" required />
          </label>

          <label class="field">
            <span>Confirmer le mot de passe</span>
            <input v-model="formData.confirmPassword" type="password" placeholder="••••••••" autocomplete="new-password" required />
          </label>

          <button class="btn btn-primary" type="button" @click="completeStep1">
            Continuer
          </button>
        </div>

        <div v-else class="form-block">
          <label class="field">
            <span>Nom du restaurant</span>
            <input v-model="formData.restaurantName" type="text" placeholder="Le Jardin Urbain" required />
          </label>

          <label class="field">
            <span>Localisation principale</span>
            <input v-model="formData.location" type="text" placeholder="Paris - Rue Oberkampf" required />
          </label>

          <label class="field">
            <span>Nombre d'établissements (optionnel)</span>
            <input v-model="formData.establishmentsCount" type="number" min="1" placeholder="1" />
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
              {{ isSubmitting ? 'Création en cours...' : "Valider et recevoir le lien d'activation" }}
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

.step.disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
