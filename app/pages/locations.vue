<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'

const token = useCookie('auth_token').value;

const { data: locations, refresh: refreshLocations } = await useFetch('/api/locations', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const isModalOpen = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const currentLocationId = ref<number | null>(null);

const locationForm = ref({
  name: '',
  addressLine: '',
  city: '',
  postalCode: '',
  country: 'France',
  phone: ''
});

const openCreateModal = () => {
  isEditing.value = false;
  currentLocationId.value = null;
  locationForm.value = {
    name: '',
    addressLine: '',
    city: '',
    postalCode: '',
    country: 'France',
    phone: ''
  };
  isModalOpen.value = true;
};

const openEditModal = (location: any) => {
  isEditing.value = true;
  currentLocationId.value = location.id;
  locationForm.value = {
    name: location.name,
    addressLine: location.addressLine || '',
    city: location.city || '',
    postalCode: location.postalCode || '',
    country: location.country || 'France',
    phone: location.phone || ''
  };
  isModalOpen.value = true;
};

const handleSave = async () => {
  isSubmitting.value = true;
  const Notify = (await import('simple-notify')).default;

  try {
    const url = isEditing.value 
      ? `/api/locations?id=${currentLocationId.value}` 
      : '/api/locations';
    
    const method = isEditing.value ? 'PUT' : 'POST';

    await $fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: locationForm.value
    });

    // @ts-ignore
    new Notify({
      status: 'success',
      title: isEditing.value ? 'Lieu mis à jour' : 'Lieu créé',
      text: `L'établissement ${locationForm.value.name} a été enregistré avec succès.`,
      autoclose: true,
      autotimeout: 3000,
      position: 'right top',
    });

    isModalOpen.value = false;
    await refreshLocations();
  } catch (error: any) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: error.data?.statusMessage || 'Une erreur est survenue.',
      autoclose: true,
      autotimeout: 4000,
      position: 'right top',
    });
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = async (id: number) => {
  if (!confirm('Voulez-vous vraiment supprimer cet établissement ?')) return;

  const Notify = (await import('simple-notify')).default;

  try {
    await $fetch(`/api/locations?id=${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Lieu supprimé',
      autoclose: true,
      autotimeout: 3000,
      position: 'right top',
    });

    await refreshLocations();
  } catch (error: any) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: error.data?.statusMessage || 'Une erreur est survenue lors de la suppression.',
      autoclose: true,
      autotimeout: 4000,
      position: 'right top',
    });
  }
};
</script>

<template>
  <div class="locations-page">
    <header class="page-header">
      <div class="header-content">
        <NuxtLink to="/dashboard" class="back-link">
          <span class="back-icon">←</span>
          Retour au tableau de bord
        </NuxtLink>
        <h1>Gérer les lieux</h1>
        <p class="subtitle">Ajoutez, modifiez ou supprimez vos établissements.</p>
      </div>
      <div class="header-actions">
        <button @click="openCreateModal" class="btn btn-primary">
          <span>+</span> Nouvel établissement
        </button>
      </div>
    </header>

    <div class="locations-grid">
      <div v-if="locations && locations.length > 0" v-for="loc in locations" :key="loc.id" class="location-card">
        <div class="card-main">
          <div class="location-icon">🏢</div>
          <div class="location-details">
            <h3>{{ loc.name }}</h3>
            <p v-if="loc.addressLine">{{ loc.addressLine }}, {{ loc.city }}</p>
            <p v-else class="no-address">Aucune adresse renseignée</p>
            <div class="meta">
              <span class="rooms-count">{{ loc.rooms?.length || 0 }} salles</span>
              <span v-if="loc.phone" class="phone">{{ loc.phone }}</span>
            </div>
          </div>
        </div>
        <div class="card-actions">
          <button @click="openEditModal(loc)" class="btn btn-sm btn-secondary">Modifier</button>
          <button @click="handleDelete(loc.id)" class="btn btn-sm btn-danger-outline">Supprimer</button>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>Vous n'avez pas encore d'établissement.</p>
        <button @click="openCreateModal" class="btn btn-primary">Créer mon premier lieu</button>
      </div>
    </div>

    <!-- Modal Formulaire -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="modal-overlay" @click="isModalOpen = false">
        <div class="modal-content" @click.stop>
          <header class="modal-header">
            <h2>{{ isEditing ? 'Modifier l\'établissement' : 'Nouvel établissement' }}</h2>
            <button @click="isModalOpen = false" class="close-btn">&times;</button>
          </header>
          <form @submit.prevent="handleSave" class="location-form">
            <div class="form-grid">
              <label class="field full">
                <span>Nom de l'établissement *</span>
                <input v-model="locationForm.name" type="text" placeholder="Le Jardin Urbain - Paris 11" required />
              </label>
              
              <label class="field full">
                <span>Adresse</span>
                <input v-model="locationForm.addressLine" type="text" placeholder="12 rue de la Paix" />
              </label>

              <label class="field">
                <span>Ville</span>
                <input v-model="locationForm.city" type="text" placeholder="Paris" />
              </label>

              <label class="field">
                <span>Code Postal</span>
                <input v-model="locationForm.postalCode" type="text" placeholder="75011" />
              </label>

              <label class="field">
                <span>Pays</span>
                <input v-model="locationForm.country" type="text" placeholder="France" />
              </label>

              <label class="field">
                <span>Téléphone</span>
                <input v-model="locationForm.phone" type="tel" placeholder="01 23 45 67 89" />
              </label>
            </div>

            <footer class="modal-footer">
              <button type="button" @click="isModalOpen = false" class="btn btn-secondary">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.locations-page {
  padding: 2rem;
  display: grid;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #1e293b;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 1rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #2563eb;
}

.back-icon {
  font-size: 1.1rem;
}

.subtitle {
  color: #64748b;
  margin: 0.5rem 0 0 0;
}

.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .locations-grid {
    grid-template-columns: 1fr;
  }
}

.location-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.location-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.card-main {
  display: flex;
  gap: 1.25rem;
}

.location-icon {
  width: 56px;
  height: 56px;
  background: #f1f5f9;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  flex-shrink: 0;
}

.location-details h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}

.location-details p {
  margin: 0.5rem 0;
  color: #64748b;
  font-size: 0.95rem;
}

.no-address {
  font-style: italic;
  opacity: 0.7;
}

.meta {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.75rem;
}

.rooms-count {
  background: #eff6ff;
  color: #2563eb;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.phone {
  font-size: 0.85rem;
  color: #94a3b8;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid #f8fafc;
}

.btn-danger-outline {
  background: transparent;
  color: #ef4444;
  border: 1px solid #fee2e2;
}

.btn-danger-outline:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  background: #f8fafc;
  border-radius: 20px;
  border: 2px dashed #e2e8f0;
  color: #64748b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-content {
  background: white;
  width: 100%;
  max-width: 600px;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
}

.location-form {
  padding: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field.full {
  grid-column: 1 / -1;
}

.field span {
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
}

.field input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.modal-footer {
  margin-top: 2.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
