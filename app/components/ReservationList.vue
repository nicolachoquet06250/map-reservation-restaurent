<script setup lang="ts">
const props = defineProps<{
  roomId?: number;
}>();

const { data: reservations, refresh } = await useFetch(() => 
  props.roomId ? `/api/reservations?roomId=${props.roomId}` : '/api/reservations'
);

defineExpose({ refresh });

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <div class="reservation-list">
    <h3>Liste des réservations</h3>
    <div v-if="!reservations || reservations.length === 0" class="empty-state">
      Aucune réservation trouvée.
    </div>
    <div v-else class="list-container">
      <div v-for="(res, index) in reservations" :key="index" class="reservation-card">
        <div class="card-header">
          <span class="customer-name">{{ res.customerName }}</span>
          <span class="reservation-date">{{ formatDate(res.reservationDate) }}</span>
        </div>
        <div class="card-body">
          <div class="room-name">Salle : {{ res.roomName }}</div>
          <div class="tables-list">
            <strong>Tables réservées :</strong>
            <ul>
              <li v-for="table in res.tables" :key="table.tableId">
                {{ table.tableName }} ({{ table.chairs.length }} chaises)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reservation-list {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  height: 100%;
  overflow-y: auto;
}

h3 {
  margin-top: 0;
  border-bottom: 2px solid #ddd;
  padding-bottom: 0.5rem;
}

.empty-state {
  color: #666;
  font-style: italic;
  padding: 2rem;
  text-align: center;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reservation-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.card-header {
  padding: 0.75rem;
  background: #eee;
  display: flex;
  justify-content: space-between;
  font-weight: bold;
}

.card-body {
  padding: 0.75rem;
}

.customer-name {
  color: #2c3e50;
}

.reservation-date {
  font-size: 0.9rem;
  color: #666;
}

.room-name {
  margin-bottom: 0.5rem;
  font-style: italic;
}

.tables-list ul {
  margin: 0.25rem 0 0 1rem;
  padding: 0;
}

.tables-list li {
  font-size: 0.95rem;
}
</style>
