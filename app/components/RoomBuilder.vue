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
</script>

<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'

const props = defineProps<{
  roomId: number;
  roomName: string;
}>();

const _tables = ref<Table[]>([]);
const roomName = ref(props.roomName);
const zoomLevel = ref(1);
const svgCanvas = ref<SVGElement | null>(null);
const panOffset = ref({ x: 0, y: 0 });
const gridSize = 20;
const wallPoints = ref<Array<{ x: number; y: number }>>([]);
const wallStartPoint = ref<{ x: number; y: number } | null>(null);
const wallPreviewPoint = ref<{ x: number; y: number } | null>(null);
const wallClosed = ref(false);
const wallSelected = ref(false);
const showDeleteWallModal = ref(false);
const draggingWallSegment = ref<{ index1: number; index2: number; isHorizontal: boolean } | null>(null);

const roomLayers = ref<Array<{ id: number; name: string; type: string }>>([]);
const activeLayerId = ref<number | null>(null);
const selectedZoneType = ref<'zone' | 'estrade'>('zone');
const roomZonesData = ref<Array<{ id?: number; name?: string; type: 'zone' | 'estrade'; units: Set<string> }>>([]);
const currentZoneUnits = ref<Set<string>>(new Set());
const isDrawingZone = ref(false);
const zoneDragStart = ref<{ x: number; y: number } | null>(null);
const zoneDragEnd = ref<{ x: number; y: number } | null>(null);

const showZoneNamingModal = ref(false);
const newZoneName = ref('');
const zoneNameInput = ref<HTMLInputElement | null>(null);
const showContextMenu = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });

watch(showZoneNamingModal, (val) => {
  if (val) {
    nextTick(() => {
      zoneNameInput.value?.focus();
    });
  }
});

const activeLayerType = computed(() => {
  const layer = roomLayers.value.find(l => l.id === activeLayerId.value);
  return layer ? layer.type : null;
});

const wallSegments = computed(() => {
  if (!wallClosed.value || wallPoints.value.length < 2) return [];
  const segments = [];
  for (let i = 0; i < wallPoints.value.length; i++) {
    const p1 = wallPoints.value[i];
    const p2 = wallPoints.value[(i + 1) % wallPoints.value.length];
    segments.push({
      p1,
      p2,
      index1: i,
      index2: (i + 1) % wallPoints.value.length,
      isHorizontal: Math.abs(p1!.y - p2!.y) < 0.1
    });
  }
  return segments;
});

const selectWall = (event?: MouseEvent) => {
  if (event?.ctrlKey) return;
  if (event) event.stopPropagation();
  if (wallClosed.value) {
    wallSelected.value = true;
    selectedTableIndex.value = null;
    selectedChairIndex.value = null;
  }
};

const resetWalls = async () => {
  if (wallPoints.value.length > 0 && wallClosed.value) {
    showDeleteWallModal.value = true;
  } else {
    await performResetWalls();
  }
};

const performResetWalls = async () => {
  wallPoints.value = [];
  wallStartPoint.value = null;
  wallPreviewPoint.value = null;
  wallClosed.value = false;
  wallSelected.value = false;
  showDeleteWallModal.value = false;
  
  // Optionnel: Sauvegarder immédiatement la suppression
  await save();
};

// Undo/Redo logic
const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);

const takeSnapshot = () => {
  undoStack.value.push(JSON.stringify({
    tables: _tables.value,
    wallPoints: wallPoints.value
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
      wallPoints: wallPoints.value
    }));
    const previousStateString = undoStack.value.pop();
    if (previousStateString) {
      const previousState = JSON.parse(previousStateString);
      _tables.value = previousState.tables;
      wallPoints.value = previousState.wallPoints;
    }
  }
};

