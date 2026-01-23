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
const { snapToGrid, alignToGridLine, getGridPointFromEvent, getGridCellFromEvent } = useGrid({
  gridSize, zoomLevel,
  panOffset, svgCanvas
});

const dragOffset = { x: 0, y: 0 };

const { getPlatformDefaultName } = usePlateform(roomZonesData);

const {
  roomName, roomSlug, undoStack,
  redoStack, wallPoints, wallStartPoint,
  wallClosed, wallSelected,
  showDeleteWallModal, draggingWallSegment,
  wallSegments, wallPolylinePoints,
  doors, draggingDoor, rotatingDoor,
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
    if (type === 'estrade') {
      return getPlatformDefaultName();
    }
    if (type === 'terrasse') {
      return 'Nouvelle terrasse';
    }
    return 'Nouvelle zone';
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
const doors_ = doors;
const { isOpen: showShortcutsModal, open: openShortcutsModal, close: closeShortcutsModal } = useModal();
const showDoorDropdown = ref(false);

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
  ) {
    updateWallPreview(event, getGridPointFromEvent, alignToGridLine);
  }
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
      if (startZoneDrawing(event, getGridCellFromEvent)) {
        return;
      }
    }

    if (event.ctrlKey && activeLayerType.value === 'tables') {
      return;
    }

    selectedTableIndex.value = null;
    selectedChairIndex.value = null;
    selectedDoorIndex.value = null;
    wallSelected.value = false;
    isPanning.value = true;
  }
};

const handleWallClick = (event: MouseEvent) => {
  if (activeLayerType.value === 'zones' && event.ctrlKey) {
    return;
  }
  handleWallClickCore(event, getGridPointFromEvent, alignToGridLine);
};

