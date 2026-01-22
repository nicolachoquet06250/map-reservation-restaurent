<script setup lang="ts">
import type { Ref } from 'vue';

const props = defineProps<{
  showDeleteWallModal: boolean;
  showZoneNamingModal: boolean;
  showContextMenu: boolean;
  showShortcutsModal: boolean;
  contextMenuPos: { x: number; y: number };
  selectedZoneType: 'zone' | 'estrade' | 'terrasse';
  newZoneName: string;
  zoneNameInput: Ref<HTMLInputElement | null>;
}>();

const emit = defineEmits<{
  (e: 'closeDeleteWallModal'): void;
  (e: 'performResetWalls'): void;
  (e: 'closeZoneNamingModal'): void;
  (e: 'confirmCreateZone'): void;
  (e: 'update:newZoneName', value: string): void;
  (e: 'validateZone'): void;
  (e: 'closeShortcutsModal'): void;
}>();

const onZoneNameInput = (event: Event) => {
  emit('update:newZoneName', (event.target as HTMLInputElement).value);
};
</script>

<template>
  <Teleport to="body">
    <div v-if="props.showDeleteWallModal" class="modal-overlay" @click="emit('closeDeleteWallModal')">
      <div class="modal-content" @click.stop>
        <h3>Confirmer la suppression</h3>
        <p>Voulez-vous vraiment supprimer les murs de cette pièce ? Cette action est irréversible.</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="emit('closeDeleteWallModal')">Annuler</button>
          <button class="btn btn-danger" @click="emit('performResetWalls')">Supprimer</button>
        </div>
      </div>
    </div>

    <div v-if="props.showZoneNamingModal" class="modal-overlay" @click="emit('closeZoneNamingModal')">
      <div class="modal-content" @click.stop>
        <h3>Nommer la {{ props.selectedZoneType === 'zone' ? 'zone' : (props.selectedZoneType === 'estrade' ? 'estrade' : 'terrasse') }}</h3>
        <div style="margin: 1rem 0;">
          <input
            :value="props.newZoneName"
            class="form-control"
            placeholder="Nom de la zone"
            @input="onZoneNameInput"
            @keyup.enter="emit('confirmCreateZone')"
            :ref="props.zoneNameInput"
            style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="emit('closeZoneNamingModal')">Annuler</button>
          <button class="btn btn-primary" @click="emit('confirmCreateZone')">Valider</button>
        </div>
      </div>
    </div>

    <div
      v-if="props.showContextMenu"
      class="custom-context-menu"
      :style="{ top: props.contextMenuPos.y + 'px', left: props.contextMenuPos.x + 'px' }"
      @click.stop
    >
      <button @click="emit('validateZone')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M12 5v14M5 12h14" /></svg>
        Créer la zone
      </button>
    </div>

    <div v-if="props.showShortcutsModal" class="modal-overlay" @click="emit('closeShortcutsModal')">
      <div class="modal-content shortcuts-modal" @click.stop>
        <div class="modal-header">
          <h3>Raccourcis clavier</h3>
          <button class="btn-close" @click="emit('closeShortcutsModal')">&times;</button>
        </div>
        <div class="shortcuts-grid">
          <div class="shortcut-item">
            <span class="key">Ctrl</span> + <span class="key">C</span>
            <span class="desc">Copier l'élément sélectionné</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl</span> + <span class="key">V</span>
            <span class="desc">Coller l'élément</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl</span> + <span class="key">D</span>
            <span class="desc">Dupliquer l'élément sélectionné</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl</span> + <span class="key">Z</span>
            <span class="desc">Annuler</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl</span> + <span class="key">Y</span> / <span class="key">Maj</span> + <span class="key">Z</span>
            <span class="desc">Rétablir</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl</span> + <span class="key">S</span>
            <span class="desc">Sauvegarder</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Suppr</span> / <span class="key">Retour</span>
            <span class="desc">Supprimer l'élément sélectionné</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl</span> + <span class="key">Drag</span>
            <span class="desc">Aimantation (Alignement auto)</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="emit('closeShortcutsModal')">Fermer</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