const redo = () => {
  if (redoStack.value.length > 0) {
    undoStack.value.push(JSON.stringify({
      tables: _tables.value,
      wallPoints: wallPoints.value
    }));
    const nextStateString = redoStack.value.pop();
    if (nextStateString) {
      const nextState = JSON.parse(nextStateString);
      _tables.value = nextState.tables;
      wallPoints.value = nextState.wallPoints;
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

const loadRoom = async () => {
  try {
    const data = await $fetch<{
      room: {
        points: string | null;
      } | null;
      layers: {
        id: number;
        name: string;
        type: string;
      }[];
      zones: {
        id: number;
        name?: string;
        type: 'zone' | 'estrade';
        units: string;
      }[];
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
      }[]
    }>(`/api/room?id=${props.roomId}`);
    
    if (data?.room?.points) {
      const points = data.room.points.split(' ').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      wallPoints.value = points as { x: number; y: number; }[];
      wallStartPoint.value = (points[0] || null) as { x: number; y: number; } | null;
      wallClosed.value = true;
      // On garde wallSelected si c'était déjà le cas
    } else {
      wallPoints.value = [];
      wallStartPoint.value = null;
      wallClosed.value = false;
    }

    if (data?.zones) {
      roomZonesData.value = data.zones.map(z => ({
        id: z.id,
        name: z.name,
        type: z.type,
        units: new Set(z.units.split(' '))
      }));
    } else {
      roomZonesData.value = [];
    }

    if (data?.layers) {
      roomLayers.value = data.layers;
      if (!activeLayerId.value && data.layers.length > 0) {
        // Par défaut, sélectionner le layer des tables
        const tablesLayer = data.layers.find(l => l.type === 'tables');
        activeLayerId.value = tablesLayer ? tablesLayer.id : data.layers[0]!.id;
      }
    } else {
      roomLayers.value = [];
    }

    if (data?.tables) {
      _tables.value = data.tables.map((t: any) => ({
        ...t,
        extraAttributes: t.extraAttributes || {
          lThicknessX: 40,
          lThicknessY: 40,
          uThickness: 30,
          uBaseThickness: 30
        },
        chairs: t.chairs || []
      })) as Table[];
    } else {
      _tables.value = [];
    }
  } catch (e) {
    console.log('Aucun plan existant ou erreur de chargement');
    _tables.value = [];
  }
};
const selectedTableIndex = ref<number | null>(null);
const selectedChairIndex = ref<{ tableIndex: number, chairIndex: number } | null>(null);

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

// Drag & Drop logic simple
const draggingTable = ref<number | null>(null);
const draggingChair = ref<{ tableIndex: number, chairIndex: number } | null>(null);
const isPanning = ref(false);
const rotatingTable = ref<number | null>(null);
const rotatingChair = ref<{ tableIndex: number, chairIndex: number } | null>(null);

const isInteracting = computed(() => 
  draggingTable.value !== null || 
  draggingChair.value !== null || 
  rotatingTable.value !== null || 
  rotatingChair.value !== null ||
  isPanning.value
);
const offset = { x: 0, y: 0 };
const startRotationAngle = ref(0);
const initialTableRotation = ref(0);
const initialChairRotation = ref(0);

const snapToGrid = (point: { x: number; y: number }) => ({
  x: Math.round(point.x / gridSize) * gridSize,
  y: Math.round(point.y / gridSize) * gridSize
});

const alignToGridLine = (point: { x: number; y: number }, lastPoint: { x: number; y: number }) => {
  const dx = Math.abs(point.x - lastPoint.x);
  const dy = Math.abs(point.y - lastPoint.y);
  if (dx >= dy) {
    return { x: point.x, y: lastPoint.y };
  }
  return { x: lastPoint.x, y: point.y };
};

const getGridPointFromEvent = (event: MouseEvent) => {
  if (!svgCanvas.value) return snapToGrid({ x: 0, y: 0 });
  const rect = svgCanvas.value.getBoundingClientRect();
  const rawPoint = {
    x: (event.clientX - rect.left) / zoomLevel.value - panOffset.value.x,
    y: (event.clientY - rect.top) / zoomLevel.value - panOffset.value.y
  };
  return snapToGrid(rawPoint);
};

const getGridCellFromEvent = (event: MouseEvent) => {
  if (!svgCanvas.value) return { x: 0, y: 0 };
  const rect = svgCanvas.value.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / zoomLevel.value - panOffset.value.x) / gridSize) * gridSize;
  const y = Math.floor(((event.clientY - rect.top) / zoomLevel.value - panOffset.value.y) / gridSize) * gridSize;
  return { x, y };
};

