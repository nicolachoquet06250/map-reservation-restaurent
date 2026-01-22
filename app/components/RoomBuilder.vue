<script lang="ts">
export interface Chair {
  id?: number;
  x: number;
  y: number;
  relativeX: number;
  relativeY: number;
  rotation: number;
  isReserved?: boolean;
}

export interface Table {
  id?: number;
  roomId?: number;
  name: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number | null;
  shape: string | null;
  extraAttributes: {
    lThicknessX: number,
    lThicknessY: number,
    uThickness?: number,
    uBaseThickness: number
  };
  chairs: Chair[];
}

export interface Zone {
  id?: number;
  roomId?: number;
  type: 'inaccessible' | 'stage';
  x: number;
  y: number;
  width: number;
  height: number;
}
</script>

<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'

const props = defineProps<{
  roomId: number;
  roomName: string;
}>();

const _tables = ref<Table[]>([]);
const _zones = ref<Zone[]>([]);
const roomName = ref(props.roomName);
const zoomLevel = ref(1);
const panOffset = ref({ x: 0, y: 0 });
const activeLayer = ref<'zones' | 'furniture'>('zones');
const zoneType = ref<Zone['type']>('inaccessible');
const gridSize = 20;

// Undo/Redo logic
const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);

const takeSnapshot = () => {
  undoStack.value.push(JSON.stringify({
    tables: _tables.value,
    zones: _zones.value
  }));
  redoStack.value = []; // Clear redo stack on new action
  if (undoStack.value.length > 50) { // Limit history size
    undoStack.value.shift();
  }
};

const undo = () => {
  if (undoStack.value.length > 0) {
    redoStack.value.push(JSON.stringify({
      tables: _tables.value,
      zones: _zones.value
    }));
    const previousState = undoStack.value.pop();
    if (previousState) {
      const parsed = JSON.parse(previousState);
      _tables.value = parsed.tables || [];
      _zones.value = parsed.zones || [];
    }
  }
};

const redo = () => {
  if (redoStack.value.length > 0) {
    undoStack.value.push(JSON.stringify({
      tables: _tables.value,
      zones: _zones.value
    }));
    const nextState = redoStack.value.pop();
    if (nextState) {
      const parsed = JSON.parse(nextState);
      _tables.value = parsed.tables || [];
      _zones.value = parsed.zones || [];
    }
  }
};

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.2);
};

// Watch for props changes to reload data
watch(() => props.roomId, async (newId) => {
  if (newId) {
    roomName.value = props.roomName;
    await loadRoom();
  }
});

watch(activeLayer, () => {
  selectedTableIndex.value = null;
  selectedChairIndex.value = null;
  selectedZoneIndex.value = null;
  draggingZone.value = null;
  drawingZone.value = null;
});

const loadRoom = async () => {
  try {
    const data = await $fetch<{
      tables: {
        chairs: any;
        id: number;
        roomId: number;
        name: string | null;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number | null;
        shape: string | null;
        extraAttributes: unknown;
      }[],
      zones: Zone[]
    }>(`/api/room?id=${props.roomId}`);
    if (data && data.tables) {
      _tables.value = data.tables.map((t: any) => ({
        ...t,
        extraAttributes: t.extraAttributes || {
          lThicknessX: 40,
          lThicknessY: 40,
          uThickness: 30,
          uBaseThickness: 30
        }
      })) as Table[];
      _zones.value = (data.zones || []).map((zone: any) => ({
        ...zone,
        type: zone.type || 'inaccessible'
      })) as Zone[];
    } else {
      _tables.value = [];
      _zones.value = [];
    }
  } catch (e) {
    console.log('Aucun plan existant ou erreur de chargement');
    _tables.value = [];
    _zones.value = [];
  }
};
const selectedTableIndex = ref<number | null>(null);
const selectedChairIndex = ref<{ tableIndex: number, chairIndex: number } | null>(null);
const selectedZoneIndex = ref<number | null>(null);

