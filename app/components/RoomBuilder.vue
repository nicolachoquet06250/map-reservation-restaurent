<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
import type { RoomLayer, RoomZone, Table } from '~/types/room';
import { useGrid } from '~/composables/useGrid';
import { usePlateform } from '~/composables/usePlateform';
import { useModal } from '~/composables/useModal';
import { useRoom } from '~/composables/useRoom';
import { useTables } from '~/composables/useTables';
import { useZones } from '~/composables/useZones';
import { useZoom } from '~/composables/useZoom';
import { useDropdown } from '~/composables/useDropdown';
import Grid from "~/components/Grid.vue";
import Zones from "~/components/map/Zones.vue";
import Walls from "~/components/map/Walls.vue";
import Tables from "~/components/map/Tables.vue";
import {computed} from "vue";

const dragOffset = { x: 0, y: 0 };

const props = defineProps<{
  roomId: number;
  roomName: string;
}>();

const emit = defineEmits(['saved']);

const gridSize = 20;
const tables = ref<Table[]>([]);
const roomZonesData = ref<RoomZone[]>([]);
const roomLayers = ref<RoomLayer[]>([]);
const activeLayerId = ref<number | null>(null);
const selectedTableIndex = ref<number | null>(null);
const selectedChairIndex = ref<{ tableIndex: number; chairIndex: number } | null>(null);

const { zoomLevel, panOffset, svgCanvas, isPanning, handlePan, onWheel, zoomIn, zoomOut } = useZoom();
const {
  snapToGrid, alignToGridLine,
  getRawPointFromEvent,
  getGridPointFromEvent, getGridCellFromEvent
} = useGrid({
  gridSize, zoomLevel,
  panOffset, svgCanvas
});

const { getPlatformDefaultName } = usePlateform(roomZonesData);

const {
  roomName, roomSlug, undoStack,
  redoStack, wallPoints, wallStartPoint,
  wallPreviewPoint, wallClosed, wallSelected,
  showDeleteWallModal, draggingWallSegment,
  wallSegments, wallPolylinePoints, doors, draggingDoor, rotatingDoor,
  selectedDoorIndex,
  takeSnapshot, undo, redo,
  selectWall, resetWalls,
  performResetWalls, addDoor,
  flipDoor, removeDoor, startDragDoor,
  isPointInRoom, alignDoorToWall,
  handleDoorMouseMove, handleWallSegmentDrag,
  startDragWallSegment, updateWallPreview,
  handleWallClick: handleWallClickCore,
  loadRoom, save, copyReservationLink
} = useRoom({
  roomId: toRef(props, 'roomId'),
  initialRoomName: props.roomName,
  roomNameSource: toRef(props, 'roomName'),
  tables, roomZonesData,
  roomLayers, activeLayerId,
  zoomLevel, panOffset,
  svgCanvas, dragOffset,
  selectedTableIndex,
  selectedChairIndex,
  onSaved: () => emit('saved')
});

const {
  selectedZoneType, currentZoneUnits,
  isDrawingZone, zoneDragStart,
  zoneDragEnd, showZoneNamingModal,
  newZoneName, zoneNameInput,
  showContextMenu, contextMenuPos,
  activeLayerType,
  isPointInValidArea, validateZone,
  confirmCreateZone, handleContextMenu,
  closeContextMenu,
  deleteZone, getZoneCenter,
  handleZoneMouseMove, handleZoneStopDrag,
  startZoneDrawing
} = useZones({
  gridSize, roomZonesData,
  roomLayers, activeLayerId,
  isPointInRoom, save,
  getDefaultZoneName: (type) => {
    switch (type) {
      case "estrade": return getPlatformDefaultName();
      case "terrasse": return 'Nouvelle terrasse';
      default: return 'Nouvelle zone';
    }
  }
});