const startDragTable = (event: MouseEvent, index: number) => {
  takeSnapshot();
  draggingTable.value = index;
  selectedTableIndex.value = index;
  selectedChairIndex.value = null;
  const table = _tables.value[index];
  if (!svgCanvas.value) return;
  const rect = svgCanvas.value.getBoundingClientRect();
  offset.x = (event.clientX - rect.left) / zoomLevel.value - (table?.x ?? 0) - panOffset.value.x;
  offset.y = (event.clientY - rect.top) / zoomLevel.value - (table?.y ?? 0) - panOffset.value.y;
};

const startDragChair = (event: MouseEvent, tableIndex: number, chairIndex: number) => {
  takeSnapshot();
  event.stopPropagation();
  draggingChair.value = { tableIndex, chairIndex };
  selectedChairIndex.value = { tableIndex, chairIndex };
  selectedTableIndex.value = tableIndex;
  const chair = _tables.value[tableIndex]?.chairs[chairIndex];
  if (!svgCanvas.value) return;
  const rect = svgCanvas.value.getBoundingClientRect();
  offset.x = (event.clientX - rect.left) / zoomLevel.value - (chair?.x ?? 0) - panOffset.value.x;
  offset.y = (event.clientY - rect.top) / zoomLevel.value - (chair?.y ?? 0) - panOffset.value.y;
};

const startRotateTable = (event: MouseEvent, index: number) => {
  takeSnapshot();
  event.stopPropagation();
  rotatingTable.value = index;
  selectedTableIndex.value = index;
  selectedChairIndex.value = null;
  
  const table = _tables.value[index];
  const centerX = (table?.x ?? 0) + (table?.width ?? 0) / 2 + panOffset.value.x;
  const centerY = (table?.y ?? 0) + (table?.height ?? 0) / 2 + panOffset.value.y;

  if (!svgCanvas.value) return;
  const rect = svgCanvas.value.getBoundingClientRect();
  startRotationAngle.value = Math.atan2((event.clientY - rect.top) / zoomLevel.value - centerY, (event.clientX - rect.left) / zoomLevel.value - centerX);
  initialTableRotation.value = table?.rotation || 0;
};

const startRotateChair = (event: MouseEvent, tableIndex: number, chairIndex: number) => {
  takeSnapshot();
  event.stopPropagation();
  rotatingChair.value = { tableIndex, chairIndex };
  selectedChairIndex.value = { tableIndex, chairIndex };
  selectedTableIndex.value = tableIndex;
  
  const chair = _tables.value[tableIndex]?.chairs[chairIndex];
  const centerX = (chair?.x ?? 0) + 15 + panOffset.value.x;
  const centerY = (chair?.y ?? 0) + 15 + panOffset.value.y;

  if (!svgCanvas.value) return;
  const rect = svgCanvas.value.getBoundingClientRect();
  startRotationAngle.value = Math.atan2((event.clientY - rect.top) / zoomLevel.value - centerY, (event.clientX - rect.left) / zoomLevel.value - centerX);
  initialChairRotation.value = chair?.rotation || 0;
};

const startDragWallSegment = (event: MouseEvent, segment: any) => {
  if (event.ctrlKey || !wallSelected.value) return;
  takeSnapshot();
  event.stopPropagation();
  draggingWallSegment.value = {
    index1: segment.index1,
    index2: segment.index2,
    isHorizontal: segment.isHorizontal
  };
};

const isAdjacent = (unit1Str: string, unit2Str: string) => {
  const [x1, y1] = unit1Str.split(',').map(Number);
  const [x2, y2] = unit2Str.split(',').map(Number);
  const dx = Math.abs(x1! - x2!);
  const dy = Math.abs(y1! - y2!);
  return (dx === gridSize && dy === 0) || (dx === 0 && dy === gridSize);
};

