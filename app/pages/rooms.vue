<script setup lang="ts">
const token = useCookie('auth_token').value;

const { data: rooms } = await useFetch('/api/rooms?all=true', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};
</script>

<template>
  <div class="rooms-page">
    <header class="page-header">
      <div class="header-content">
        <div class="breadcrumb">
          <NuxtLink to="/dashboard">Tableau de bord</NuxtLink>
          <span>/</span>
          <span class="current">Toutes les salles</span>
        </div>
        <h1>Toutes vos salles</h1>
        <p class="subtitle">Gérez l'ensemble des plans de salle de vos établissements.</p>
      </div>
      <div class="header-actions">
        <NuxtLink to="/dashboard" class="btn btn-secondary">
          Retour au dashboard
        </NuxtLink>
      </div>
    </header>

    <main class="main-content">
      <div class="content-card">
        <div v-if="rooms && rooms.length > 0" class="table-container">
          <table class="rooms-table">
            <thead>
              <tr>
                <th>Nom de la salle</th>
                <th>Localisation</th>
                <th>Établissement</th>
                <th>Date de création</th>
                <th class="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="room in rooms" :key="room.id">
                <td class="room-name">
                  <div class="room-icon-small">🛋️</div>
                  {{ room.name }}
                </td>
                <td>{{ room.locationName }}</td>
                <td>{{ room.restaurantName }}</td>
                <td>{{ formatDate(room.createdAt) }}</td>
                <td class="actions-cell">
                  <NuxtLink :to="`/builder?id=${room.id}&locationId=${room.locationId}`" class="btn btn-sm btn-primary">
                    Ouvrir le plan
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">🛋️</div>
          <h3>Aucune salle trouvée</h3>
          <p>Vous n'avez pas encore créé de salle dans vos établissements.</p>
          <NuxtLink to="/dashboard" class="btn btn-primary">Créer une salle depuis le dashboard</NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.rooms-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.breadcrumb {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.breadcrumb a {
  color: #2563eb;
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb .current {
  color: #64748b;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.subtitle {
  color: #64748b;
  margin: 0.5rem 0 0 0;
}

.content-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.table-container {
  overflow-x: auto;
}

.rooms-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.rooms-table th {
  background: #f8fafc;
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.rooms-table td {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  color: #1e293b;
  font-size: 0.95rem;
}

.rooms-table tr:last-child td {
  border-bottom: none;
}

.rooms-table tr:hover td {
  background: #f8fafc;
}

.room-name {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
}

.room-icon-small {
  font-size: 1.25rem;
}

.actions-column {
  text-align: right;
}

.actions-cell {
  text-align: right;
}

.empty-state {
  padding: 4rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: #0f172a;
  margin: 0;
}

.empty-state p {
  color: #64748b;
  margin: 0;
  max-width: 400px;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
  text-decoration: none;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: white;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
</style>
