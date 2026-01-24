<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'

const token = useCookie('auth_token').value

const isSavingProfile = ref(false)
const isSendingCode = ref(false)
const isUpdatingPassword = ref(false)
const codeSent = ref(false)
const codeExpiresAt = ref<number | null>(null)

const profile = ref({
  fullName: '',
  email: '',
  restaurantName: '',
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  verificationCode: '',
})

const initials = computed(() => {
  const parts = profile.value.fullName.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'RB'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
})

const { data: profileData, pending: profilePending, error: profileError } = await useFetch('/api/profile', {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
})

watchEffect(() => {
  if (profileData.value) {
    profile.value.fullName = profileData.value.name
    profile.value.email = profileData.value.email
    profile.value.restaurantName = profileData.value.restaurantName
  }
})

const handleProfileSave = async () => {
  const Notify = (await import('simple-notify')).default
  if (!token) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Session expirée',
      text: 'Veuillez vous reconnecter pour modifier votre profil.',
      autoclose: true,
      autotimeout: 3000,
      position: 'right top',
      customClass: 'custom-notify'
    })
    return
  }

  if (!profile.value.fullName.trim() || !profile.value.email.trim()) {
    // @ts-ignore
    new Notify({
      status: 'warning',
      title: 'Champs obligatoires',
      text: 'Le nom et l’email sont requis.',
      autoclose: true,
      autotimeout: 3000,
      position: 'right top',
      customClass: 'custom-notify'
    })
    return
  }

  isSavingProfile.value = true
  try {
    const response = await $fetch('/api/profile', {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        name: profile.value.fullName,
        email: profile.value.email,
        restaurantName: profile.value.restaurantName,
      },
    })

    profile.value.fullName = response.name
    profile.value.email = response.email
    profile.value.restaurantName = response.restaurantName

    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Profil mis à jour',
      text: 'Vos informations personnelles ont été enregistrées.',
      autoclose: true,
      autotimeout: 2500,
      position: 'right top',
      customClass: 'custom-notify'
    })
  } catch (error: any) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Mise à jour impossible',
      text: error?.data?.statusMessage || 'Une erreur est survenue.',
      autoclose: true,
      autotimeout: 3500,
      position: 'right top',
      customClass: 'custom-notify'
    })
  } finally {
    isSavingProfile.value = false
  }
}

const handleSendCode = async () => {
  const Notify = (await import('simple-notify')).default
  if (!token) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Session expirée',
      text: 'Veuillez vous reconnecter pour recevoir un code.',
      autoclose: true,
      autotimeout: 3000,
      position: 'right top',
      customClass: 'custom-notify'
    })
    return
  }

  isSendingCode.value = true
  try {
    const response = await $fetch<{
      sent: boolean,
      expiresAt: number,
      email: string,
    }>('/api/profile/password-code', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    codeSent.value = true
    codeExpiresAt.value = response.expiresAt
    passwordForm.value.verificationCode = ''

    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Code envoyé',
      text: `Un code de validation a été envoyé à ${response.email}.`,
      autoclose: true,
      autotimeout: 2500,
      position: 'right top',
      customClass: 'custom-notify'
    })
  } catch (error: any) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Envoi impossible',
      text: error?.data?.statusMessage || 'Impossible d’envoyer le code.',
      autoclose: true,
      autotimeout: 3500,
      position: 'right top',
      customClass: 'custom-notify'
    })
  } finally {
    isSendingCode.value = false
  }
}