const handleKeyDown = (event: KeyboardEvent) => {
  const isCtrl = event.ctrlKey || event.metaKey;

  if (isCtrl && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }
  if (isCtrl && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redo();
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if ((event.target as HTMLElement).tagName === 'INPUT' || (event.target as HTMLElement).tagName === 'SELECT') {
      return;
    }

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

  if (isCtrl && event.key.toLowerCase() === 's') {
    event.preventDefault();
    save();
    return;
  }

  if (isCtrl && event.key.toLowerCase() === 'v') {
    event.preventDefault();
    pasteFromClipboard();
    return;
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

  if (isCtrl && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateTable(selectedTableIndex.value);
  } else if (isCtrl && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    copyTable(selectedTableIndex.value);
  }
};

onMounted(async () => {
  await loadRoom();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).getAttribute('data-action') !== 'add-door-dropdown') {
      showDoorDropdown.value = false;
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="builder-container" @mousemove="onMouseMove" @mouseup="stopDrag($event)" @wheel="onWheel" @click="closeContextMenu">
    <div style="display: flex; flex-direction: column; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div class="toolbar">
        <div class="toolbar-left">
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
        </div>

        <div class="toolbar-center">
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
            <div class="door-dropdown-container">
              <button class="btn btn-secondary btn-sm" @click="showDoorDropdown = !showDoorDropdown" data-action="add-door-dropdown" title="Ajouter une porte">
                <svg data-action="add-door-dropdown" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M3 3h18v18H3z"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
                Porte
                <svg data-action="add-door-dropdown" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div v-if="showDoorDropdown" class="door-dropdown">
                <button @click="addDoor('simple'); showDoorDropdown = false">Porte simple</button>
                <button @click="addDoor('double'); showDoorDropdown = false">Porte double</button>
              </div>
            </div>
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
        </div>

        <div class="toolbar-right">
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
        </div>
      </div>
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
      <svg ref="svgCanvas" width="100%" height="100%" class="canvas-svg" :class="{ interacting: isInteracting }" @mousedown="deselect">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eee" stroke-width="1"/>
          </pattern>
          <mask id="wallMask">
            <rect width="10000" height="10000" x="-5000" y="-5000" fill="white" />
            <g v-for="(door, dIdx) in doors_" :key="`mask-door-${dIdx}`">
              <rect
                  :x="door.x" :y="door.y"
                  :width="door.width" :height="door.height"
                  fill="black"
                  :transform="`rotate(${door.rotation || 0}, ${door.x + door.width / 2}, ${door.y + door.height / 2})`"
              />
            </g>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" class="canvas-background" :transform="`translate(${panOffset.x % 20}, ${panOffset.y % 20})`" @click="handleWallClick" @mouseup="stopDrag($event)" />

        <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`">
          <polygon
              v-if="wallClosed && wallPoints.length"
              :points="wallPoints.map(p => `${p.x},${p.y}`).join(' ')"
              class="wall-shape"
              :class="{ selected: wallSelected }"
              mask="url(#wallMask)"
              @mousedown="selectWall($event)"
              @click="handleWallClick"
          />
          <polyline
              v-else-if="wallPolylinePoints"
              :points="wallPolylinePoints"
              class="wall-shape wall-preview"
          />

          <g :class="{ 'inactive-layer': activeLayerType !== 'zones' }" :style="activeLayerType !== 'zones' ? 'pointer-events: none;' : ''">
            <!-- Zones et estrades enregistrées -->
            <g v-for="(zone, zIdx) in roomZonesData" :key="`zone-${zIdx}`">
              <rect
                  v-for="unit in Array.from(zone.units)"
                  :key="unit"
                  :x="unit.split(',')[0]"
                  :y="unit.split(',')[1]"
                  :width="gridSize"
                  :height="gridSize"
                  :fill="zone.type === 'zone' ? '#800020' : (zone.type === 'estrade' ? '#808080' : '#4a90e2')"
                  fill-opacity="0.6"
                  stroke="white"
                  stroke-width="0.5"
                  @contextmenu.prevent="activeLayerType === 'zones' && deleteZone(zIdx)"
              >
                <title v-if="zone.name">{{ zone.name }}</title>
              </rect>
              <g v-if="zone.name" class="zone-label-group">
                <rect
                    :x="getZoneCenter(zone.units).x - (zone.name.length * 4 + 10)"
                    :y="getZoneCenter(zone.units).y - 10"
                    :width="zone.name.length * 8 + 20"
                    :height="20"
                    rx="10"
                    class="zone-name-badge"
                />
                <text
                    :x="getZoneCenter(zone.units).x"
                    :y="getZoneCenter(zone.units).y"
                    class="zone-name-label"
                >
                  {{ zone.name }}
                </text>
              </g>
            </g>

            <!-- Sélection en cours -->
            <g v-if="activeLayerType === 'zones'" @contextmenu="handleContextMenu">
              <rect
                  v-for="unit in Array.from(currentZoneUnits)"
                  :key="`current-${unit}`"
                  :x="unit.split(',')[0]"
                  :y="unit.split(',')[1]"
                  :width="gridSize"
                  :height="gridSize"
                  :fill="selectedZoneType === 'zone' ? '#800020' : (selectedZoneType === 'estrade' ? '#808080' : '#4a90e2')"
                  fill-opacity="0.8"
                  stroke="#fff"
                  stroke-width="1"
                  pointer-events="auto"
              />
            </g>

            <!-- Aperçu du drag -->
            <rect
                v-if="activeLayerType === 'zones' && isDrawingZone && zoneDragStart && zoneDragEnd"
                :x="Math.min(zoneDragStart.x, zoneDragEnd.x)"
                :y="Math.min(zoneDragStart.y, zoneDragEnd.y)"
                :width="Math.abs(zoneDragEnd.x - zoneDragStart.x) + gridSize"
                :height="Math.abs(zoneDragEnd.y - zoneDragStart.y) + gridSize"
                fill="rgba(0, 123, 255, 0.2)"
                stroke="#007bff"
                stroke-width="1"
                stroke-dasharray="4"
                pointer-events="none"
            />
          </g>

          <!-- Segments de mur interactifs pour le déplacement -->
          <template v-if="wallClosed && wallSelected">
            <line
                v-for="(segment, index) in wallSegments"
                :key="`segment-${index}`"
                :x1="segment.p1!.x"
                :y1="segment.p1!.y"
                :x2="segment.p2!.x"
                :y2="segment.p2!.y"
                class="wall-segment-handle"
                :class="{ 'horizontal': segment.isHorizontal, 'vertical': !segment.isHorizontal }"
                @mousedown.stop="startDragWallSegment($event, segment)"
            />
          </template>

          <circle
              v-if="!wallClosed"
              v-for="(point, index) in wallPoints"
              :key="`wall-point-${index}`"
              :cx="point.x"
              :cy="point.y"
              r="3"
              class="wall-point"
          />

          <g :class="{ 'inactive-layer': activeLayerType !== 'tables' }" :style="activeLayerType !== 'tables' ? 'pointer-events: none;' : ''">
            <g v-for="(door, dIdx) in doors_" :key="`door-${dIdx}`">
              <g :transform="`rotate(${door.rotation || 0}, ${door.x + door.width / 2}, ${door.y + door.height / 2})`">
                <rect
                    :x="door.x" :y="door.y"
                    :width="door.width" :height="door.height"
                    class="door-rect"
                    :class="{ selected: selectedDoorIndex === dIdx }"
                    @mousedown="activeLayerType === 'tables' && startDragDoor($event, dIdx)"
                />
                <!-- Représentation du sens d'ouverture -->
                <template v-if="door.type === 'double'">
                  <!-- Côté gauche -->
                  <path
                      :d="`M ${door.x + door.width / 2} ${door.y + door.height} A ${door.width / 2} ${door.width / 2} 0 0 0 ${door.x} ${door.y + door.height - door.width / 2}`"
                      fill="none"
                      stroke="#333"
                      stroke-width="2"
                      stroke-dasharray="4 2"
                      style="pointer-events: none;"
                  />
                  <line
                      :x1="door.x" :y1="door.y + door.height"
                      :x2="door.x" :y2="door.y + door.height - door.width / 2"
                      stroke="#333"
                      stroke-width="2"
                      style="pointer-events: none;"
                  />
                  <!-- Côté droit -->
                  <path
                      :d="`M ${door.x + door.width / 2} ${door.y + door.height} A ${door.width / 2} ${door.width / 2} 0 0 1 ${door.x + door.width} ${door.y + door.height - door.width / 2}`"
                      fill="none"
                      stroke="#333"
                      stroke-width="2"
                      stroke-dasharray="4 2"
                      style="pointer-events: none;"
                  />
                  <line
                      :x1="door.x + door.width" :y1="door.y + door.height"
                      :x2="door.x + door.width" :y2="door.y + door.height - door.width / 2"
                      stroke="#333"
                      stroke-width="2"
                      style="pointer-events: none;"
                  />
                </template>
                <template v-else>
                  <path
                      :d="`M ${door.x + door.width} ${door.y + door.height} A ${door.width} ${door.width} 0 0 0 ${door.x} ${door.y + door.height - door.width}`"
                      fill="none"
                      stroke="#333"
                      stroke-width="2"
                      stroke-dasharray="4 2"
                      style="pointer-events: none;"
                  />
                  <line
                      :x1="door.x" :y1="door.y + door.height"
                      :x2="door.x" :y2="door.y + door.height - door.width"
                      stroke="#333"
                      stroke-width="2"
                      style="pointer-events: none;"
                  />
                </template>
              </g>
            </g>

            <g v-for="(table, tIdx) in _tables" :key="tIdx">
              <g :transform="`rotate(${table.rotation || 0}, ${table.x + table.width / 2}, ${table.y + table.height / 2})`">
                <!-- Table -->
                <rect
                    v-if="table.shape === 'rectangle'"
                    :x="table.x" :y="table.y"
                    :width="table.width" :height="table.height"
                    class="table-rect"
                    :class="{
                      selected: selectedTableIndex === tIdx && !selectedChairIndex,
                      invalid: draggingTable === tIdx && !isTableInValidArea(table)
                    }"
                    @mousedown="activeLayerType === 'tables' && startDragTable($event, tIdx)"
                />
                <ellipse
                    v-else-if="table.shape === 'circle'"
                    :cx="table.x + table.width/2" :cy="table.y + table.height/2"
                    :rx="table.width/2" :ry="table.height/2"
                    class="table-rect"
                    :class="{
                      selected: selectedTableIndex === tIdx && !selectedChairIndex,
                      invalid: draggingTable === tIdx && !isTableInValidArea(table)
                    }"
                    @mousedown="activeLayerType === 'tables' && startDragTable($event, tIdx)"
                />
                <path
                    v-else-if="table.shape === 'L'"
                    :d="`M ${table.x} ${table.y} H ${table.x + table.width} V ${table.y + (table.extraAttributes?.lThicknessY || table.height * 0.4)} H ${table.x + (table.extraAttributes?.lThicknessX || table.width * 0.4)} V ${table.y + table.height} H ${table.x} Z`"
                    class="table-rect"
                    :class="{
                      selected: selectedTableIndex === tIdx && !selectedChairIndex,
                      invalid: draggingTable === tIdx && !isTableInValidArea(table)
                    }"
                    @mousedown="activeLayerType === 'tables' && startDragTable($event, tIdx)"
                />
                <path
                    v-else-if="table.shape === 'U'"
                    :d="`
                    M ${table.x} ${table.y}
                    H ${table.x + (table.extraAttributes?.uThickness || table.width * 0.3)}
                    V ${table.y + table.height - (table.extraAttributes?.uBaseThickness || table.height * 0.3)}
                    H ${table.x + table.width - (table.extraAttributes?.uThickness || table.width * 0.3)}
                    V ${table.y}
                    H ${table.x + table.width}
                    V ${table.y + table.height}
                    H ${table.x}
                    Z`"
                    class="table-rect"
                    :class="{
                      selected: selectedTableIndex === tIdx && !selectedChairIndex,
                      invalid: draggingTable === tIdx && !isTableInValidArea(table)
                    }"
                    @mousedown="activeLayerType === 'tables' && startDragTable($event, tIdx)"
                />

                <text
                    :x="table.x + table.width / 2"
                    :y="table.y + table.height / 2"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    class="table-label"
                    :transform="`rotate(${- (table.rotation || 0)}, ${table.x + table.width / 2}, ${table.y + table.height / 2})`"
                >
                  {{ table.name }}
                </text>

                <!-- Poignées de rotation sur les coins (visibles seulement si sélectionnée) -->
                <template v-if="activeLayerType === 'tables' && selectedTableIndex === tIdx && !selectedChairIndex">
                  <circle
                      v-for="(pos, pIdx) in [
                      {x: table.x, y: table.y},
                      {x: table.x + table.width, y: table.y},
                      {x: table.x, y: table.y + table.height},
                      {x: table.x + table.width, y: table.y + table.height}
                    ]"
                      :key="pIdx"
                      :cx="pos.x" :cy="pos.y" r="6"
                      class="rotation-handle"
                      @mousedown="startRotateTable($event, tIdx)"
                  />
                </template>
              </g>

              <!-- Chaises (ne pas faire pivoter avec la table car leur position x,y est déjà absolue) -->
              <g v-for="(chair, cIdx) in table.chairs" :key="cIdx">
                <rect
                    :x="chair.x" :y="chair.y"
                    width="30" height="30" rx="5"
                    class="chair-rect"
                    :class="{ selected: selectedChairIndex?.tableIndex === tIdx && selectedChairIndex?.chairIndex === cIdx }"
                    :transform="`rotate(${chair.rotation || 0}, ${chair.x + 15}, ${chair.y + 15})`"
                    @mousedown="activeLayerType === 'tables' && startDragChair($event, tIdx, cIdx)"
                />
                <!-- Poignées de rotation sur les coins (visibles seulement si sélectionnée) -->
                <template v-if="activeLayerType === 'tables' && selectedChairIndex?.tableIndex === tIdx && selectedChairIndex?.chairIndex === cIdx">
                  <circle
                      v-for="(pos, pIdx) in [
                      {x: chair.x, y: chair.y},
                      {x: chair.x + 30, y: chair.y},
                      {x: chair.x, y: chair.y + 30},
                      {x: chair.x + 30, y: chair.y + 30}
                    ]"
                      :key="pIdx"
                      :cx="pos.x" :cy="pos.y" r="4"
                      class="rotation-handle"
                      :transform="`rotate(${chair.rotation || 0}, ${chair.x + 15}, ${chair.y + 15})`"
                      @mousedown="startRotateChair($event, tIdx, cIdx)"
                  />
                </template>
              </g>
            </g>
          </g>

        </g>
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

      <div v-if="selectedTableIndex !== null || selectedDoorIndex !== null" class="properties-panel">
        <div v-if="selectedTableIndex !== null">
          <div v-if="selectedChairIndex">
            <h3>Chaise</h3>
            <p class="parent-info">Table: <strong>{{ _tables[selectedChairIndex.tableIndex]?.name }}</strong></p>
            <label>Rotation (°): <input type="number" v-model.number="_tables[selectedChairIndex.tableIndex]!.chairs[selectedChairIndex.chairIndex]!.rotation" /></label>
            <div class="actions">
              <button @click="flipChair(selectedChairIndex.tableIndex, selectedChairIndex.chairIndex)" class="btn btn-primary" title="Faire pivoter la chaise de 180°">Pivoter 180°</button>
              <button @click="removeChair(selectedChairIndex.tableIndex, selectedChairIndex.chairIndex)" class="btn btn-danger">Supprimer</button>
              <button @click="selectedChairIndex = null" class="btn btn-secondary">Retour</button>
            </div>
          </div>
          <div v-else>
            <h3>Table</h3>
            <label>Nom: <input v-model="_tables[selectedTableIndex]!.name" /></label>
            <label>Forme:
              <select v-model="_tables[selectedTableIndex]!.shape" @change="() => {
                if (!_tables[selectedTableIndex!]!.extraAttributes) {
                  _tables[selectedTableIndex!]!.extraAttributes = {
                    lThicknessX: 40,
                    lThicknessY: 40,
                    uThickness: 30,
                    uBaseThickness: 30
                  }
                }
              }">
                <option value="rectangle">Rectangle</option>
                <option value="circle">Cercle</option>
                <option value="L">Table en L</option>
                <option value="U">Table en U</option>
              </select>
            </label>
            <div class="properties-group">
              <label>Largeur: <input type="number" v-model.number="_tables[selectedTableIndex]!.width" /></label>
              <label>Hauteur: <input type="number" v-model.number="_tables[selectedTableIndex]!.height" /></label>
            </div>
            <label>Rotation (°): <input type="number" v-model.number="_tables[selectedTableIndex]!.rotation" /></label>

            <div v-if="_tables[selectedTableIndex]?.shape === 'L'" class="properties-group">
              <label>Épaisseur H: <input type="number" v-model.number="_tables[selectedTableIndex]!.extraAttributes!.lThicknessX" /></label>
              <label>Épaisseur V: <input type="number" v-model.number="_tables[selectedTableIndex]!.extraAttributes!.lThicknessY" /></label>
            </div>

            <div v-if="_tables[selectedTableIndex]?.shape === 'U'" class="properties-group">
              <label>Épaisseur branches: <input type="number" v-model.number="_tables[selectedTableIndex]!.extraAttributes!.uThickness" /></label>
              <label>Épaisseur base: <input type="number" v-model.number="_tables[selectedTableIndex]!.extraAttributes!.uBaseThickness" /></label>
            </div>

            <div class="actions">
              <button @click="flipTable(selectedTableIndex)" class="btn btn-primary" title="Faire pivoter la table de 180°">Pivoter 180°</button>
              <button @click="addChair(selectedTableIndex)" class="btn btn-primary">Ajouter une chaise</button>
              <button @click="removeTable(selectedTableIndex)" class="btn btn-danger">Supprimer la table</button>
            </div>
          </div>
        </div>

        <div v-else-if="selectedDoorIndex !== null">
          <div class="panel-header">
            <h3>Porte {{ doors_[selectedDoorIndex]!.type === 'double' ? 'double' : 'simple' }}</h3>
          </div>

          <div class="form-group">
            <label>Largeur (cm)</label>
            <input type="number" v-model.number="doors_[selectedDoorIndex]!.width" step="5" @input="alignDoorToWall(selectedDoorIndex)" />
          </div>

          <div class="actions">
            <button @click="flipDoor(selectedDoorIndex)" class="btn btn-primary" title="Faire pivoter la porte de 180°">Pivoter 180°</button>
            <button @click="removeDoor(selectedDoorIndex)" class="btn btn-danger">Supprimer la porte</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.custom-notify {
  margin-right: 40px;
}
</style>

<style scoped>
.inactive-layer {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.door-dropdown-container {
  position: relative;
}
.door-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 140px;
  margin-top: 4px;
}
.door-dropdown button {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  background: none;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.door-dropdown button:hover {
  background-color: #f1f5f9;
}
.door-dropdown button:first-child {
  border-radius: 6px 6px 0 0;
}
.door-dropdown button:last-child {
  border-radius: 0 0 6px 6px;
}

.builder-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.toolbar {
  flex-shrink: 0;
  padding: 0.75rem 1.5rem;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 20;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  padding: 0.4rem 1rem;
  border-radius: 9999px;
  border: 1px solid #f1f5f9;
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
.table-rect {
  fill: #d2b48c;
  stroke: #8b4513;
  stroke-width: 2;
  cursor: move;
}
.table-rect.selected {
  stroke: #3b82f6;
  stroke-width: 3;
}
.table-rect.invalid {
  fill: #fee2e2;
  stroke: #ef4444;
  stroke-width: 3;
}
.wall-shape {
  fill: rgba(60, 60, 60, 0.15);
  stroke: #2b2b2b;
  stroke-width: 4;
  stroke-linecap: square;
  stroke-linejoin: miter;
  cursor: pointer;
  mask: url(#wallMask);
}
.wall-shape.selected {
  stroke: #007bff;
  fill: rgba(0, 123, 255, 0.1);
}
.wall-shape.wall-preview {
  fill: none;
  stroke-dasharray: 6 4;
  pointer-events: none;
}
.wall-point {
  fill: #ff4500;
  stroke: #fff;
  stroke-width: 1;
}
.wall-segment-handle {
  stroke: transparent;
  stroke-width: 10;
  cursor: pointer;
}
.wall-segment-handle.horizontal {
  cursor: ns-resize;
}
.wall-segment-handle.vertical {
  cursor: ew-resize;
}
.zone-name-label {
  fill: white;
  font-size: 10px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  user-select: none;
}
.zone-label-group {
  pointer-events: none;
}
.zone-name-badge {
  fill: rgba(0, 0, 0, 0.5);
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 1;
}
.wall-segment-handle:hover {
  stroke: rgba(0, 123, 255, 0.3);
}

.chair-rect {
  fill: #555;
  stroke: #333;
  cursor: move;
}
.chair-rect.selected {
  stroke: #ff4500;
  stroke-width: 3;
}
.door-rect {
  fill: #fff;
  stroke: #333;
  stroke-width: 2;
  cursor: move;
}
.door-rect.selected {
  stroke: #ff4500;
  stroke-width: 4;
}
.rotation-handle {
  fill: white;
  stroke: #ff4500;
  stroke-width: 2;
  cursor: alias;
}
.table-label {
  pointer-events: none;
  font-size: 12px;
  font-weight: bold;
  user-select: none;
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
.properties-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 280px;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.25rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  max-height: calc(100% - 2rem - 40px);
  overflow-y: auto;
  z-index: 10;
}
.properties-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 0.5rem;
}
.parent-info {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 1rem;
}
.parent-info strong {
  color: #374151;
}
.properties-panel label {
  display: block;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
}
.properties-panel input, .properties-panel select {
  width: calc(100% - 10px);
  margin-top: 0.25rem;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #1f2937;
  transition: border-color 0.2s;
}
.properties-panel input:focus, .properties-panel select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}
.properties-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
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