const isPointInRoom = (x: number, y: number) => {
  if (!wallClosed.value || wallPoints.value.length < 3) return false;
  
  // Algorithme de ray-casting pour vérifier si un point est dans un polygone
  let inside = false;
  for (let i = 0, j = wallPoints.value.length - 1; i < wallPoints.value.length; j = i++) {
    const xi = wallPoints.value[i]!.x, yi = wallPoints.value[i]!.y;
    const xj = wallPoints.value[j]!.x, yj = wallPoints.value[j]!.y;
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  // Si le point est exactement sur un sommet ou un segment, on peut le considérer comme "dedans"
  // pour faciliter la sélection des unités de grille qui touchent les murs.
  if (!inside) {
    for (const p of wallPoints.value) {
      if (Math.abs(p.x - x) < 0.1 && Math.abs(p.y - y) < 0.1) return true;
    }
    // Vérifier aussi les segments
    for (let i = 0, j = wallPoints.value.length - 1; i < wallPoints.value.length; j = i++) {
      if (isPointOnSegment(x, y, wallPoints.value[i]!.x, wallPoints.value[i]!.y, wallPoints.value[j]!.x, wallPoints.value[j]!.y)) {
        return true;
      }
    }
  }

  return inside;
};

const onMouseMove = (event: MouseEvent) => {
  if (isPanning.value) {
    panOffset.value.x += event.movementX / zoomLevel.value;
    panOffset.value.y += event.movementY / zoomLevel.value;
    return;
  }
  if (!svgCanvas.value) return;
  const rect = svgCanvas.value.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) / zoomLevel.value;
  const mouseY = (event.clientY - rect.top) / zoomLevel.value;

  if (activeLayerType.value === 'zones' && event.ctrlKey && zoneDragStart.value) {
    zoneDragEnd.value = getGridCellFromEvent(event);
    const dx = Math.abs(zoneDragStart.value.x - zoneDragEnd.value.x);
    const dy = Math.abs(zoneDragStart.value.y - zoneDragEnd.value.y);
    if (dx > 0 || dy > 0) {
      isDrawingZone.value = true;
    }
    return;
  }

  if (draggingTable.value !== null) {
    const table = _tables.value[draggingTable.value];
    const oldX = table?.x ?? 0;
    const oldY = table?.y ?? 0;
    table!.x = mouseX - offset.x - panOffset.value.x;
    table!.y = mouseY - offset.y - panOffset.value.y;
    
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
    chair!.x = mouseX - offset.x - panOffset.value.x;
    chair!.y = mouseY - offset.y - panOffset.value.y;
    // Mettre à jour les positions relatives
    chair!.relativeX = (chair?.x ?? 0) - (table?.x ?? 0);
    chair!.relativeY = (chair?.y ?? 0) - (table?.y ?? 0);
  } else if (rotatingTable.value !== null) {
    const table = _tables.value[rotatingTable.value];
    const centerX = (table?.x ?? 0) + (table?.width ?? 0) / 2 + panOffset.value.x;
    const centerY = (table?.y ?? 0) + (table?.height ?? 0) / 2 + panOffset.value.y;
    
    const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
    const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);
    
    table!.rotation = (initialTableRotation.value + deltaAngle) % 360;
  } else if (rotatingChair.value !== null) {
    const { tableIndex, chairIndex } = rotatingChair.value;
    const chair = _tables.value[tableIndex]?.chairs[chairIndex];
    const centerX = (chair?.x ?? 0) + 15 + panOffset.value.x;
    const centerY = (chair?.y ?? 0) + 15 + panOffset.value.y;
    
    const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
    const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);
    
    chair!.rotation = (initialChairRotation.value + deltaAngle) % 360;
  } else if (draggingWallSegment.value !== null) {
    const { index1, index2, isHorizontal } = draggingWallSegment.value;
    const snapped = getGridPointFromEvent(event);
    
    if (isHorizontal) {
      // Déplacer verticalement
      wallPoints.value[index1]!.y = snapped.y;
      wallPoints.value[index2]!.y = snapped.y;
    } else {
      // Déplacer horizontalement
      wallPoints.value[index1]!.x = snapped.x;
      wallPoints.value[index2]!.x = snapped.x;
    }
  }

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
    const snapped = getGridPointFromEvent(event);
    const lastPoint = wallPoints.value[wallPoints.value.length - 1] ?? wallStartPoint.value;
    wallPreviewPoint.value = alignToGridLine(snapped, lastPoint);
  }
};