const handlePasswordUpdate = async () => {
  const Notify = (await import('simple-notify')).default
  if (!token) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Session expirée',
      text: 'Veuillez vous reconnecter pour modifier le mot de passe.',
      autoclose: true,
      autotimeout: 3000,
      position: 'right top',
      customClass: 'custom-notify'
    })
    return
  }

  const { currentPassword, newPassword, confirmPassword, verificationCode } = passwordForm.value

  if (!codeSent.value) {
    // @ts-ignore
    new Notify({
      status: 'warning',
      title: 'Validation requise',
      text: 'Veuillez demander un code de validation par email.',
      autoclose: true,
      autotimeout: 3000,
      position: 'right top',
      customClass: 'custom-notify'
    })
    return
  }

  if (newPassword.length < 8 || newPassword !== confirmPassword) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Mot de passe invalide',
      text: 'Le mot de passe doit contenir 8 caractères minimum et correspondre à la confirmation.',
      autoclose: true,
      autotimeout: 3500,
      position: 'right top',
      customClass: 'custom-notify'
    })
    return
  }

  if (!/^\d{6}$/.test(verificationCode)) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Code incorrect',
      text: 'Le code de validation doit contenir 6 chiffres.',
      autoclose: true,
      autotimeout: 3500,
      position: 'right top',
      customClass: 'custom-notify'
    })
    return
  }

  isUpdatingPassword.value = true
  try {
    await $fetch('/api/profile/password', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        currentPassword,
        newPassword,
        code: verificationCode,
      },
    })

    passwordForm.value.currentPassword = ''
    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
    passwordForm.value.verificationCode = ''
    codeSent.value = false
    codeExpiresAt.value = null

    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Mot de passe mis à jour',
      text: 'Votre mot de passe a bien été modifié.',
      autoclose: true,
      autotimeout: 2500,
      position: 'right top',
      customClass: 'custom-notify'
    })
  } catch (error: any) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Mise à jour impossible',
      text: error?.data?.statusMessage || 'Une erreur est survenue.',
      autoclose: true,
      autotimeout: 3500,
      position: 'right top',
      customClass: 'custom-notify'
    })
  } finally {
    isUpdatingPassword.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <header class="profile-hero">
      <div>
        <p class="eyebrow">Espace personnel</p>
        <h1>Mon profil</h1>
        <p class="subtitle">Mettez à jour vos informations et sécurisez votre compte.</p>
      </div>
    </header>

    <div class="profile-grid">
      <section class="panel">
        <header>
          <h2>Informations personnelles</h2>
          <p>Ces informations sont utilisées pour gérer votre compte et vos notifications.</p>
        </header>

        <div v-if="profilePending" class="status">Chargement des informations...</div>
        <div v-else-if="profileError" class="status error">
          Impossible de récupérer votre profil. Veuillez vous reconnecter.
        </div>

        <form v-else class="form-grid" @submit.prevent="handleProfileSave">
          <label class="field">
            <span>Nom complet</span>
            <input v-model="profile.fullName" type="text" placeholder="Votre nom" />
          </label>
          <label class="field">
            <span>Email professionnel</span>
            <input v-model="profile.email" type="email" placeholder="vous@restaurant.fr" />
          </label>

          <div class="form-actions">
            <button class="btn btn-primary" type="submit" :disabled="isSavingProfile">
              {{ isSavingProfile ? 'Enregistrement...' : 'Enregistrer les modifications' }}
            </button>
          </div>
        </form>
      </section>

      <section class="panel security-panel">
        <header>
          <h2>Sécurité &amp; mot de passe</h2>
          <p>Une confirmation par email est requise pour finaliser la modification du mot de passe.</p>
        </header>

        <form class="form-grid" @submit.prevent="handlePasswordUpdate">
          <label class="field full">
            <span>Mot de passe actuel</span>
            <input v-model="passwordForm.currentPassword" type="password" placeholder="••••••••" />
          </label>
          <label class="field">
            <span>Nouveau mot de passe</span>
            <input v-model="passwordForm.newPassword" type="password" placeholder="Minimum 8 caractères" />
          </label>
          <label class="field">
            <span>Confirmer le nouveau mot de passe</span>
            <input v-model="passwordForm.confirmPassword" type="password" placeholder="Répétez le mot de passe" />
          </label>
          <label class="field full">
            <span>Code de validation (email)</span>
            <div class="code-row">
              <input
                v-model="passwordForm.verificationCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="000000"
              />
              <button class="btn btn-secondary" type="button" :disabled="isSendingCode" @click="handleSendCode">
                {{ isSendingCode ? 'Envoi...' : codeSent ? 'Renvoyer le code' : 'Envoyer le code' }}
              </button>
            </div>
            <small v-if="codeSent">
              Un code a été envoyé. Il expire à
              {{ codeExpiresAt ? new Date(codeExpiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '' }}.
            </small>
          </label>

          <div class="form-actions">
            <button class="btn btn-primary" type="submit" :disabled="isUpdatingPassword">
              {{ isUpdatingPassword ? 'Mise à jour...' : 'Mettre à jour le mot de passe' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  flex: 1;
  overflow-y: auto;
  background: #f8fafc;
  padding: 2.5rem 6vw 4rem;
}

.profile-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2563eb;
}

.subtitle {
  margin-top: 0.75rem;
  color: #475569;
  max-width: 520px;
}

.profile-card__text strong {
  font-size: 0.9rem;
  color: #0f172a;
}

.profile-card__text span {
  font-size: 0.75rem;
  color: #64748b;
}

.profile-grid {
  display: grid;
  gap: 1.75rem;
}

.panel {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.5rem;
}

.panel header h2 {
  margin-bottom: 0.35rem;
}

.panel header p {
  color: #475569;
  font-size: 0.95rem;
}

.status {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
}

.status.error {
  background: #fee2e2;
  color: #b91c1c;
}

.form-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

.field input {
  border-radius: 12px;
  border: 1px solid #d1d5db;
  padding: 0.75rem 0.9rem;
  font-size: 0.95rem;
  width: 100%;
}

.field.full {
  grid-column: 1 / -1;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
}

.code-row {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(140px, 1fr) auto;
  align-items: center;
}

.field small {
  font-size: 0.8rem;
  color: #64748b;
}

.security-panel {
  border: 1px solid rgba(37, 99, 235, 0.2);
}

@media (max-width: 720px) {
  .profile-hero {
    flex-direction: column;
  }

  .form-actions {
    justify-content: stretch;
  }
}
</style>
