<script setup lang="ts">
import type {Door, Room, Zone, Table} from "~/types/room";

const route = useRoute();
const slug = route.params.slug as string;
const locationId = Number(route.query.locationId);

const toDateTimeLocalValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const reservationDate = ref(toDateTimeLocalValue(new Date()));

const { data: rooms } = await useFetch(`/api/rooms?locationId=${locationId}`);
const { data: roomData, refresh: refreshRoom } = await useFetch<{
  room: Room,
  zones: Zone[],
  doors: Door[],
  tables: Table[],
}>(
    computed(() => `/api/room?slug=${slug}&locationId=${locationId}&reservationDate=${reservationDate.value}`), {
      watch: [() => locationId, reservationDate],
      transform: data => ({
        room: data.room,
        zones: data.zones,
        doors: data.doors,
        tables: data.tables,
      })
    }
);

const selectedRoom = computed(() => roomData.value?.room || null);
const minDate = computed(() => toDateTimeLocalValue(new Date()));
</script>

<template>
  <Head>
    <Title v-if="selectedRoom">{{ selectedRoom.name }} - Réservation</Title>
    <Title v-else>Salle non trouvée</Title>
  </Head>

  <div class="page-container">
    <div class="room-selector-bar" v-if="rooms && rooms.length > 0">
      <div class="rooms-list">
        <NuxtLink 
          v-for="room in rooms" 
          :key="room.id"
          :to="`/reservation/${room.slug}?locationId=${locationId}`"
          class="btn btn-sm btn-secondary"
          :class="{ active: slug === room.slug }"
        >
          {{ room.name }}
        </NuxtLink>
      </div>
      <div class="date-picker">
        <label for="reservation-date">Date</label>
        <input
            id="reservation-date"
            v-model="reservationDate"
            type="datetime-local"
            class="date-input"
            :min="minDate"
        />
      </div>
    </div>

    <main v-if="selectedRoom">
      <ReservationView
        :room-id="selectedRoom.id"
        :room-data="roomData!"
        :reservation-date="new Date(reservationDate)"
        @reserved="refreshRoom"
      />
    </main>
    <div v-else class="no-room">
      <p>Salle non trouvée ou chargement...</p>
      <NuxtLink to="/builder" class="btn btn-primary mt-4">Retour au Builder</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}

.room-selector-bar {
  background: #f3f4f6;
  padding: 0.35rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 1rem;
}
.rooms-list {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
}
.date-picker {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
}

.date-picker label {
  font-size: 0.85rem;
  color: #4b5563;
  font-weight: 600;
}

.date-input {
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: #111827;
  outline: none;
}

main {
  flex-grow: 1;
  overflow: hidden;
}
.no-room {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  color: #6b7280;
}
.mt-4 {
    margin-top: 1rem;
}
</style>
