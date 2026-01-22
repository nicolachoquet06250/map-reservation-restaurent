<script setup lang="ts">
const props = defineProps<{
  roomSlug: string | null;
  zoomLevel: number;
  undoDisabled: boolean;
  redoDisabled: boolean;
  roomLayers: Array<{ id: number; name: string; type: string }>;
  activeLayerId: number | null;
  activeLayerType: string | null;
  selectedZoneType: 'zone' | 'estrade' | 'terrasse';
  currentZoneUnitsSize: number;
  wallClosed: boolean;
  wallSelected: boolean;
  showDoorDropdown: boolean;
}>();

const roomName = defineModel<string>('roomName')
const selectedZoneType = defineModel<'zone' | 'estrade' | 'terrasse'>('selectedZoneType')

const emit = defineEmits<{
  (e: 'generateUrl'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'setActiveLayer', value: number): void;
  (e: 'addTable'): void;
  (e: 'toggleDoorDropdown'): void;
  (e: 'addDoor', value: 'simple' | 'double'): void;
  (e: 'validateZone'): void;
  (e: 'resetWalls'): void;
  (e: 'save'): void;
  (e: 'zoomIn'): void;
  (e: 'zoomOut'): void;
  (e: 'showShortcuts'): void;
}>();
</script>

<template>
  <div style="display: flex; flex-direction: column; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="room-info">
          <div class="name-field">
            <span class="label">Salle :</span>
            <input v-model="roomName" placeholder="Nom de la salle" />
            <button
              v-if="!props.roomSlug"
              class="btn btn-sm btn-primary"
              style="margin-left: 8px;"
              @click="emit('generateUrl')"
            >
              Générer une url
            </button>
          </div>
        </div>
      </div>

      <div class="toolbar-center">
        <div class="toolbar-group">
          <div class="history-controls">
            <button class="btn btn-sm btn-secondary" @click="emit('undo')" :disabled="props.undoDisabled" title="Annuler (Ctrl+Z)">↶</button>
            <button class="btn btn-sm btn-secondary" @click="emit('redo')" :disabled="props.redoDisabled" title="Rétablir (Ctrl+Maj+Z)">↷</button>
          </div>
        </div>

        <div v-if="props.roomLayers.length > 0" class="toolbar-group">
          <div class="layer-selector">
            <button
              v-for="layer in props.roomLayers"
              :key="layer.id"
              class="btn btn-sm"
              :class="props.activeLayerId === layer.id ? 'btn-primary' : 'btn-ghost'"
              @click="emit('setActiveLayer', layer.id)"
            >
              {{ layer.name }}
            </button>
          </div>
        </div>

        <div class="toolbar-group" v-if="props.activeLayerType === 'tables'">
          <button class="btn btn-secondary btn-sm" @click="emit('addTable')" title="Ajouter une table">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Table
          </button>
          <div class="door-dropdown-container">
            <button class="btn btn-secondary btn-sm" @click="emit('toggleDoorDropdown')" data-action="add-door-dropdown" title="Ajouter une porte">
              <svg data-action="add-door-dropdown" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M3 3h18v18H3z"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
              Porte
              <svg data-action="add-door-dropdown" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div v-if="props.showDoorDropdown" class="door-dropdown">
              <button @click="emit('addDoor', 'simple')">Porte simple</button>
              <button @click="emit('addDoor', 'double')">Porte double</button>
            </div>
          </div>
        </div>

        <div v-if="props.activeLayerType === 'zones'" class="toolbar-group">
          <div class="zone-selector">
            <select v-model="selectedZoneType" class="form-select btn-sm">
              <option value="zone">Zones</option>
              <option value="estrade">Estrades</option>
              <option value="terrasse">Terrasses</option>
            </select>
            <button v-if="props.currentZoneUnitsSize > 0" class="btn btn-primary btn-sm" @click="emit('validateZone')">Valider la sélection</button>
          </div>
        </div>

        <div v-if="props.wallSelected" class="toolbar-group">
          <div class="wall-options">
            <button class="btn btn-delete btn-sm" @click="emit('resetWalls')" title="Supprimer les murs">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-delete"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              Supprimer
            </button>
            <button class="btn btn-validate btn-sm" @click="emit('save')" title="Valider les murs">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-validate"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Valider
            </button>
          </div>
        </div>
      </div>

      <div class="toolbar-right">
        <div class="toolbar-group">
          <div class="zoom-controls">
            <button class="btn btn-sm btn-ghost" @click="emit('zoomOut')" :disabled="props.zoomLevel <= 0.2">-</button>
            <span class="zoom-text">{{ Math.round(props.zoomLevel * 100) }}%</span>
            <button class="btn btn-sm btn-ghost" @click="emit('zoomIn')" :disabled="props.zoomLevel >= 3">+</button>
          </div>
        </div>
        <button @click="emit('save')" class="btn btn-primary btn-save">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Sauvegarder
        </button>
      </div>
    </div>
    <div style="padding-left: 20px; padding-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
      <p class="hint">
        <template v-if="!props.wallClosed">
          <span class="hint-icon">i</span>
          Cliquez sur la grille pour tracer les murs, recliquez sur le point de départ pour fermer.
        </template>
        <template v-else-if="props.activeLayerType === 'zones'">
          <span class="hint-icon">i</span>
          Maintenez Ctrl + Cliquez ou Glissez pour définir une zone.
        </template>
        <template v-else>
          <span class="hint-icon">i</span>
          Glissez les éléments pour les placer.
        </template>
      </p>

      <div class="shortcuts-info" v-if="props.wallClosed" style="margin-right: 20px;">
        <button class="btn btn-sm btn-ghost btn-info" @click="emit('showShortcuts')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Raccourcis clavier
        </button>
      </div>
    </div>
  </div>
</template>
