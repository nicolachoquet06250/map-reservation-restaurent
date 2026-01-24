<script setup lang="ts">
const props = defineProps<{
  roomId?: number;
  selectedDate?: string;
}>();

const token = useCookie('auth_token').value;
const { data: reservations, refresh } = await useFetch(() => {
  const params = new URLSearchParams();
  if (props.roomId) {
    params.set('roomId', String(props.roomId));
  }
  if (props.selectedDate) {
    params.set('date', props.selectedDate);
  }
  const query = params.toString();
  return `/api/reservations${query ? `?${query}` : ''}`;
}, {
  headers: {
    Authorization: `Bearer ${token}`
  },
  watch: [() => props.roomId, () => props.selectedDate]
});

defineExpose({ refresh });

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const groupedReservations = computed(() => {
  if (!reservations.value) return [];
  const grouped = new Map<string, any[]>();
  reservations.value.forEach((reservation: any) => {
    const daySource = reservation.reservationDay || reservation.reservationDate;
    const dayKey = new Date(daySource).toISOString().split('T')[0];
    if (!grouped.has(dayKey!)) {
      grouped.set(dayKey!, []);
    }
    grouped.get(dayKey!)!.push(reservation);
  });
  return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
});
</script>

<template>
  <div class="reservation-list">
    <h3>Liste des réservations</h3>
    <div v-if="!reservations || reservations.length === 0" class="empty-state">
      Aucune réservation trouvée.
    </div>
    <div v-else class="list-container">
      <section v-for="group in groupedReservations" :key="group.date" class="date-group">
        <div class="date-header">
          <span>{{ formatDate(group.date) }}</span>
          <span class="date-count">{{ group.items.length }} réservations</span>
        </div>
        <div class="date-cards">
          <div v-for="(res, index) in group.items" :key="index" class="reservation-card">
            <div class="card-header">
              <span class="customer-name">{{ res.customerName }}</span>
              <span class="reservation-date">{{ formatTime(res.reservationDay || res.reservationDate) }}</span>
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
      </section>
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

.date-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-weight: 600;
}

.date-count {
  font-size: 0.85rem;
  color: #6b7280;
}

.date-cards {
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