const addTable = () => {
  takeSnapshot();
  _tables.value.push({
    name: `Table ${_tables.value.length + 1}`,
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    rotation: 0,
    shape: 'rectangle',
    extraAttributes: {
      lThicknessX: 40,
      lThicknessY: 40,
      uThickness: 30,
      uBaseThickness: 30
    },
    chairs: ([] as Chair[])
  });
  selectedTableIndex.value = _tables.value.length - 1;
  selectedChairIndex.value = null;
};

const addChair = (tableIndex: number) => {
  takeSnapshot();
  const table = _tables.value[tableIndex];
  if (table?.chairs === null) {
    table.chairs = [];
  }
  // Ajouter une chaise sur le bord droit par défaut
  table?.chairs.push({
    x: table.x + table.width + 10,
    y: table.y + table.height / 2 - 15,
    relativeX: table.width + 10,
    relativeY: table.height / 2 - 15,
    rotation: 0
  });
  selectedChairIndex.value = { tableIndex, chairIndex: (table?.chairs.length ?? 0) - 1 };
};

const removeTable = async (index: number) => {
  takeSnapshot();
  const table = _tables.value[index];
  if (table?.chairs.some((c: any) => c.isReserved)) {
    const Notify = (await import('simple-notify')).default;
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Action impossible',
      text: 'Cette table contient des chaises avec des réservations actives.',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
    return;
  }
  _tables.value.splice(index, 1);
  selectedTableIndex.value = null;
  selectedChairIndex.value = null;
};

const removeChair = async (tableIndex: number, chairIndex: number) => {
  takeSnapshot();
  const chair = _tables.value[tableIndex]?.chairs[chairIndex] as any;
  if (chair?.isReserved) {
    const Notify = (await import('simple-notify')).default;
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Action impossible',
      text: 'Cette chaise a une réservation active et ne peut pas être supprimée.',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
    return;
  }
  _tables.value[tableIndex]?.chairs.splice(chairIndex, 1);
  selectedChairIndex.value = null;
};

const removeZone = (index: number) => {
  takeSnapshot();
  _zones.value.splice(index, 1);
  selectedZoneIndex.value = null;
};

// Drag & Drop logic simple
const draggingTable = ref<number | null>(null);
const draggingChair = ref<{ tableIndex: number, chairIndex: number } | null>(null);
const isPanning = ref(false);
const rotatingTable = ref<number | null>(null);
const rotatingChair = ref<{ tableIndex: number, chairIndex: number } | null>(null);
const draggingZone = ref<number | null>(null);
const drawingZone = ref<{
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
} | null>(null);
const offset = { x: 0, y: 0 };
const startRotationAngle = ref(0);
const initialTableRotation = ref(0);
const initialChairRotation = ref(0);

const startDragTable = (event: MouseEvent, index: number) => {
  if (activeLayer.value !== 'furniture') return;
  takeSnapshot();
  draggingTable.value = index;
  selectedTableIndex.value = index;
  selectedChairIndex.value = null;
  selectedZoneIndex.value = null;
  const table = _tables.value[index];
  offset.x = event.clientX / zoomLevel.value - (table?.x ?? 0) - panOffset.value.x;
  offset.y = event.clientY / zoomLevel.value - (table?.y ?? 0) - panOffset.value.y;
};

const startDragChair = (event: MouseEvent, tableIndex: number, chairIndex: number) => {
  if (activeLayer.value !== 'furniture') return;
  takeSnapshot();
  event.stopPropagation();
  draggingChair.value = { tableIndex, chairIndex };
  selectedChairIndex.value = { tableIndex, chairIndex };
  selectedTableIndex.value = tableIndex;
  selectedZoneIndex.value = null;
  const chair = _tables.value[tableIndex]?.chairs[chairIndex];
  offset.x = event.clientX / zoomLevel.value - (chair?.x ?? 0) - panOffset.value.x;
  offset.y = event.clientY / zoomLevel.value - (chair?.y ?? 0) - panOffset.value.y;
};