const stopDrag = (event: MouseEvent) => {
  if (isDrawingZone.value) {
    if (zoneDragStart.value) {
      const cell = getGridCellFromEvent(event);
      const dx = Math.abs(zoneDragStart.value.x - cell.x);
      const dy = Math.abs(zoneDragStart.value.y - cell.y);
      const isSignificantDrag = dx > 0 || dy > 0;

      if (isSignificantDrag) {
        const startX = Math.min(zoneDragStart.value.x, cell.x);
        const endX = Math.max(zoneDragStart.value.x, cell.x);
        const startY = Math.min(zoneDragStart.value.y, cell.y);
        const endY = Math.max(zoneDragStart.value.y, cell.y);

        for (let x = startX; x <= endX; x += gridSize) {
          for (let y = startY; y <= endY; y += gridSize) {
            // On vérifie que le centre de la cellule ou un coin est à l'intérieur
            const hasPointInside = isPointInRoom(x + gridSize / 2, y + gridSize / 2) || [
              { x, y },
              { x: x + gridSize, y },
              { x, y: y + gridSize },
              { x: x + gridSize, y: y + gridSize }
            ].some(c => isPointInRoom(c.x, c.y));

            if (hasPointInside) {
              currentZoneUnits.value.add(`${x},${y}`);
            }
          }
        }
      } else {
        // Simple click - Toggle
        // On vérifie que le centre de la cellule est à l'intérieur ou un coin
        const hasPointInside = isPointInRoom(cell.x + gridSize / 2, cell.y + gridSize / 2) || [
          { x: cell.x, y: cell.y },
          { x: cell.x + gridSize, y: cell.y },
          { x: cell.x, y: cell.y + gridSize },
          { x: cell.x + gridSize, y: cell.y + gridSize }
        ].some(c => isPointInRoom(c.x, c.y));

        if (hasPointInside) {
          const cellStr = `${cell.x},${cell.y}`;
          if (currentZoneUnits.value.has(cellStr)) {
            currentZoneUnits.value.delete(cellStr);
          } else {
            let canAdd = currentZoneUnits.value.size === 0;
            if (!canAdd) {
              for (const unit of currentZoneUnits.value) {
                if (isAdjacent(unit, cellStr)) {
                  canAdd = true;
                  break;
                }
              }
            }
            
            if (canAdd) {
              currentZoneUnits.value.add(cellStr);
            } else {
              currentZoneUnits.value.clear();
              currentZoneUnits.value.add(cellStr);
            }
          }
        }
      }
    }
    isDrawingZone.value = false;
    zoneDragStart.value = null;
    zoneDragEnd.value = null;
  }
  draggingTable.value = null;
  draggingChair.value = null;
  rotatingTable.value = null;
  rotatingChair.value = null;
  draggingWallSegment.value = null;
  isPanning.value = false;
};

const deselect = (event: MouseEvent) => {
  const isZoneMode = activeLayerType.value === 'zones' && event.ctrlKey;
  const target = event.target as SVGElement;
  
  if (isZoneMode || target.classList.contains('canvas-background') || target.classList.contains('wall-shape')) {
    if (isZoneMode) {
      const cell = getGridCellFromEvent(event);
      // On autorise le début du drag seulement si on est à l'intérieur
      if (!isPointInRoom(cell.x + gridSize / 2, cell.y + gridSize / 2)) {
        return;
      }
      isDrawingZone.value = true;
      zoneDragStart.value = cell;
      zoneDragEnd.value = zoneDragStart.value;
      return;
    }
    selectedTableIndex.value = null;
    selectedChairIndex.value = null;
    wallSelected.value = false;
    isPanning.value = true;
  }
};

const handleWallClick = (event: MouseEvent) => {
  if (activeLayerType.value === 'zones' && event.ctrlKey) {
    return;
  }
  if (wallClosed.value) return;
  const snapped = getGridPointFromEvent(event);

  if (!wallStartPoint.value) {
    wallStartPoint.value = snapped;
    wallPoints.value = [snapped];
    wallPreviewPoint.value = snapped;
    return;
  }

  const lastPoint = wallPoints.value[wallPoints.value.length - 1];
  const alignedPoint = alignToGridLine(snapped, lastPoint!);

  if (
    wallStartPoint.value &&
    alignedPoint.x === wallStartPoint.value.x &&
    alignedPoint.y === wallStartPoint.value.y &&
    wallPoints.value.length > 2
  ) {
    wallClosed.value = true;
    wallSelected.value = true;
    wallPreviewPoint.value = null;
    return;
  }

  wallPoints.value.push(alignedPoint);
  wallPreviewPoint.value = alignedPoint;
};

