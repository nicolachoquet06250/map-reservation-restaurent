<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
import { nextTick } from 'vue'

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

const resetTables = () => {
  showResetModal.value = true;
};

const confirmReset = async () => {
  showResetModal.value = false;
  const Notify = (await import('simple-notify')).default;
  
  try {
    await $fetch('/api/reset-tables', { method: 'DELETE' });
    
    // Forcer le rechargement du builder
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
    <Title>RestauBuilder - Mode Restaurateur</Title>
  </Head>

  <div class="page-container">
    <div class="room-selector-bar">
      <div class="rooms-list">
        <button 
          v-for="room in rooms" 
          :key="room.id"
          class="btn btn-sm btn-secondary"
          :class="{ active: selectedRoomId === room.id }"
          @click="selectedRoomId = room.id"
        >
          {{ room.name }}
          <span class="delete-icon" @click.stop="deleteRoom(room.id)">×</span>
        </button>
        <button class="btn btn-sm btn-secondary add-room" @click="createRoom">+ Nouvelle Salle</button>
        <button class="btn btn-sm btn-danger" @click="resetTables">Réinitialiser tout</button>
      </div>
    </div>

    <main v-if="selectedRoomId">
      <RoomBuilder 
        :room-id="selectedRoomId" 
        :room-name="selectedRoom?.name || ''"
        @saved="refreshRooms"
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
.delete-icon {
  margin-left: 0.5rem;
  font-size: 1.2rem;
  line-height: 1;
  color: #9ca3af;
}
.delete-icon:hover {
  color: #dc2626;
}

main {
  flex-grow: 1;
  overflow: hidden;
}
.no-room {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  color: #6b7280;
}

/* Modal styles */
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
.modal-content h3 {
  margin-top: 0;
  margin-bottom: 1rem;
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
</style>