const startRotateTable = (event: MouseEvent, index: number) => {
  if (activeLayer.value !== 'furniture') return;
  takeSnapshot();
  event.stopPropagation();
  rotatingTable.value = index;
  selectedTableIndex.value = index;
  selectedChairIndex.value = null;
  selectedZoneIndex.value = null;
  
  const table = _tables.value[index];
  const centerX = (table?.x ?? 0) + (table?.width ?? 0) / 2 + panOffset.value.x;
  const centerY = (table?.y ?? 0) + (table?.height ?? 0) / 2 + panOffset.value.y;

  startRotationAngle.value = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
  initialTableRotation.value = table?.rotation || 0;
};

const startRotateChair = (event: MouseEvent, tableIndex: number, chairIndex: number) => {
  if (activeLayer.value !== 'furniture') return;
  takeSnapshot();
  event.stopPropagation();
  rotatingChair.value = { tableIndex, chairIndex };
  selectedChairIndex.value = { tableIndex, chairIndex };
  selectedTableIndex.value = tableIndex;
  selectedZoneIndex.value = null;
  
  const chair = _tables.value[tableIndex]?.chairs[chairIndex];
  const centerX = (chair?.x ?? 0) + 15 + panOffset.value.x;
  const centerY = (chair?.y ?? 0) + 15 + panOffset.value.y;

  startRotationAngle.value = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
  initialChairRotation.value = chair?.rotation || 0;
};

const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize;

const getCanvasPoint = (event: MouseEvent) => ({
  x: event.clientX / zoomLevel.value - panOffset.value.x,
  y: event.clientY / zoomLevel.value - panOffset.value.y
});

const onMouseMove = (event: MouseEvent) => {
  if (isPanning.value) {
    panOffset.value.x += event.movementX / zoomLevel.value;
    panOffset.value.y += event.movementY / zoomLevel.value;
    return;
  }
  if (draggingTable.value !== null) {
    const table = _tables.value[draggingTable.value];
    const oldX = table?.x ?? 0;
    const oldY = table?.y ?? 0;
    table!.x = event.clientX / zoomLevel.value - offset.x - panOffset.value.x;
    table!.y = event.clientY / zoomLevel.value - offset.y - panOffset.value.y;
    
    // Déplacer les chaises avec la table
    const dx = (table?.x ?? 0) - oldX;
    const dy = (table?.y ?? 0) - oldY;
    if (dx !== 0 || dy !== 0) {
      table?.chairs.forEach(chair => {
        chair.x += dx;
        chair.y += dy;
      });
    }
  } else if (draggingChair.value !== null) {
    const { tableIndex, chairIndex } = draggingChair.value;
    const table = _tables.value[tableIndex];
    const chair = table?.chairs[chairIndex];
    chair!.x = event.clientX / zoomLevel.value - offset.x - panOffset.value.x;
    chair!.y = event.clientY / zoomLevel.value - offset.y - panOffset.value.y;
    // Mettre à jour les positions relatives
    chair!.relativeX = (chair?.x ?? 0) - (table?.x ?? 0);
    chair!.relativeY = (chair?.y ?? 0) - (table?.y ?? 0);
  } else if (rotatingTable.value !== null) {
    const table = _tables.value[rotatingTable.value];
    const centerX = (table?.x ?? 0) + (table?.width ?? 0) / 2 + panOffset.value.x;
    const centerY = (table?.y ?? 0) + (table?.height ?? 0) / 2 + panOffset.value.y;
    
    const currentAngle = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
    const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);
    
    table!.rotation = (initialTableRotation.value + deltaAngle) % 360;
  } else if (rotatingChair.value !== null) {
    const { tableIndex, chairIndex } = rotatingChair.value;
    const chair = _tables.value[tableIndex]?.chairs[chairIndex];
    const centerX = (chair?.x ?? 0) + 15 + panOffset.value.x;
    const centerY = (chair?.y ?? 0) + 15 + panOffset.value.y;
    
    const currentAngle = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
    const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);
    
    chair!.rotation = (initialChairRotation.value + deltaAngle) % 360;
  } else if (draggingZone.value !== null) {
    const zone = _zones.value[draggingZone.value];
    const point = getCanvasPoint(event);
    zone.x = snapToGrid(point.x - offset.x);
    zone.y = snapToGrid(point.y - offset.y);
  } else if (drawingZone.value) {
    const point = getCanvasPoint(event);
    drawingZone.value.currentX = snapToGrid(point.x);
    drawingZone.value.currentY = snapToGrid(point.y);
  }
};

