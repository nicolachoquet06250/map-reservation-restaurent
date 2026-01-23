<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
import { nextTick } from 'vue'
import type {Room} from "~/types/room";

const route = useRoute();
const locationIdParam = computed(() => route.query.locationId ? Number(route.query.locationId) : null);

const token = useCookie('auth_token').value;

// Récupérer les établissements pour trouver le nom si on a un locationId
const { data: establishments } = await useFetch('/api/locations', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const currentContext = computed(() => {
  if (!locationIdParam.value || !establishments.value) return null;
  const loc = establishments.value.find((e: any) => e.id === locationIdParam.value);
  if (!loc) return null;
  return {
    locationName: loc.name,
    restaurantName: loc.restaurantName
  };
});

const { data: rooms, refresh: refreshRooms } = await useFetch<Room[]>(
  computed(() => `/api/rooms?locationId=${locationIdParam.value || ''}`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

console.log(rooms.value, route.query.locationId);
const isMobile = useIsMobile();
const selectedRoomId = ref<number | null>(route.query.id ? Number(route.query.id) : null);

// Synchroniser l'URL avec selectedRoomId
watch(selectedRoomId, (newId) => {
  if (newId) {
    const query = { ...route.query, id: String(newId) };
    if (String(route.query.id) !== String(newId)) {
      navigateTo({ query });
    }
  }
});
const showResetModal = ref(false);
const showDeleteRoomModal = ref(false);
const roomToDeleteId = ref<number | null>(null);
const showCreateRoomModal = ref(false);
const newRoomName = ref('');
const newRoomInput = ref<HTMLInputElement | null>(null);

const selectedRoom = computed(() => {
  return rooms.value?.find(r => r.id === selectedRoomId.value) || null;
});

// Sélectionner la première salle par défaut si elle existe et qu'aucune n'est sélectionnée par l'URL
watchEffect(() => {
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
      body: { 
        roomName: name, 
        tables: [],
        locationId: locationIdParam.value
      }
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

  <div v-if="isMobile" class="mobile-builder-overlay">
    <div class="mobile-notice-card">
      <div class="notice-icon">🖥️</div>
      <h2>Builder Desktop Uniquement</h2>
      <p>L'interface de conception de plan de salle nécessite un écran plus large pour une précision optimale.</p>
      <p>Veuillez vous connecter depuis un ordinateur pour modifier vos plans.</p>
      <NuxtLink to="/dashboard" class="btn btn-primary">Retour au Dashboard</NuxtLink>
    </div>
  </div>

  <div v-else class="page-container">
    <div class="room-selector-bar">
      <NuxtLink to="/dashboard" class="back-btn" title="Retour au tableau de bord">
        ←
      </NuxtLink>
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
    <div v-else class="no-room-container">
      <div class="no-room-content">
        <div class="no-room-icon">🛋️</div>
        <h2>Aucune salle sélectionnée</h2>
        <p v-if="rooms && rooms.length > 0">
          Choisissez une salle dans la liste ci-dessus ou créez-en une nouvelle.
        </p>
        <p v-else>
          Il n'y a pas encore de salle pour cette localisation. Commencez par en créer une !
        </p>
        <button class="btn btn-primary" @click="createRoom">
          + Créer une salle
        </button>
      </div>
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
          
          <div v-if="currentContext" class="context-info">
            <div class="context-item">
              <span class="context-label">Restaurant</span>
              <span class="context-value">{{ currentContext.restaurantName }}</span>
            </div>
            <div class="context-item">
              <span class="context-label">Localisation</span>
              <span class="context-value">{{ currentContext.locationName }}</span>
            </div>
          </div>

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

.mobile-builder-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 9999;
}

.mobile-notice-card {
  background: white;
  padding: 3rem 2rem;
  border-radius: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.notice-icon {
  font-size: 4rem;
}

.context-info {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.context-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.context-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: #64748b;
  font-weight: 600;
}

.context-value {
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 500;
}


.mobile-notice-card h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.mobile-notice-card p {
  color: #64748b;
  line-height: 1.6;
  margin: 0;
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
.no-room-container {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.no-room-content {
  text-align: center;
  background: white;
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 90%;
}
.no-room-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.no-room-content h2 {
  margin-bottom: 1rem;
  color: #1e293b;
}
.no-room-content p {
  color: #64748b;
  margin-bottom: 2rem;
  line-height: 1.6;
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
