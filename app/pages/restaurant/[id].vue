<script setup lang="ts">
const route = useRoute();
const restaurantId = route.params.id;
const token = useCookie('auth_token').value;

const { data: restaurant, error } = await useFetch(`/api/restaurant?id=${restaurantId}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};
</script>

<template>
  <div class="restaurant-page">
    <header v-if="restaurant" class="page-header">
      <div class="header-content">
        <NuxtLink to="/dashboard" class="back-link">
          <span class="back-icon">←</span>
          Retour au tableau de bord
        </NuxtLink>
        <div class="title-group">
          <h1>{{ restaurant.name }}</h1>
          <span class="badge">Restaurant ID: #{{ restaurant.id }}</span>
        </div>
        <p class="subtitle">Créé le {{ formatDate(restaurant.createdAt!) }}</p>
      </div>
    </header>

    <div v-if="error" class="error-state">
      <p>Erreur lors de la récupération des données : {{ error.statusMessage }}</p>
      <NuxtLink to="/dashboard" class="btn btn-primary">Retour au Dashboard</NuxtLink>
    </div>

    <div v-else-if="restaurant" class="locations-section">
      <div class="section-header">
        <h2>Établissements associés</h2>
        <NuxtLink to="/locations" class="btn btn-sm btn-secondary">Gérer les lieux</NuxtLink>
      </div>

      <div class="locations-grid">
        <div v-for="loc in restaurant.locations" :key="loc.id" class="location-card">
          <div class="loc-header">
            <div class="loc-icon">🏢</div>
            <div class="loc-title">
              <h3>{{ loc.name }}</h3>
              <p>{{ loc.addressLine }}, {{ loc.city }}</p>
            </div>
          </div>

          <div class="loc-stats">
            <div class="stat-item">
              <strong>{{ loc.rooms?.length || 0 }}</strong>
              <span>Salles</span>
            </div>
            <div class="stat-item">
              <strong>{{ loc.phone || 'N/A' }}</strong>
              <span>Téléphone</span>
            </div>
          </div>

          <div class="loc-actions">
            <div class="action-group">
              <p class="action-label">Accès rapides</p>
              <div class="btns">
                <NuxtLink :to="`/builder?locationId=${loc.id}`" class="btn btn-primary">
                  <span>📐</span> Builder
                </NuxtLink>
                <NuxtLink :to="`/reservations?locationId=${loc.id}`" class="btn btn-secondary">
                  <span>📅</span> Réservations
                </NuxtLink>
              </div>
            </div>
          </div>

          <div class="rooms-list" v-if="loc.rooms?.length > 0">
            <p class="rooms-label">Salles de cet établissement :</p>
            <ul>
              <li v-for="room in loc.rooms" :key="room.id">
                <span>{{ room.name }}</span>
                <NuxtLink :to="`/builder?id=${room.id}`" class="btn btn-xs">Ouvrir</NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.restaurant-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 2.5rem;
}

.page-header {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 2rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #2563eb;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.title-group h1 {
  margin: 0;
  font-size: 2.5rem;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.badge {
  background: #f1f5f9;
  color: #64748b;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.subtitle {
  color: #64748b;
  margin: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.5rem;
  margin: 0;
  color: #1e293b;
}

.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 2rem;
}

@media (max-width: 768px) {
  .locations-grid {
    grid-template-columns: 1fr;
  }
}

.location-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loc-header {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.loc-icon {
  width: 64px;
  height: 64px;
  background: #eff6ff;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.loc-title h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}

.loc-title p {
  margin: 0.25rem 0 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.loc-stats {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-item strong {
  font-size: 1.1rem;
  color: #0f172a;
}

.stat-item span {
  font-size: 0.8rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.action-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.btns .btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 12px;
}

.rooms-list {
  border-top: 1px solid #f1f5f9;
  padding-top: 1.5rem;
}

.rooms-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.75rem;
}

.rooms-list ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.rooms-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #fcfcfc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  font-size: 0.95rem;
}

.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #475569;
}

.btn-xs:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.error-state {
  text-align: center;
  padding: 4rem;
  background: #fff1f2;
  border-radius: 20px;
  color: #be123c;
}
</style>