const stopDrag = () => {
  draggingTable.value = null;
  draggingChair.value = null;
  rotatingTable.value = null;
  rotatingChair.value = null;
  draggingZone.value = null;
  isPanning.value = false;
  if (drawingZone.value) {
    const { startX, startY, currentX, currentY } = drawingZone.value;
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    if (width >= gridSize && height >= gridSize) {
      takeSnapshot();
      _zones.value.push({
        type: zoneType.value,
        x,
        y,
        width,
        height
      });
      selectedZoneIndex.value = _zones.value.length - 1;
      selectedTableIndex.value = null;
      selectedChairIndex.value = null;
    }
    drawingZone.value = null;
  }
};

const handleCanvasMouseDown = (event: MouseEvent) => {
  if (!(event.target as SVGElement).classList.contains('canvas-background')) {
    return;
  }
  if (activeLayer.value === 'zones') {
    const point = getCanvasPoint(event);
    selectedZoneIndex.value = null;
    selectedTableIndex.value = null;
    selectedChairIndex.value = null;
    drawingZone.value = {
      startX: snapToGrid(point.x),
      startY: snapToGrid(point.y),
      currentX: snapToGrid(point.x),
      currentY: snapToGrid(point.y)
    };
    return;
  }

  selectedTableIndex.value = null;
  selectedChairIndex.value = null;
  selectedZoneIndex.value = null;
  isPanning.value = true;
};

const emit = defineEmits(['saved']);

const handleKeyDown = (event: KeyboardEvent) => {
  const isCtrl = event.ctrlKey || event.metaKey;

  // Undo / Redo
  if (isCtrl && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }

  // Suppression
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Si on est dans un input, on ne supprime pas la table/chaise
    if ((event.target as HTMLElement).tagName === 'INPUT' || (event.target as HTMLElement).tagName === 'SELECT') {
      return;
    }

    if (selectedZoneIndex.value !== null && activeLayer.value === 'zones') {
      event.preventDefault();
      takeSnapshot();
      _zones.value.splice(selectedZoneIndex.value, 1);
      selectedZoneIndex.value = null;
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

const duplicateChair = (tableIndex: number, chairIndex: number) => {
  takeSnapshot();
  const chair = _tables.value[tableIndex]?.chairs[chairIndex];
  if (!chair) return;

  const newChair = JSON.parse(JSON.stringify(chair));
  delete newChair.id;
  newChair.x += 10;
  newChair.y += 10;
  newChair.relativeX += 10;
  newChair.relativeY += 10;
  
  _tables.value[tableIndex]?.chairs.push(newChair);
  selectedChairIndex.value = { tableIndex, chairIndex: _tables.value[tableIndex]!.chairs.length - 1 };
};

const copyChair = (tableIndex: number, chairIndex: number) => {
  const chair = _tables.value[tableIndex]?.chairs[chairIndex];
  if (!chair) return;

  const copyData = JSON.parse(JSON.stringify(chair));
  delete copyData.id;
  copyData._type = 'chair'; // Tag to identify it as a chair
  
  navigator.clipboard.writeText(JSON.stringify(copyData))
    .then(() => console.log('Chair copied to clipboard'))
    .catch(err => console.error('Failed to copy chair: ', err));
};

const duplicateTable = (index: number) => {
  takeSnapshot();
  const table = _tables.value[index];
  const newTable = JSON.parse(JSON.stringify(table));
  delete newTable.id;
  newTable.name = `${table?.name} (copie)`;
  newTable.x += 20;
  newTable.y += 20;
  
  // Update chair absolute positions as well
  newTable.chairs.forEach((chair: any) => {
    delete chair.id;
    chair.x += 20;
    chair.y += 20;
    chair.rotation = chair.rotation || 0;
  });
  
  _tables.value.push(newTable);
  selectedTableIndex.value = _tables.value.length - 1;
  selectedChairIndex.value = null;
};

const copyTable = (index: number) => {
  const table = _tables.value[index];
  const copyData = JSON.parse(JSON.stringify(table));
  delete copyData.id;
  copyData.chairs.forEach((c: any) => delete c.id);
  copyData._type = 'table'; // Tag to identify it as a table
  
  // Copy to system clipboard as JSON string
  navigator.clipboard.writeText(JSON.stringify(copyData))
    .then(() => console.log('Table copied to clipboard'))
    .catch(err => console.error('Failed to copy table: ', err));
};

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    
    if (!data || typeof data !== 'object') return;

    // Handle pasting a chair
    if (data._type === 'chair' || ('relativeX' in data && !('shape' in data))) {
      if (selectedTableIndex.value !== null) {
        takeSnapshot();
        const newChair = data;
        delete newChair._type;
        newChair.x += 10;
        newChair.y += 10;
        newChair.relativeX += 10;
        newChair.relativeY += 10;
        newChair.rotation = newChair.rotation || 0;
        
        _tables.value[selectedTableIndex.value]?.chairs.push(newChair);
        selectedChairIndex.value = { 
          tableIndex: selectedTableIndex.value, 
          chairIndex: _tables.value[selectedTableIndex.value]!.chairs.length - 1
        };
      }
      return;
    }

    // Handle pasting a table
    if (data._type === 'table' || ('shape' in data && 'chairs' in data)) {
      takeSnapshot();
      const newTable = data;
      delete newTable._type;
      newTable.x += 20;
      newTable.y += 20;
      newTable.chairs.forEach((chair: any) => {
        chair.x += 20;
        chair.y += 20;
        chair.rotation = chair.rotation || 0;
      });
      
      _tables.value.push(newTable);
      selectedTableIndex.value = _tables.value.length - 1;
      selectedChairIndex.value = null;
    }
  } catch (err) {
    console.error('Failed to paste from clipboard: ', err);
  }
};

