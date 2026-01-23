<script setup lang="ts">
const token = useCookie('auth_token').value;
const { data: rooms } = await useFetch('/api/rooms', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
const selectedRoomId = ref<number | null>(null);
</script>

<template>
  <Head>
    <Title>Liste des Réservations</Title>
  </Head>

  <div class="page-container">
    <div class="room-selector-bar">
      <NuxtLink to="/dashboard" class="back-btn" title="Retour au tableau de bord">
        ←
      </NuxtLink>
      <div class="rooms-list" v-if="rooms && rooms.length > 0">
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

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #4b5563;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-btn:hover {
  background: #f9fafb;
  border-color: #2563eb;
  color: #2563eb;
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
