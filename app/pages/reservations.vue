<script setup lang="ts">
const { data: rooms } = await useFetch('/api/rooms');
const selectedRoomId = ref<number | null>(null);
</script>

<template>
  <Head>
    <Title>Liste des Réservations</Title>
  </Head>

  <div class="page-container">
    <div class="room-selector-bar" v-if="rooms && rooms.length > 0">
      <div class="rooms-list">
        <button 
          class="btn btn-sm btn-secondary"
          :class="{ active: selectedRoomId === null }"
          @click="selectedRoomId = null"
        >
          Toutes les salles
        </button>
        <button 
          v-for="room in rooms" 
          :key="room.id"
          class="btn btn-sm btn-secondary"
          :class="{ active: selectedRoomId === room.id }"
          @click="selectedRoomId = room.id"
        >
          {{ room.name }}
        </button>
      </div>
    </div>

    <main>
      <ReservationList
        :room-id="selectedRoomId || undefined"
      />
    </main>
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
  padding: 0.5rem 1rem;
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
  overflow-y: auto;
  padding: 1rem;
}
</style>