const {
  draggingTable, draggingChair,
  rotatingTable, rotatingChair,
  isInteracting: isTableInteracting,
  addTable, addChair, removeTable,
  removeChair, flipTable, flipChair,
  startDragTable, startDragChair,
  startRotateTable, startRotateChair,
  handleTableMouseMove, handleTableStopDrag,
  resetInteractions, duplicateChair,
  copyChair, duplicateTable, copyTable,
  pasteFromClipboard, isTableInValidArea
} = useTables({
  tables, gridSize, zoomLevel, panOffset,
  svgCanvas, dragOffset, wallPoints,
  selectedTableIndex, selectedChairIndex,
  snapToGrid, isPointInValidArea, takeSnapshot
});

const _tables = tables;
const _doors = doors;
const { isOpen: showShortcutsModal, open: openShortcutsModal, close: closeShortcutsModal } = useModal();
const { isOpen: showDoorDropdown, close: closeDoorDropdown } = useDropdown();

const isInteracting = computed(() => isTableInteracting.value || isPanning.value);

const onMouseMove = (event: MouseEvent) => {
  if (handlePan(event)) return;

  if (handleZoneMouseMove(event, getGridCellFromEvent)) return;

  handleTableMouseMove(event);
  handleDoorMouseMove(event);
  handleWallSegmentDrag(event, getGridPointFromEvent);

  if (
      wallStartPoint.value &&
      !wallClosed.value &&
      draggingTable.value === null &&
      draggingChair.value === null &&
      rotatingTable.value === null &&
      rotatingChair.value === null &&
      draggingWallSegment.value === null &&
      !isPanning.value
  ) updateWallPreview(event, getRawPointFromEvent, alignToGridLine);
};

const stopDrag = async (event: MouseEvent) => {
  if (isDrawingZone.value) {
    handleZoneStopDrag(event, getGridCellFromEvent);
  }

  await handleTableStopDrag();

  draggingDoor.value = null;
  rotatingDoor.value = null;
  draggingWallSegment.value = null;
  resetInteractions();
  isPanning.value = false;
};

const deselect = (event: MouseEvent) => {
  const isZoneMode = activeLayerType.value === 'zones' && event.ctrlKey;
  const target = event.target as SVGElement;

  if (isZoneMode || target.classList.contains('canvas-background') || target.classList.contains('wall-shape')) {
    if (isZoneMode) {
      if (startZoneDrawing(event, getGridCellFromEvent)) return;
    }

    if (event.ctrlKey && activeLayerType.value === 'tables') return;

    selectedTableIndex.value = null;
    selectedChairIndex.value = null;
    selectedDoorIndex.value = null;
    wallSelected.value = false;
    if (wallClosed.value) {
      isPanning.value = true;
    }
  }
};

const handleWallClick = (event: MouseEvent) => {
  if (activeLayerType.value === 'zones' && event.ctrlKey) return;
  handleWallClickCore(event, getGridPointFromEvent, alignToGridLine);
};

const handleKeyDown = (event: KeyboardEvent) => {
  const isCtrl = event.ctrlKey || event.metaKey;

  if (isCtrl) {
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
      return;
    }
    if (event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      return;
    }
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (['INPUT', 'SELECT'].includes((event.target as HTMLElement).tagName)) return;

    if (selectedChairIndex.value !== null) {
      event.preventDefault();
      removeChair(selectedChairIndex.value.tableIndex, selectedChairIndex.value.chairIndex);
      return;
    } else if (selectedTableIndex.value !== null) {
      event.preventDefault();
      removeTable(selectedTableIndex.value);
      return;
    } else if (selectedDoorIndex.value !== null) {
      event.preventDefault();
      removeDoor(selectedDoorIndex.value);
      return;
    } else if (wallSelected.value) {
      event.preventDefault();
      resetWalls();
      return;
    }
  }

  if (isCtrl) {
    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
      return;
    }
    if (event.key.toLowerCase() === 'v') {
      event.preventDefault();
      pasteFromClipboard();
      return;
    }
  }

  if (selectedChairIndex.value !== null) {
    if (isCtrl && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateChair(selectedChairIndex.value.tableIndex, selectedChairIndex.value.chairIndex);
    } else if (isCtrl && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      copyChair(selectedChairIndex.value.tableIndex, selectedChairIndex.value.chairIndex);
    }
    return;
  }

  if (selectedTableIndex.value === null) return;

  if (isCtrl) {
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateTable(selectedTableIndex.value);
    } else if (event.key.toLowerCase() === 'c') {
      event.preventDefault();
      copyTable(selectedTableIndex.value);
    }
  }
};

