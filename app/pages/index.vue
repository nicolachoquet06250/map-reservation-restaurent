<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
import { nextTick } from 'vue'

const view = ref<'builder' | 'reservation' | 'reservations_list'>('builder');

const { data: rooms, refresh: refreshRooms } = await useFetch('/api/rooms');
const selectedRoomId = ref<number | null>(null);
const showResetModal = ref(false);
const showDeleteRoomModal = ref(false);
const roomToDeleteId = ref<number | null>(null);
const showCreateRoomModal = ref(false);
const newRoomName = ref('');
const newRoomInput = ref<HTMLInputElement | null>(null);

const selectedRoom = computed(() => {
  return rooms.value?.find(r => r.id === selectedRoomId.value) || null;
});

// Sélectionner la première salle par défaut si elle existe
onMounted(() => {
  if (rooms.value && rooms.value.length > 0 && !selectedRoomId.value) {
    selectedRoomId.value = rooms.value[0]?.id!;
  }
});

const createRoom = async () => {
  newRoomName.value = '';
  showCreateRoomModal.value = true;
  await nextTick();
  newRoomInput.value?.focus();
};

const confirmCreateRoom = async () => {
  if (!newRoomName.value.trim()) return;

  const name = newRoomName.value;
  showCreateRoomModal.value = false;
  
  const Notify = (await import('simple-notify')).default;
  
  try {
    const res = await $fetch('/api/room', {
      method: 'POST',
      body: { roomName: name, tables: [] }
    });
    await refreshRooms();
    selectedRoomId.value = res.roomId;
    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Salle créée',
      text: `La salle "${name}" a été créée avec succès`,
      effect: 'fade',
      speed: 300,
      showIcon: true,
      showCloseButton: true,
      autoclose: true,
      autotimeout: 1500,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    })
  } catch (e) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: 'Erreur lors de la création',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    })
  }
};

const deleteRoom = async (id: number) => {
  roomToDeleteId.value = id;
  showDeleteRoomModal.value = true;
};

const confirmDeleteRoom = async () => {
  if (roomToDeleteId.value === null) return;
  
  const id = roomToDeleteId.value;
  showDeleteRoomModal.value = false;
  roomToDeleteId.value = null;

  const Notify = (await import('simple-notify')).default;
  
  try {
    await $fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
    await refreshRooms();
    if (selectedRoomId.value === id) {
      selectedRoomId.value = rooms.value?.[0]?.id || null;
    }
    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Salle supprimée',
      autoclose: true,
      autotimeout: 1500,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    })
  } catch (e) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: 'Erreur lors de la suppression',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    })
  }
};

const resetTables = async () => {
  showResetModal.value = true;
};

const confirmReset = async () => {
  showResetModal.value = false;
  const Notify = (await import('simple-notify')).default;

  try {
    await $fetch('/api/reset-tables', { method: 'DELETE' });
    
    // Forcer le rechargement de la salle sélectionnée pour mettre à jour les composants enfants
    const currentId = selectedRoomId.value;
    selectedRoomId.value = null;
    await nextTick();
    selectedRoomId.value = currentId;
    
    await refreshRooms();
    
    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Données réinitialisées',
      text: 'Toutes les tables et réservations ont été supprimées',
      autoclose: true,
      autotimeout: 1500,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    })
  } catch (e) {
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: 'Erreur lors de la réinitialisation',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    })
  }
};
</script>