const wallPolylinePoints = computed(() => {
  const points = wallPoints.value.map(point => `${point.x},${point.y}`);
  if (wallPreviewPoint.value && !wallClosed.value) {
    points.push(`${wallPreviewPoint.value.x},${wallPreviewPoint.value.y}`);
  }
  return points.join(' ');
});

const isPointOnSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const d1 = Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
  const d2 = Math.sqrt(Math.pow(px - x2, 2) + Math.pow(py - y2, 2));
  const lineLen = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  const buffer = 0.1;
  return d1 + d2 >= lineLen - buffer && d1 + d2 <= lineLen + buffer;
};

const emit = defineEmits(['saved']);

const validateZone = () => {
  if (currentZoneUnits.value.size > 0) {
    newZoneName.value = '';
    showZoneNamingModal.value = true;
  }
};

const confirmCreateZone = () => {
  if (currentZoneUnits.value.size > 0) {
    roomZonesData.value.push({
      name: newZoneName.value || (selectedZoneType.value === 'zone' ? 'Nouvelle zone' : 'Nouvelle estrade'),
      type: selectedZoneType.value,
      units: new Set(currentZoneUnits.value)
    });
    currentZoneUnits.value.clear();
    showZoneNamingModal.value = false;
    showContextMenu.value = false;
    save();
  }
};

const handleContextMenu = (event: MouseEvent) => {
  if (activeLayerType.value === 'zones' && currentZoneUnits.value.size > 0) {
    event.preventDefault();
    contextMenuPos.value = { x: event.clientX, y: event.clientY };
    showContextMenu.value = true;
  }
};

const deleteZone = (index: number) => {
  roomZonesData.value.splice(index, 1);
  save();
};