onMounted(async () => {
  await loadRoom();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="builder-container" @mouseup="stopDrag($event)" @wheel="onWheel" @click="closeContextMenu">
    <div style="display: flex; flex-direction: column; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <Toolbar>
        <template #left>
          <div class="room-info">
            <div class="name-field">
              <span class="label">Salle :</span>
              <input v-model="roomName" placeholder="Nom de la salle" />
              <button
                  v-if="!roomSlug"
                  class="btn btn-sm btn-primary"
                  style="margin-left: 8px;"
                  @click="save"
              >
                Générer une url
              </button>
              <button
                  v-else
                  class="btn btn-sm btn-secondary"
                  style="margin-left: 8px; display: flex; align-items: center; gap: 4px;"
                  @click="copyReservationLink"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                Copier le lien
              </button>
            </div>
          </div>
        </template>

        <template #center>
          <div class="toolbar-group">
            <div class="history-controls">
              <button class="btn btn-sm btn-secondary" @click="undo" :disabled="undoStack.length === 0" title="Annuler (Ctrl+Z)">↶</button>
              <button class="btn btn-sm btn-secondary" @click="redo" :disabled="redoStack.length === 0" title="Rétablir (Ctrl+Maj+Z)">↷</button>
            </div>
          </div>

          <div v-if="roomLayers.length > 0" class="toolbar-group">
            <div class="layer-selector">
              <button
                  v-for="layer in roomLayers"
                  :key="layer.id"
                  class="btn btn-sm"
                  :class="activeLayerId === layer.id ? 'btn-primary' : 'btn-ghost'"
                  @click="activeLayerId = layer.id"
              >
                {{ layer.name }}
              </button>
            </div>
          </div>

          <div class="toolbar-group" v-if="activeLayerType === 'tables'">
            <button class="btn btn-secondary btn-sm" @click="addTable" title="Ajouter une table">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Table
            </button>
            <Dropdown v-model="showDoorDropdown">
              <template #trigger>
                <button class="btn btn-secondary btn-sm" title="Ajouter une porte">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M3 3h18v18H3z"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
                  Porte
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </template>
              <button @click="addDoor('simple'); closeDoorDropdown()">Porte simple</button>
              <button @click="addDoor('double'); closeDoorDropdown()">Porte double</button>
            </Dropdown>
          </div>

          <div v-if="activeLayerType === 'zones'" class="toolbar-group">
            <div class="zone-selector">
              <select v-model="selectedZoneType" class="form-select btn-sm">
                <option value="zone">Zones</option>
                <option value="estrade">Estrades</option>
                <option value="terrasse">Terrasses</option>
              </select>
              <button v-if="currentZoneUnits.size > 0" class="btn btn-primary btn-sm" @click="validateZone">Valider la sélection</button>
            </div>
          </div>

          <div v-if="wallSelected" class="toolbar-group">
            <div class="wall-options">
              <button class="btn btn-delete btn-sm" @click="resetWalls" title="Supprimer les murs">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-delete"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Supprimer
              </button>
              <button class="btn btn-validate btn-sm" @click="save" title="Valider les murs">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-validate"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Valider
              </button>
            </div>
          </div>
        </template>

        <template #right>
          <div class="toolbar-group">
            <div class="zoom-controls">
              <button class="btn btn-sm btn-ghost" @click="zoomOut" :disabled="zoomLevel <= 0.2">-</button>
              <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
              <button class="btn btn-sm btn-ghost" @click="zoomIn" :disabled="zoomLevel >= 3">+</button>
            </div>
          </div>
          <button @click="save" class="btn btn-primary btn-save">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Sauvegarder
          </button>
        </template>
      </Toolbar>
      <div style="padding-left: 20px; padding-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
        <p class="hint">
          <template v-if="!wallClosed">
            <span class="hint-icon">i</span>
            Cliquez sur la grille pour tracer les murs, recliquez sur le point de départ pour fermer.
          </template>
          <template v-else-if="activeLayerType === 'zones'">
            <span class="hint-icon">i</span>
            Maintenez Ctrl + Cliquez ou Glissez pour définir une zone.
          </template>
          <template v-else>
            <span class="hint-icon">i</span>
            Glissez les éléments pour les placer.
          </template>
        </p>

        <div class="shortcuts-info" v-if="wallClosed">
          <button class="btn btn-sm btn-ghost btn-info" @click="openShortcutsModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Raccourcis clavier
          </button>
        </div>
      </div>
    </div>

    <div class="canvas-area">
      <svg ref="svgCanvas" width="100%" height="100%" class="canvas-svg" :class="{ interacting: isInteracting }" @mousemove="onMouseMove" @mousedown="deselect">
        <Grid
            :doors="_doors" :pan-offset="panOffset"
            @click="handleWallClick" @mouseup="stopDrag($event)" :zoom-level="zoomLevel"
        >
          <Walls
              :closed="wallClosed" :selected="wallSelected" :points="wallPoints"
              :polyline-points="wallPolylinePoints"
              :preview-point="wallPreviewPoint"
              :segments="wallSegments"
              @select="selectWall" @click="handleWallClick" @start-drag="startDragWallSegment"
          />

          <Zones
              :is-active="activeLayerType === 'zones'"
              :data="roomZonesData" :grid-size="gridSize"
              :get-zone-center="getZoneCenter"
              :current-zone-units="currentZoneUnits"
              :selected-zone-type="selectedZoneType"
              :is-drawing-zone="isDrawingZone"
              :zone-drag-start="zoneDragStart"
              :zone-drag-end="zoneDragEnd"

              @delete-zone="deleteZone"
              @context-menu="handleContextMenu"
          />

          <Tables
              :is-active="activeLayerType === 'tables'"
              :doors="_doors"
              :tables="_tables"
              :selected-door-index="selectedDoorIndex"
              :selected-chair-index="selectedChairIndex"
              :selected-table-index="selectedTableIndex"
              :dragging-table="draggingTable"
              :is-table-in-valid-area="isTableInValidArea"

              @start-drag-door="startDragDoor"
              @start-drag-chair="startDragChair"
              @start-rotate-chair="startRotateChair"
              @start-drag-table="startDragTable"
              @start-rotate-table="startRotateTable"
          />
        </Grid>
      </svg>

      <Teleport to="body">
        <Modal v-model="showDeleteWallModal">
          <h3>Confirmer la suppression</h3>
          <p>Voulez-vous vraiment supprimer les murs de cette pièce ? Cette action est irréversible.</p>
          <template #footer>
            <button class="btn btn-secondary" @click="showDeleteWallModal = false">Annuler</button>
            <button class="btn btn-danger" @click="performResetWalls">Supprimer</button>
          </template>
        </Modal>

        <Modal v-model="showZoneNamingModal">
          <h3>Nommer la {{ selectedZoneType === 'zone' ? 'zone' : (selectedZoneType === 'estrade' ? 'estrade' : 'terrasse') }}</h3>
          <div style="margin: 1rem 0;">
            <input
                v-model="newZoneName"
                class="form-control"
                placeholder="Nom de la zone"
                @keyup.enter="confirmCreateZone"
                ref="zoneNameInput"
                style="width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;"
            />
          </div>
          <template #footer>
            <button class="btn btn-secondary" @click="showZoneNamingModal = false">Annuler</button>
            <button class="btn btn-primary" @click="confirmCreateZone">Valider</button>
          </template>
        </Modal>

        <Modal v-model="showShortcutsModal" content-class="shortcuts-modal">
          <template #header>
            <h3>Raccourcis clavier</h3>
            <button class="btn-close" @click="closeShortcutsModal">&times;</button>
          </template>
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
          <template #footer>
            <button class="btn btn-primary" @click="closeShortcutsModal">Fermer</button>
          </template>
        </Modal>

        <ContextMenu v-model="showContextMenu" :position="contextMenuPos">
          <button @click="validateZone">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Créer la zone
          </button>
        </ContextMenu>
      </Teleport>

      <PropertiesPanel
        :selected-table-index="selectedTableIndex"
        :selected-chair-index="selectedChairIndex"
        :selected-door-index="selectedDoorIndex"
        :tables="tables" :doors="doors"

        @update-table-shape="index => {
          if (!tables[index]!.extraAttributes) {
            tables[index]!.extraAttributes = {
              lThicknessX: 40,
              lThicknessY: 40,
              uThickness: 30,
              uBaseThickness: 30
            }
          }
        }"
        @flip-chair="flipChair"
        @remove-chair="removeChair"
        @back-from-chair="selectedChairIndex = null"
        @flip-table="flipTable"
        @add-chair="addChair"
        @remove-table="removeTable"
        @flip-door="flipDoor"
        @remove-door="removeDoor"
        @align-door-to-wall="alignDoorToWall"
      />
    </div>
  </div>
</template>

<style>
.custom-notify {
  margin-right: 40px;
}
</style>

<style scoped>
.builder-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
  border-right: 1px solid #e2e8f0;
}

