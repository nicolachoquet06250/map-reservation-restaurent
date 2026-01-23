<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
const token = useCookie('auth_token').value;

const { data: establishments, refresh: refreshEstablishments } = await useFetch('/api/locations', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const { data: allRestaurants } = await useFetch('/api/restaurants', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const { data: rooms } = await useFetch('/api/rooms?all=true', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const stats = [
  { label: 'Réservations aujourd\'hui', value: '12', change: '+2', icon: '📅' },
  { label: 'Couverts prévus', value: '45', change: '+5', icon: '🍽️' },
  { label: 'Note moyenne', value: '4.8', change: '+0.1', icon: '⭐' },
  { label: 'Chiffre d\'affaires (est.)', value: '1,240 €', change: '+15%', icon: '💰' },
];

const showCreateRestaurantModal = ref(false);
const newRestaurantName = ref('');
const showCreateLocationModal = ref(false);
const newLocationName = ref('');
const selectedRestaurantId = ref<number | null>(null);

const openCreateLocationModal = () => {
  if (allRestaurants.value && allRestaurants.value.length > 0) {
    selectedRestaurantId.value = allRestaurants.value[0].id;
  }
  showCreateLocationModal.value = true;
};

const createRestaurant = async () => {
  if (!newRestaurantName.value.trim()) return;
  const Notify = (await import('simple-notify')).default;
  try {
    const res = await $fetch('/api/restaurants', {
      method: 'POST',
      body: { name: newRestaurantName.value },
      headers: { Authorization: `Bearer ${token}` }
    });
    const restaurantId = res.id;
    const name = newRestaurantName.value;
    
    newRestaurantName.value = '';
    showCreateRestaurantModal.value = false;

    // Notification
    new Notify({
      status: 'success',
      title: 'Établissement créé',
      text: `L'établissement "${name}" a été créé avec succès`,
      effect: 'fade',
      speed: 300,
      showIcon: true,
      showCloseButton: true,
      autoclose: true,
      autotimeout: 2000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top'
    });

    // @ts-ignore
    const { data: updatedRestaurants } = await useFetch('/api/restaurants', {
       headers: { Authorization: `Bearer ${token}` },
       key: 'restaurants_refresh_' + Date.now()
    });
    allRestaurants.value = updatedRestaurants.value;

    // Ouvrir automatiquement la modale de création de localisation
    selectedRestaurantId.value = restaurantId;
    showCreateLocationModal.value = true;

  } catch (e) {
    console.error(e);
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: 'Impossible de créer l\'établissement',
      autoclose: true,
      autotimeout: 3000,
      position: 'right top'
    });
  }
};

const createLocation = async () => {
  if (!newLocationName.value.trim() || !selectedRestaurantId.value) return;
  const Notify = (await import('simple-notify')).default;
  try {
    await $fetch('/api/locations', {
      method: 'POST',
      body: { 
        name: newLocationName.value,
        restaurantId: selectedRestaurantId.value
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const name = newLocationName.value;
    newLocationName.value = '';
    showCreateLocationModal.value = false;
    
    new Notify({
      status: 'success',
      title: 'Localisation créée',
      text: `La localisation "${name}" a été ajoutée`,
      effect: 'fade',
      speed: 300,
      showIcon: true,
      showCloseButton: true,
      autoclose: true,
      autotimeout: 2000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top'
    });

    await refreshEstablishments();
  } catch (e) {
    console.error(e);
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: 'Impossible de créer la localisation',
      autoclose: true,
      autotimeout: 3000,
      position: 'right top'
    });
  }
};
</script>

<template>
  <div class="dashboard-page">
    <header class="dashboard-header">
      <div class="header-content">
        <h1>Tableau de bord</h1>
        <p class="subtitle">Bienvenue. Voici l'activité de vos établissements aujourd'hui.</p>
      </div>
      <div class="header-actions">
        <button @click="showCreateRestaurantModal = true" class="btn btn-secondary">
          <span>+</span> Créer un établissement
        </button>
      </div>
    </header>

    <section class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-details">
          <span class="stat-label">{{ stat.label }}</span>
          <div class="stat-value-group">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-change positive">{{ stat.change }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="main-content">
      <Teleport to="body">
        <!-- Modal Créer Restaurant -->
        <div v-if="showCreateRestaurantModal" class="modal-overlay" @click="showCreateRestaurantModal = false">
          <div class="modal-content" @click.stop>
            <h3>Nouvel établissement</h3>
            <p class="modal-intro">Commencez par donner un nom à votre enseigne.</p>
            <div class="form-group">
              <label for="restaurantName">Nom de l'établissement</label>
              <input id="restaurantName" v-model="newRestaurantName" type="text" class="form-control" placeholder="Ex: Ma Super Enseigne" @keyup.enter="createRestaurant">
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="showCreateRestaurantModal = false">Annuler</button>
              <button class="btn btn-primary" :disabled="!newRestaurantName.trim()" @click="createRestaurant">Continuer</button>
            </div>
          </div>
        </div>

        <!-- Modal Créer Localisation -->
        <div v-if="showCreateLocationModal" class="modal-overlay" @click="showCreateLocationModal = false">
          <div class="modal-content" @click.stop>
            <h3>Nouvelle localisation</h3>
            <p class="modal-intro">Ajoutez maintenant une adresse ou un nom de lieu à cet établissement.</p>
            <div class="form-group" v-if="!selectedRestaurantId">
              <label for="locationRestaurant">Établissement</label>
              <select id="locationRestaurant" v-model="selectedRestaurantId" class="form-control">
                <option v-for="res in allRestaurants" :key="res.id" :value="res.id">{{ res.name }}</option>
              </select>
            </div>
            <div class="form-group" v-else-if="allRestaurants && allRestaurants.length > 1">
               <label>Établissement</label>
               <div class="selected-context">{{ allRestaurants.find(r => r.id === selectedRestaurantId)?.name }}</div>
            </div>

            <div class="form-group">
              <label for="locationName">Nom du lieu</label>
              <input id="locationName" v-model="newLocationName" type="text" class="form-control" placeholder="Ex: Centre-ville, Terrasse, etc." @keyup.enter="createLocation">
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="showCreateLocationModal = false">Plus tard</button>
              <button class="btn btn-primary" :disabled="!newLocationName.trim() || !selectedRestaurantId" @click="createLocation">Terminer</button>
            </div>
          </div>
        </div>
      </Teleport>

      <div class="content-card">
        <div class="card-header">
          <h2>Vos établissements</h2>
          <NuxtLink to="/locations" class="btn btn-sm">Gérer les lieux</NuxtLink>
        </div>
        <div class="establishments-list">
          <div v-if="establishments && establishments.length > 0">
            <div v-for="est in establishments" :key="est.id" class="restaurant-item">
              <div class="resto-info">
                <h3>{{ est.name }}</h3>
                <p>{{ est.restaurantName }}</p>
              </div>
              <div class="resto-meta">
                <span class="badge">{{ est.rooms?.length || 0 }} salles actives</span>
                <span class="status-indicator">En ligne</span>
              </div>
              <div class="resto-actions">
                <NuxtLink :to="`/builder?locationId=${est.id}`" class="btn btn-primary btn-sm">Créer une salle</NuxtLink>
                <NuxtLink :to="`/builder?locationId=${est.id}`" class="btn btn-secondary btn-sm">Éditer les plans</NuxtLink>
                <NuxtLink :to="`/reservations?locationId=${est.id}`" class="btn btn-secondary btn-sm">Voir réservations</NuxtLink>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>Aucun établissement trouvé.</p>
            <button @click="showCreateRestaurantModal = true" class="btn btn-sm">Ajouter un établissement</button>
          </div>
        </div>
      </div>

      <div class="content-card">
        <div class="card-header">
          <h2>Salles récentes</h2>
          <NuxtLink to="/rooms" class="link">Voir tout</NuxtLink>
        </div>
        <div v-if="rooms && rooms.length > 0" class="rooms-grid">
          <div v-for="room in rooms.slice(0, 3)" :key="room.id" class="room-mini-card">
            <div class="room-preview">
              <div class="room-icon">🛋️</div>
            </div>
            <div class="room-info">
              <h4>{{ room.name }}</h4>
              <div class="room-meta-info" v-if="establishments">
                <span class="location-tag">{{ establishments.find(e => e.id === room.locationId)?.name }}</span>
              </div>
              <NuxtLink :to="`/builder?id=${room.id}&locationId=${room.locationId}`" class="btn btn-sm">Ouvrir</NuxtLink>
            </div>
          </div>
        </div>
          <div v-else class="empty-state">
            <p>Aucune salle créée pour le moment.</p>
            <div v-if="establishments && establishments.length > 0" class="empty-actions">
              <p class="small">Sélectionnez un établissement pour créer une salle :</p>
              <div class="quick-location-links">
                <NuxtLink 
                  v-for="est in establishments.slice(0, 2)" 
                  :key="est.id"
                  :to="`/builder?locationId=${est.id}`" 
                  class="btn btn-sm btn-primary"
                >
                  Créer pour {{ est.name }}
                </NuxtLink>
              </div>
            </div>
            <button v-else @click="showCreateRestaurantModal = true" class="btn btn-primary">Créer un établissement</button>
          </div>
      </div>
    </section>
  </div>
</template>

<style>
/* Styles partagés ou globaux si nécessaire */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  font-weight: 500;
}
.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}
.modal-intro {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}
.selected-context {
  padding: 0.5rem;
  background: #f1f5f9;
  border-radius: 4px;
  color: #1e293b;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}
</style>

<style scoped>
.dashboard-page {
  padding: 2rem;
  margin: 0;
  display: grid;
  gap: 2rem;
  overflow-y: auto;
  height: 100%;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #1e293b;
}

.subtitle {
  color: #64748b;
  margin: 0.5rem 0 0 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.stat-icon {
  font-size: 1.5rem;
  background: #f1f5f9;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.stat-value-group {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.stat-change {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.stat-change.positive {
  background: #f0fdf4;
  color: #16a34a;
}

.main-content {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}

.content-card {
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-header h2 {
  font-size: 1.25rem;
  margin: 0;
  color: #1e293b;
}

.establishments-list {
  display: grid;
  gap: 1rem;
}

.restaurant-item {
  border: 1px solid #f1f5f9;
  padding: 1.25rem;
  border-radius: 12px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 1.5rem;
}

.resto-info h3 {
  margin: 0;
  font-size: 1.1rem;
}

.resto-info p {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: #64748b;
}

.resto-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.badge {
  background: #eff6ff;
  color: #2563eb;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-indicator {
  font-size: 0.75rem;
  color: #16a34a;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-indicator::before {
  content: '';
  display: block;
  width: 6px;
  height: 6px;
  background: #16a34a;
  border-radius: 50%;
}

.resto-actions {
  display: flex;
  gap: 0.5rem;
}

.resto-actions .btn {
  padding: 0.4rem 0.75rem;
}

.rooms-grid {
  display: grid;
  gap: 1rem;
}

.room-mini-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: #f8fafc;
}

.room-preview {
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.room-info {
  flex-grow: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.room-meta-info {
  display: flex;
  gap: 0.5rem;
  flex-grow: 1;
}

.location-tag {
  font-size: 0.75rem;
  background: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  color: #64748b;
}

.empty-actions {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.empty-actions .small {
  font-size: 0.85rem;
  margin: 0;
}

.quick-location-links {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.room-info h4 {
  margin: 0;
  font-size: 0.95rem;
}

.link {
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}
</style>