const save = async () => {
  const Notify = (await import('simple-notify')).default;
  try {
    await $fetch(`/api/room?id=${props.roomId}`, {
      method: 'POST',
      body: { 
        roomName: roomName.value,
        tables: _tables.value,
        zones: _zones.value
      }
    });
    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Plan de salle sauvegardé !',
      autoclose: true,
      autotimeout: 1500,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
    undoStack.value = [];
    redoStack.value = [];
    emit('saved');
  } catch (e) {
    console.error(e);
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: 'Erreur lors de la sauvegarde',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
  }
};

onMounted(async () => {
  await loadRoom();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
const onWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    event.preventDefault();
    if (event.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }
};

const startDragZone = (event: MouseEvent, index: number) => {
  if (activeLayer.value !== 'zones') return;
  takeSnapshot();
  event.stopPropagation();
  draggingZone.value = index;
  selectedZoneIndex.value = index;
  selectedTableIndex.value = null;
  selectedChairIndex.value = null;
  const zone = _zones.value[index];
  offset.x = event.clientX / zoomLevel.value - (zone?.x ?? 0) - panOffset.value.x;
  offset.y = event.clientY / zoomLevel.value - (zone?.y ?? 0) - panOffset.value.y;
};

const isInteracting = computed(() =>
  draggingTable.value !== null ||
  draggingChair.value !== null ||
  rotatingTable.value !== null ||
  rotatingChair.value !== null ||
  draggingZone.value !== null ||
  drawingZone.value !== null ||
  isPanning.value
);
</script>

<template>
  <div class="builder-container" @mousemove="onMouseMove" @mouseup="stopDrag" @wheel="onWheel">
    <div class="toolbar">
      <div class="room-info">
        <label>Nom: <input v-model="roomName" /></label>
      </div>
      <div class="layer-controls">
        <button
          class="btn btn-sm"
          :class="activeLayer === 'zones' ? 'btn-primary' : 'btn-secondary'"
          @click="activeLayer = 'zones'"
        >
          Layer zones
        </button>
        <button
          class="btn btn-sm"
          :class="activeLayer === 'furniture' ? 'btn-primary' : 'btn-secondary'"
          @click="activeLayer = 'furniture'"
        >
          Layer tables
        </button>
      </div>
      <div class="history-controls">
        <button class="btn btn-sm btn-secondary" @click="undo" :disabled="undoStack.length === 0" title="Annuler (Ctrl+Z)">↶</button>
        <button class="btn btn-sm btn-secondary" @click="redo" :disabled="redoStack.length === 0" title="Rétablir (Ctrl+Maj+Z)">↷</button>
      </div>
      <template v-if="activeLayer === 'furniture'">
        <button class="btn btn-secondary" @click="addTable">Ajouter une table</button>
      </template>
      <template v-else>
        <label class="zone-type">
          Type de zone
          <select v-model="zoneType">
            <option value="inaccessible">Zone inaccessible</option>
            <option value="stage">Estrade</option>
          </select>
        </label>
      </template>
      <div class="zoom-controls">
        <button class="btn btn-sm btn-secondary" @click="zoomOut" :disabled="zoomLevel <= 0.2">-</button>
        <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
        <button class="btn btn-sm btn-secondary" @click="zoomIn" :disabled="zoomLevel >= 3">+</button>
      </div>
      <button @click="save" class="btn btn-primary">Sauvegarder</button>
      <p class="hint" v-if="activeLayer === 'furniture'">Glissez les éléments pour les placer.</p>
      <p class="hint" v-else>Cliquez-glissez pour sélectionner des zones sur la grille.</p>
    </div>

    <div class="canvas-area">
      <svg width="100%" height="100%" class="canvas-svg" :class="{ interacting: isInteracting }" @mousedown="handleCanvasMouseDown">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eee" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" class="canvas-background" :transform="`translate(${panOffset.x % 20}, ${panOffset.y % 20})`" />

        <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`">
          <g class="zones-layer" :class="{ inactive: activeLayer !== 'zones' }">
            <rect
              v-for="(zone, zIdx) in _zones"
              :key="`zone-${zIdx}`"
              :x="zone.x"
              :y="zone.y"
              :width="zone.width"
              :height="zone.height"
              class="zone-rect"
              :class="[
                zone.type === 'stage' ? 'zone-stage' : 'zone-inaccessible',
                selectedZoneIndex === zIdx ? 'selected' : ''
              ]"
              @mousedown="startDragZone($event, zIdx)"
            />
            <rect
              v-if="drawingZone"
              :x="Math.min(drawingZone.startX, drawingZone.currentX)"
              :y="Math.min(drawingZone.startY, drawingZone.currentY)"
              :width="Math.abs(drawingZone.currentX - drawingZone.startX)"
              :height="Math.abs(drawingZone.currentY - drawingZone.startY)"
              class="zone-preview"
            />
          </g>
          <g v-for="(table, tIdx) in _tables" :key="tIdx">
            <g :transform="`rotate(${table.rotation || 0}, ${table.x + table.width / 2}, ${table.y + table.height / 2})`">
              <!-- Table -->
              <rect
                  v-if="table.shape === 'rectangle'"
                  :x="table.x" :y="table.y"
                  :width="table.width" :height="table.height"
                  class="table-rect"
                  :class="{ selected: selectedTableIndex === tIdx && !selectedChairIndex }"
                  @mousedown="startDragTable($event, tIdx)"
              />
              <ellipse
                  v-else-if="table.shape === 'circle'"
                  :cx="table.x + table.width/2" :cy="table.y + table.height/2"
                  :rx="table.width/2" :ry="table.height/2"
                  class="table-rect"
                  :class="{ selected: selectedTableIndex === tIdx && !selectedChairIndex }"
                  @mousedown="startDragTable($event, tIdx)"
              />
              <path
                  v-else-if="table.shape === 'L'"
                  :d="`M ${table.x} ${table.y} H ${table.x + table.width} V ${table.y + (table.extraAttributes?.lThicknessY || table.height * 0.4)} H ${table.x + (table.extraAttributes?.lThicknessX || table.width * 0.4)} V ${table.y + table.height} H ${table.x} Z`"
                  class="table-rect"
                  :class="{ selected: selectedTableIndex === tIdx && !selectedChairIndex }"
                  @mousedown="startDragTable($event, tIdx)"
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
                  :class="{ selected: selectedTableIndex === tIdx && !selectedChairIndex }"
                  @mousedown="startDragTable($event, tIdx)"
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
              <template v-if="selectedTableIndex === tIdx && !selectedChairIndex">
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
                  @mousedown="startDragChair($event, tIdx, cIdx)"
              />
              <!-- Poignées de rotation sur les coins (visibles seulement si sélectionnée) -->
              <template v-if="selectedChairIndex?.tableIndex === tIdx && selectedChairIndex?.chairIndex === cIdx">
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
      </svg>

      <div v-if="activeLayer === 'zones' && selectedZoneIndex !== null" class="properties-panel">
        <div>
          <h3>Zone</h3>
          <label>Type:
            <select v-model="_zones[selectedZoneIndex]!.type">
              <option value="inaccessible">Zone inaccessible</option>
              <option value="stage">Estrade</option>
            </select>
          </label>
          <label>Largeur: <input type="number" v-model.number="_zones[selectedZoneIndex]!.width" /></label>
          <label>Hauteur: <input type="number" v-model.number="_zones[selectedZoneIndex]!.height" /></label>
          <div class="actions">
            <button @click="removeZone(selectedZoneIndex)" class="btn btn-danger">Supprimer</button>
          </div>
        </div>
      </div>

      <div v-else-if="activeLayer === 'furniture' && selectedTableIndex !== null" class="properties-panel">
        <div v-if="selectedChairIndex">
          <h3>Chaise</h3>
          <p class="parent-info">Table: <strong>{{ _tables[selectedChairIndex.tableIndex]?.name }}</strong></p>
          <label>Rotation (°): <input type="number" v-model.number="_tables[selectedChairIndex.tableIndex]!.chairs[selectedChairIndex.chairIndex]!.rotation" /></label>
          <div class="actions">
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
            <button @click="addChair(selectedTableIndex)" class="btn btn-primary">Ajouter une chaise</button>
            <button @click="removeTable(selectedTableIndex)" class="btn btn-danger">Supprimer la table</button>
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
.builder-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: sans-serif;
}
.toolbar {
  flex-shrink: 0;
  padding: 1rem;
  background: #f4f4f4;
  display: flex;
  gap: 1rem;
  align-items: center;
  border-bottom: 1px solid #ccc;
  flex-wrap: wrap;
}
.history-controls {
  display: flex;
  gap: 5px;
}
.layer-controls {
  display: flex;
  gap: 6px;
  align-items: center;
}
.zone-type {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #4b5563;
}
.zone-type select {
  padding: 0.35rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
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
.zones-layer.inactive {
  pointer-events: none;
  opacity: 0.7;
}
.zone-rect {
  stroke-width: 2;
  cursor: move;
}
.zone-rect.zone-inaccessible {
  fill: rgba(220, 38, 38, 0.2);
  stroke: rgba(220, 38, 38, 0.7);
}
.zone-rect.zone-stage {
  fill: rgba(59, 130, 246, 0.2);
  stroke: rgba(59, 130, 246, 0.8);
}
.zone-rect.selected {
  stroke: #f97316;
  stroke-width: 3;
}
.zone-preview {
  fill: rgba(16, 185, 129, 0.2);
  stroke: rgba(16, 185, 129, 0.8);
  stroke-dasharray: 4 3;
}
.table-rect {
  fill: #d2b48c;
  stroke: #8b4513;
  stroke-width: 2;
  cursor: move;
}
.table-rect.selected {
  stroke: #ff4500;
  stroke-width: 3;
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
  max-height: calc(100% - 2rem);
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
  gap: 8px;
  background: white;
  padding: 4px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.zoom-text {
  font-size: 0.8rem;
  min-width: 45px;
  text-align: center;
  font-weight: 600;
  color: #374151;
}

.hint {
  font-size: 0.8rem;
  color: #666;
}
</style>