<template>
  <Head>
    <Title>Carte de réservation en restaurent - POC</Title>
  </Head>

  <div class="app">
    <header class="app-header">
      <div class="logo">RestauBuilder</div>
      <nav class="main-nav">
        <button class="btn" :class="{ active: view === 'builder' }" @click="view = 'builder'">Mode Restaurateur</button>
        <button class="btn" :class="{ active: view === 'reservations_list' }" @click="view = 'reservations_list'">Liste des Réservations</button>
        <button class="btn" :class="{ active: view === 'reservation' }" @click="view = 'reservation'">Mode Client</button>
      </nav>
    </header>

    <div class="room-selector-bar" v-if="view !== 'reservations_list' || (rooms && rooms.length > 0)">
      <div class="rooms-list">
        <button 
          v-if="view === 'reservations_list'"
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
          <span v-if="view === 'builder'" class="delete-icon" @click.stop="deleteRoom(room.id)">×</span>
        </button>
        <button v-if="view === 'builder'" class="btn btn-sm btn-secondary add-room" @click="createRoom">+ Nouvelle Salle</button>
        <button v-if="view === 'builder'" class="btn btn-sm btn-danger" @click="resetTables">Réinitialiser tout</button>
      </div>
    </div>

    <main v-if="selectedRoomId || view === 'reservations_list'">
      <RoomBuilder 
        v-if="view === 'builder' && selectedRoomId" 
        :room-id="selectedRoomId" 
        :room-name="selectedRoom?.name || ''"
        @saved="refreshRooms"
      />
      <ReservationList
        v-else-if="view === 'reservations_list'"
        :room-id="selectedRoomId || undefined"
      />
      <ReservationView 
        v-else-if="view === 'reservation' && selectedRoomId" 
        :room-id="selectedRoomId" 
      />
    </main>
    <div v-else class="no-room">
      <p>Veuillez sélectionner ou créer une salle pour commencer.</p>
    </div>

    <Teleport to="body">
      <!-- Modal de confirmation de réinitialisation -->
      <div v-if="showResetModal" class="modal-overlay" @click="showResetModal = false">
        <div class="modal-content" @click.stop>
          <h3>Confirmer la réinitialisation</h3>
          <p>Voulez-vous vraiment réinitialiser toutes les tables et réservations ? Cette action est irréversible.</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showResetModal = false">Annuler</button>
            <button class="btn btn-danger" @click="confirmReset">Réinitialiser tout</button>
          </div>
        </div>
      </div>

      <!-- Modal de confirmation de suppression de salle -->
      <div v-if="showDeleteRoomModal" class="modal-overlay" @click="showDeleteRoomModal = false">
        <div class="modal-content" @click.stop>
          <h3>Confirmer la suppression</h3>
          <p>Voulez-vous vraiment supprimer cette salle ? Cette action est irréversible.</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDeleteRoomModal = false">Annuler</button>
            <button class="btn btn-danger" @click="confirmDeleteRoom">Supprimer</button>
          </div>
        </div>
      </div>

      <!-- Modal de création de salle -->
      <div v-if="showCreateRoomModal" class="modal-overlay" @click="showCreateRoomModal = false">
        <div class="modal-content" @click.stop>
          <h3>Nouvelle salle</h3>
          <div class="form-group">
            <label for="roomName">Nom de la salle</label>
            <input
                id="roomName"
                v-model="newRoomName"
                type="text"
                class="form-control"
                placeholder="Ex: Salle Principale"
                @keyup.enter="confirmCreateRoom"
                ref="newRoomInput"
            >
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showCreateRoomModal = false">Annuler</button>
            <button class="btn btn-primary" :disabled="!newRoomName.trim()" @click="confirmCreateRoom">Créer</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.custom-notify {
  margin-right: 40px;
}
</style>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Global Button Styles */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
}

.btn:hover {
  filter: brightness(0.9);
}

.btn:active {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border-color: #1d4ed8;
}

.btn-secondary {
  background: white;
  color: #374151;
  border-color: #d1d5db;
}

.btn-danger {
  background: #dc2626;
  color: white;
  border-color: #b91c1c;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1a1a;
  padding: 0.5rem 1rem;
  color: white;
}
.logo {
  font-weight: bold;
  font-size: 1.2rem;
}
.main-nav {
  display: flex;
  gap: 1rem;
}
.main-nav button {
  background: transparent;
  color: #ccc;
  border-color: #444;
}
.main-nav button.active {
  color: white;
  border-color: #2563eb;
  background: #2563eb;
}

.room-selector-bar {
  flex-shrink: 0;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
}
.rooms-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.rooms-list button {
  gap: 0.5rem;
}
.rooms-list button.active {
  background: #2563eb;
  color: white;
  border-color: #1d4ed8;
}
.rooms-list button.add-room {
  border-style: dashed;
  color: #666;
}
.delete-icon {
  font-weight: bold;
  opacity: 0.5;
}
.delete-icon:hover {
  opacity: 1;
  color: #f44336;
}

main {
  flex: 1;
  overflow: hidden;
}

.no-room {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
}

.notify-container {
  margin-right: 20px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin-top: 0;
  color: #1a1a1a;
}

.modal-content p {
  color: #4b5563;
  line-height: 1.5;
  margin: 1rem 0 2rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #1f2937;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  box-sizing: border-box;
}

.form-control:focus {
  color: #111827;
  background-color: #fff;
  border-color: #2563eb;
  outline: 0;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
</style>