.toolbar-group:last-child {
  border-right: none;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-field .label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.025em;
}

.room-info input {
  padding: 0.4rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  background: #f8fafc;
  transition: all 0.2s;
  width: 180px;
}

.room-info input:focus {
  outline: none;
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.hint {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-style: italic;
  white-space: nowrap;
}

.hint-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: #e2e8f0;
  color: #475569;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  font-style: normal;
}

.btn-ghost {
  background: transparent;
  border: none;
  color: #64748b;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}

.btn-ghost:hover:not(:disabled) {
  background: #f1f5f9;
  color: #1e293b;
}

.btn-save {
  display: flex;
  align-items: center;
  padding: 0.35rem 1rem;
  font-weight: 600;
  border-radius: 6px;
  font-size: 0.85rem;
  box-shadow: 0 2px 4px -1px rgba(59, 130, 246, 0.2);
}

.wall-options {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-validate {
  background-color: #28a745;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  transition: all 0.2s ease;
  border: none;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);
}
.btn-validate:hover {
  background-color: #218838;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(40, 167, 69, 0.3);
  color: white;
}
.btn-validate:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(40, 167, 69, 0.2);
}
.icon-validate {
  stroke-width: 3px;
}
.btn-delete {
  background-color: #dc3545;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  transition: all 0.2s ease;
  border: none;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
}
.btn-delete:hover {
  background-color: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(220, 53, 69, 0.3);
  color: white;
}
.btn-delete:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(220, 53, 69, 0.2);
}
.icon-delete {
  stroke-width: 2px;
}
.history-controls {
  display: flex;
  gap: 5px;
}
.layer-selector {
  display: flex;
  gap: 2px;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.zone-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}
.form-select {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  background-color: #f8fafc;
}
.room-info input {
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: white;
}
.canvas-svg {
  cursor: grab;
}
.canvas-svg:active {
  cursor: grabbing;
}
.canvas-svg.interacting {
  cursor: grabbing;
}
.canvas-svg.interacting {
  user-select: none;
}
.btn-info {
  color: #64748b;
  display: flex;
  align-items: center;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 20px;
  transition: all 0.2s;
}
.btn-info:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}
.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
}
.btn-close:hover {
  color: #475569;
}
.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 1.5rem;
}
.shortcut-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: #475569;
}
.key {
  display: inline-block;
  padding: 2px 6px;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 600;
  color: #0f172a;
  min-width: 24px;
  text-align: center;
}
.desc {
  margin-left: auto;
  color: #64748b;
}
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.zoom-text {
  font-size: 0.8rem;
  min-width: 45px;
  text-align: center;
  font-weight: 600;
  color: #374151;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.hint {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
}
</style>