const getZoneCenter = (units: Set<string>) => {
  if (units.size === 0) return { x: 0, y: 0 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  units.forEach(unit => {
    const [x, y] = unit.split(',').map(Number);
    if (x < minX) minX = x!;
    if (x > maxX) maxX = x!;
    if (y < minY) minY = y!;
    if (y > maxY) maxY = y!;
  });
  return {
    x: (minX + maxX) / 2 + gridSize / 2,
    y: (minY + maxY) / 2 + gridSize / 2
  };
};

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
  if (isCtrl && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redo();
    return;
  }

  // Suppression
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Si on est dans un input, on ne supprime pas la table/chaise
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
    const response = await $fetch<{ success: boolean; roomId: number }>(`/api/room?id=${props.roomId}`, {
      method: 'POST',
      body: { 
        roomName: roomName.value,
        tables: _tables.value,
        points: wallPoints.value.map(p => `${p.x},${p.y}`).join(' '),
        zones: roomZonesData.value.map(z => ({
          name: z.name || null,
          type: z.type,
          units: Array.from(z.units).join(' ')
        }))
      }
    });

    if (response.success) {
      // Recharger les données pour avoir les IDs à jour (notamment pour les nouvelles tables/chaises)
      const currentWallSelected = wallSelected.value;
      const currentSelectedTableIndex = selectedTableIndex.value;
      const currentSelectedChairIndex = selectedChairIndex.value;

      await loadRoom();

      // Restaurer la sélection
      wallSelected.value = currentWallSelected;
      selectedTableIndex.value = currentSelectedTableIndex;
      selectedChairIndex.value = currentSelectedChairIndex;
    }
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
</script>

<template>
  <div class="builder-container" @mousemove="onMouseMove" @mouseup="stopDrag($event)" @wheel="onWheel" @click="showContextMenu = false">
    <div style="display: flex; flex-direction: column; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="room-info">
            <div class="name-field">
              <span class="label">Salle :</span>
              <input v-model="roomName" placeholder="Nom de la salle" />
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
            <button class="btn btn-secondary btn-sm" @click="addTable">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Ajouter une table
            </button>
          </div>

          <div v-if="activeLayerType === 'zones'" class="toolbar-group">
            <div class="zone-selector">
              <select v-model="selectedZoneType" class="form-select btn-sm">
                <option value="zone">Zones</option>
                <option value="estrade">Estrades</option>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Sauvegarder
          </button>
        </div>
      </div>
      <div style="padding-left: 20px; padding-bottom: 15px;">
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
      </div>
    </div>

    <div class="canvas-area">
      <svg ref="svgCanvas" width="100%" height="100%" class="canvas-svg" :class="{ interacting: isInteracting }" @mousedown="deselect">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eee" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" class="canvas-background" :transform="`translate(${panOffset.x % 20}, ${panOffset.y % 20})`" @click="handleWallClick" @mouseup="stopDrag($event)" />

        <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`">
          <polygon
            v-if="wallClosed && wallPoints.length"
            :points="wallPoints.map(p => `${p.x},${p.y}`).join(' ')"
            class="wall-shape"
            :class="{ selected: wallSelected }"
            @mousedown="selectWall($event)"
            @click="handleWallClick"
          />
          <polyline
            v-else-if="wallPolylinePoints"
            :points="wallPolylinePoints"
            class="wall-shape wall-preview"
          />

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

          <g v-if="activeLayerType === 'tables'">
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
                    @mousedown="startDragTable($event, tIdx)"
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

          <g v-if="activeLayerType === 'zones'">
            <!-- Zones et estrades enregistrées -->
            <g v-for="(zone, zIdx) in roomZonesData" :key="`zone-${zIdx}`">
              <rect
                v-for="unit in Array.from(zone.units)"
                :key="unit"
                :x="unit.split(',')[0]"
                :y="unit.split(',')[1]"
                :width="gridSize"
                :height="gridSize"
                :fill="zone.type === 'zone' ? '#800020' : '#808080'"
                fill-opacity="0.6"
                stroke="white"
                stroke-width="0.5"
                @contextmenu.prevent="deleteZone(zIdx)"
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
            <g @contextmenu="handleContextMenu">
              <rect
                v-for="unit in Array.from(currentZoneUnits)"
                :key="`current-${unit}`"
                :x="unit.split(',')[0]"
                :y="unit.split(',')[1]"
                :width="gridSize"
                :height="gridSize"
                :fill="selectedZoneType === 'zone' ? '#800020' : '#808080'"
                fill-opacity="0.8"
                stroke="#fff"
                stroke-width="1"
                pointer-events="auto"
              />
            </g>

            <!-- Aperçu du drag -->
            <rect
              v-if="isDrawingZone && zoneDragStart && zoneDragEnd"
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
        </g>
      </svg>

      <Teleport to="body">
        <div v-if="showDeleteWallModal" class="modal-overlay" @click="showDeleteWallModal = false">
          <div class="modal-content" @click.stop>
            <h3>Confirmer la suppression</h3>
            <p>Voulez-vous vraiment supprimer les murs de cette pièce ? Cette action est irréversible.</p>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="showDeleteWallModal = false">Annuler</button>
              <button class="btn btn-danger" @click="performResetWalls">Supprimer</button>
            </div>
          </div>
        </div>

        <!-- Modal pour nommer la zone -->
        <div v-if="showZoneNamingModal" class="modal-overlay" @click="showZoneNamingModal = false">
          <div class="modal-content" @click.stop>
            <h3>Nommer la {{ selectedZoneType === 'zone' ? 'zone' : 'estrade' }}</h3>
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
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="showZoneNamingModal = false">Annuler</button>
              <button class="btn btn-primary" @click="confirmCreateZone">Valider</button>
            </div>
          </div>
        </div>

        <!-- Menu contextuel personnalisé -->
        <div 
          v-if="showContextMenu" 
          class="custom-context-menu" 
          :style="{ top: contextMenuPos.y + 'px', left: contextMenuPos.x + 'px' }"
          @click.stop
        >
          <button @click="validateZone">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M12 5v14M5 12h14"/></svg>
            Créer la zone
          </button>
        </div>
      </Teleport>

      <div v-if="selectedTableIndex !== null" class="properties-panel">
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
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
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
  stroke: #ff4500;
  stroke-width: 3;
}
.wall-shape {
  fill: rgba(60, 60, 60, 0.15);
  stroke: #2b2b2b;
  stroke-width: 4;
  stroke-linecap: square;
  stroke-linejoin: miter;
  cursor: pointer;
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

/* Context Menu */
.custom-context-menu {
  position: fixed;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  padding: 4px;
  min-width: 160px;
}

.custom-context-menu button {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #1e293b;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.custom-context-menu button:hover {
  background-color: #f1f5f9;
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
