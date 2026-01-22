<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;

const { data: rooms } = await useFetch('/api/rooms');
const { data: roomData, refresh: refreshRoom } = await useFetch(`/api/room?slug=${slug}`);

const selectedRoom = computed(() => roomData.value?.room || null);
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
          :to="`/reservation/${room.slug}`"
          class="btn btn-sm btn-secondary"
          :class="{ active: slug === room.slug }"
        >
          {{ room.name }}
        </NuxtLink>
      </div>
    </div>

    <main v-if="selectedRoom">
      <ReservationView 
        :room-id="selectedRoom.id" 
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
