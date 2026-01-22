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

export interface Door {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type: 'simple' | 'double';
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

const doors_ = ref<Door[]>([]);
const draggingDoor = ref<number | null>(null);
const rotatingDoor = ref<number | null>(null);
const selectedDoorIndex = ref<number | null>(null);

const roomLayers = ref<Array<{ id: number; name: string; type: string }>>([]);
const activeLayerId = ref<number | null>(null);
const selectedZoneType = ref<'zone' | 'estrade' | 'terrasse'>('zone');
const roomZonesData = ref<Array<{ id?: number; name?: string; type: 'zone' | 'estrade' | 'terrasse'; units: Set<string> }>>([]);
const currentZoneUnits = ref<Set<string>>(new Set());
const isDrawingZone = ref(false);
const zoneDragStart = ref<{ x: number; y: number } | null>(null);
const zoneDragEnd = ref<{ x: number; y: number } | null>(null);

const showZoneNamingModal = ref(false);
const showShortcutsModal = ref(false);
const showDoorDropdown = ref(false);
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
    selectedDoorIndex.value = null;
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
    wallPoints: wallPoints.value,
    doors: doors_.value
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
      wallPoints: wallPoints.value,
      doors: doors_.value
    }));
    const previousStateString = undoStack.value.pop();
    if (previousStateString) {
      const previousState = JSON.parse(previousStateString);
      _tables.value = previousState.tables;
      wallPoints.value = previousState.wallPoints;
      doors_.value = previousState.doors || [];
    }
  }
};

const redo = () => {
  if (redoStack.value.length > 0) {
    undoStack.value.push(JSON.stringify({
      tables: _tables.value,
      wallPoints: wallPoints.value,
      doors: doors_.value
    }));
    const nextStateString = redoStack.value.pop();
    if (nextStateString) {
      const nextState = JSON.parse(nextStateString);
      _tables.value = nextState.tables;
      wallPoints.value = nextState.wallPoints;
      doors_.value = nextState.doors || [];
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

const roomSlug = ref<string | null>(null);

const loadRoom = async () => {
  try {
    const data = await $fetch<{
      room: {
        points: string | null;
        slug: string | null;
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
      }[],
      doors: {
        id?: number;
        rotation: number | null;
      }[]
    }>(`/api/room?id=${props.roomId}`);
    
    if (data?.room) {
      roomSlug.value = data.room.slug || null;
      if (data.room.points) {
        const points = data.room.points.split(' ').map(p => {
          const [x, y] = p.split(',').map(Number);
          return { x, y };
        });
        wallPoints.value = points as { x: number; y: number; }[];
        wallStartPoint.value = (points[0] || null) as { x: number; y: number; } | null;
        wallClosed.value = true;
      } else {
        wallPoints.value = [];
        wallStartPoint.value = null;
        wallClosed.value = false;
      }
    } else {
      roomSlug.value = null;
      wallPoints.value = [];
      wallStartPoint.value = null;
      wallClosed.value = false;
    }

    if (data?.doors) {
      doors_.value = data.doors.map(d => ({
        ...d,
        rotation: d.rotation || 0,
        type: (d as any).type || 'simple'
      } as Door));
      // Assurer que les portes sont bien alignées avec les murs chargés
      nextTick(() => {
          doors_.value.forEach((_, dIdx) => alignDoorToWall(dIdx));
      });
    } else {
      doors_.value = [];
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

const getRoomCenter = () => {
  if (wallPoints.value.length === 0) return { x: 100, y: 100 };
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  wallPoints.value.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  
  return {
    x: snapToGrid({ x: (minX + maxX) / 2, y: 0 }).x,
    y: snapToGrid({ x: 0, y: (minY + maxY) / 2 }).y
  };
};

const addTable = async () => {
  const center = getRoomCenter();
  const width = 100;
  const height = 100;
  
  const newTable: Table = {
    name: `Table ${_tables.value.length + 1}`,
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    rotation: 0,
    shape: 'rectangle',
    extraAttributes: {
      lThicknessX: 40,
      lThicknessY: 40,
      uThickness: 30,
      uBaseThickness: 30
    },
    chairs: ([] as Chair[])
  };

  if (!isTableInValidArea(newTable)) {
    // Si le centre n'est pas valide (salle en forme de L par exemple), 
    // on essaie de trouver une position proche ou on prévient l'utilisateur.
    const Notify = (await import('simple-notify')).default;
    // @ts-ignore
    new Notify({
      status: 'warning',
      title: 'Position par défaut',
      text: 'La table a été placée au centre de la vue car le centre de la pièce est occupé ou invalide.',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
    
    // Fallback à une position simple si le centre est invalide
    if (!isPointInValidArea(newTable.x, newTable.y)) {
       newTable.x = 50;
       newTable.y = 50;
    }
  }

  takeSnapshot();
  _tables.value.push(newTable);
  selectedTableIndex.value = _tables.value.length - 1;
  selectedChairIndex.value = null;
};

const addDoor = (type: 'simple' | 'double' = 'simple') => {
  takeSnapshot();
  
  // Essayer de placer la porte au centre du premier mur ou au centre de la vue
  let initialX = 100;
  let initialY = 100;
  let initialRotation = 0;
  const initialWidth = type === 'double' ? 120 : 60;

  if (wallSegments.value.length > 0) {
    const firstSegment = wallSegments.value[0];
    if (firstSegment) {
        initialX = (firstSegment.p1!.x + firstSegment.p2!.x) / 2 - initialWidth / 2;
        initialY = (firstSegment.p1!.y + firstSegment.p2!.y) / 2 - 5;
        initialRotation = firstSegment.isHorizontal ? 0 : 90;
    }
  }

  doors_.value.push({
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: 10,
    rotation: initialRotation,
    type
  });
  selectedDoorIndex.value = doors_.value.length - 1;
  selectedTableIndex.value = null;
  selectedChairIndex.value = null;
  wallSelected.value = false;
};

const flipDoor = (index: number) => {
  takeSnapshot();
  const door = doors_.value[index];
  if (door) {
    door.rotation = (door.rotation + 180) % 360;
  }
};

const removeDoor = (index: number) => {
  takeSnapshot();
  doors_.value.splice(index, 1);
  selectedDoorIndex.value = null;
};

const startDragDoor = (event: MouseEvent, index: number) => {
  takeSnapshot();
  draggingDoor.value = index;
  selectedDoorIndex.value = index;
  selectedTableIndex.value = null;
  selectedChairIndex.value = null;
  wallSelected.value = false;

  const rect = svgCanvas.value!.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) / zoomLevel.value;
  const mouseY = (event.clientY - rect.top) / zoomLevel.value;

  offset.x = mouseX - doors_.value[index]!.x - panOffset.value.x;
  offset.y = mouseY - doors_.value[index]!.y - panOffset.value.y;
};

const startRotateDoor = (event: MouseEvent, index: number) => {
  event.stopPropagation();
  takeSnapshot();
  rotatingDoor.value = index;
  const door = doors_.value[index];
  const centerX = (door?.x ?? 0) + (door?.width ?? 0) / 2 + panOffset.value.x;
  const centerY = (door?.y ?? 0) + (door?.height ?? 0) / 2 + panOffset.value.y;

  const rect = svgCanvas.value!.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) / zoomLevel.value;
  const mouseY = (event.clientY - rect.top) / zoomLevel.value;

  startRotationAngle.value = Math.atan2(mouseY - centerY, mouseX - centerX);
  initialDoorRotation.value = door?.rotation || 0;
};

const initialDoorRotation = ref(0);

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
const draggingTableOriginalPos = ref<{ x: number, y: number, rotation: number, chairs: { x: number, y: number }[] } | null>(null);
const draggingChairOriginalPos = ref<{ x: number, y: number } | null>(null);
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
  if (table) {
    draggingTableOriginalPos.value = {
      x: table.x,
      y: table.y,
      rotation: table.rotation || 0,
      chairs: table.chairs.map(c => ({ x: c.x, y: c.y }))
    };
  }
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
  if (chair) {
    draggingChairOriginalPos.value = { x: chair.x, y: chair.y };
  }
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
  if (table) {
    draggingTableOriginalPos.value = {
      x: table.x,
      y: table.y,
      rotation: table.rotation || 0,
      chairs: table.chairs.map(c => ({ x: c.x, y: c.y }))
    };
  }
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

const isPointInValidArea = (x: number, y: number) => {
  // Check if point is inside the room
  if (isPointInRoom(x, y)) return true;
  
  // Check if point is on a terrasse
  for (const zone of roomZonesData.value) {
    if (zone.type === 'terrasse') {
      const cellX = Math.floor(x / gridSize) * gridSize;
      const cellY = Math.floor(y / gridSize) * gridSize;
      if (zone.units.has(`${cellX},${cellY}`)) {
        return true;
      }
    }
  }
  
  return false;
};

const isTableInValidArea = (table: Table) => {
  // We check the center of the table or its corners
  // For simplicity and better UX, checking if at least one part is in a valid area might be enough,
  // but the requirement "only inside the room and on terrasses" suggests the whole table should be valid.
  // Let's check the center and the corners.
  
  const points = [
    { x: table.x + table.width / 2, y: table.y + table.height / 2 }, // Center
    { x: table.x, y: table.y }, // Top-left
    { x: table.x + table.width, y: table.y }, // Top-right
    { x: table.x, y: table.y + table.height }, // Bottom-left
    { x: table.x + table.width, y: table.y + table.height } // Bottom-right
  ];

  // If table is rotated, these points should ideally be rotated too.
  if (table.rotation) {
    const angle = (table.rotation * Math.PI) / 180;
    const cx = table.x + table.width / 2;
    const cy = table.y + table.height / 2;
    
    return points.every(p => {
      const rotatedX = Math.cos(angle) * (p.x - cx) - Math.sin(angle) * (p.y - cy) + cx;
      const rotatedY = Math.sin(angle) * (p.x - cx) + Math.cos(angle) * (p.y - cy) + cy;
      return isPointInValidArea(rotatedX, rotatedY);
    });
  }

  return points.every(p => isPointInValidArea(p.x, p.y));
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

const isPointOnSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const d1 = Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
  const d2 = Math.sqrt(Math.pow(px - x2, 2) + Math.pow(py - y2, 2));
  const dLen = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  const buffer = 0.1;
  return d1 + d2 >= dLen - buffer && d1 + d2 <= dLen + buffer;
};

const getNearestPointOnWall = (x: number, y: number) => {
  let minDistance = Infinity;
  let nearestPoint = { x, y };
  let rotation = 0;

  if (!wallClosed.value || wallSegments.value.length === 0) return { nearestPoint, rotation };

  wallSegments.value.forEach(segment => {
    const { p1, p2 } = segment;
    const dx = p2!.x - p1!.x;
    const dy = p2!.y - p1!.y;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) return;

    let t = ((x - p1!.x) * dx + (y - p1!.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = p1!.x + t * dx;
    const projY = p1!.y + t * dy;

    const dist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));

    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = { x: projX, y: projY };
      // La rotation dépend si le segment est horizontal ou vertical
      // Dans ce projet, les murs semblent être orthogonaux d'après alignToGridLine
      rotation = Math.abs(dx) > Math.abs(dy) ? 0 : 90;
    }
  });

  return { nearestPoint, rotation };
};

const flipTable = (index: number) => {
  takeSnapshot();
  const table = _tables.value[index];
  if (table) {
    table.rotation = ((table.rotation || 0) + 180) % 360;
  }
};

const flipChair = (tableIndex: number, chairIndex: number) => {
  takeSnapshot();
  const chair = _tables.value[tableIndex]?.chairs[chairIndex];
  if (chair) {
    chair.rotation = (chair.rotation + 180) % 360;
  }
};

const alignDoorToWall = (index: number) => {
  const door = doors_.value[index];
  if (!door) return;
  const { nearestPoint, rotation } = getNearestPointOnWall(door.x + door.width / 2, door.y + door.height / 2);
  door.x = nearestPoint.x - door.width / 2;
  door.y = nearestPoint.y - door.height / 2;
  
  // Conserver le flip si présent (180 ou 270 selon l'axe)
  const isFlipped = (door.rotation % 360) === ((rotation + 180) % 360);
  door.rotation = isFlipped ? (rotation + 180) % 360 : rotation;
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

    // Aimantage si Ctrl est pressé
    if (event.ctrlKey) {
      const snapThreshold = 30;
      let snapX = null;
      let snapY = null;
      let minDistX = snapThreshold;
      let minDistY = snapThreshold;

      _tables.value.forEach((otherTable, idx) => {
        if (idx === draggingTable.value) return;
        
        const dx = Math.abs(table!.x - otherTable.x);
        const dy = Math.abs(table!.y - otherTable.y);

        if (dx < minDistX) {
          minDistX = dx;
          snapX = otherTable.x;
        }
        if (dy < minDistY) {
          minDistY = dy;
          snapY = otherTable.y;
        }
      });

      const oldSnappedX = table!.x;
      const oldSnappedY = table!.y;

      if (snapX !== null) table!.x = snapX;
      if (snapY !== null) table!.y = snapY;

      // Déplacer les chaises proportionnellement à l'aimantage
      const snapDx = table!.x - oldSnappedX;
      const snapDy = table!.y - oldSnappedY;
      if (snapDx !== 0 || snapDy !== 0) {
        table?.chairs.forEach(chair => {
          chair.x += snapDx;
          chair.y += snapDy;
        });
      }
    }
  } else if (draggingChair.value !== null) {
    const { tableIndex, chairIndex } = draggingChair.value;
    const table = _tables.value[tableIndex];
    const chair = table?.chairs[chairIndex];
    chair!.x = mouseX - offset.x - panOffset.value.x;
    chair!.y = mouseY - offset.y - panOffset.value.y;

    // Aimantage si Ctrl est pressé
    if (event.ctrlKey) {
      const snapThreshold = 30;
      let snapX = null;
      let snapY = null;
      let minDistX = snapThreshold;
      let minDistY = snapThreshold;

      _tables.value.forEach((t) => {
        t.chairs.forEach((otherChair) => {
          if (otherChair === chair) return;

          const dx = Math.abs(chair!.x - otherChair.x);
          const dy = Math.abs(chair!.y - otherChair.y);

          if (dx < minDistX) {
            minDistX = dx;
            snapX = otherChair.x;
          }
          if (dy < minDistY) {
            minDistY = dy;
            snapY = otherChair.y;
          }
        });
      });

      if (snapX !== null) chair!.x = snapX;
      if (snapY !== null) chair!.y = snapY;
    }

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
  } else if (draggingDoor.value !== null) {
    const door = doors_.value[draggingDoor.value];
    if (door) {
      const targetX = mouseX - offset.x - panOffset.value.x;
      const targetY = mouseY - offset.y - panOffset.value.y;

      const { nearestPoint, rotation } = getNearestPointOnWall(targetX + door.width / 2, targetY + door.height / 2);
      
      // On centre la porte sur le point le plus proche
      door.x = nearestPoint.x - door.width / 2;
      door.y = nearestPoint.y - door.height / 2;
      
      // Conserver le flip pendant le drag
      const isFlipped = (door.rotation % 360) === ((rotation + 180) % 360);
      door.rotation = isFlipped ? (rotation + 180) % 360 : rotation;
    }
  } else if (rotatingDoor.value !== null) {
    const door = doors_.value[rotatingDoor.value];
    const centerX = (door?.x ?? 0) + (door?.width ?? 0) / 2 + panOffset.value.x;
    const centerY = (door?.y ?? 0) + (door?.height ?? 0) / 2 + panOffset.value.y;

    const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
    const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);

    door!.rotation = (initialDoorRotation.value + deltaAngle) % 360;
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
  
    // Recaler les portes sur les murs après avoir déplacé un segment
    doors_.value.forEach((_, dIdx) => alignDoorToWall(dIdx));
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

const stopDrag = async (event: MouseEvent) => {
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
        // Sauf si c'est une terrasse, on autorise tout
        const isTerrasse = selectedZoneType.value === 'terrasse';
        const hasPointInside = isTerrasse || isPointInRoom(x + gridSize / 2, y + gridSize / 2) || [
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
        // Sauf si c'est une terrasse, on autorise tout
        const isTerrasse = selectedZoneType.value === 'terrasse';
        const hasPointInside = isTerrasse || isPointInRoom(cell.x + gridSize / 2, cell.y + gridSize / 2) || [
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

  if (draggingTable.value !== null || rotatingTable.value !== null) {
    const tableIndex = draggingTable.value !== null ? draggingTable.value : rotatingTable.value;
    const table = _tables.value[tableIndex!];
    if (table && !isTableInValidArea(table)) {
      // Notification
      const Notify = (await import('simple-notify')).default;
      // @ts-ignore
      new Notify({
        status: 'warning',
        title: 'Placement impossible',
        text: 'Les tables doivent être placées à l\'intérieur de la salle ou sur une terrasse.',
        autoclose: true,
        autotimeout: 3000,
        notificationsGap: 20,
        type: 'outline',
        position: 'right top',
        customClass: 'custom-notify'
      });

      // Reset position et rotation
      if (draggingTableOriginalPos.value) {
        table.x = draggingTableOriginalPos.value.x;
        table.y = draggingTableOriginalPos.value.y;
        table.rotation = draggingTableOriginalPos.value.rotation;
        table.chairs.forEach((chair, i) => {
          if (draggingTableOriginalPos.value!.chairs[i]) {
            chair.x = draggingTableOriginalPos.value!.chairs[i]!.x;
            chair.y = draggingTableOriginalPos.value!.chairs[i]!.y;
          }
        });
      }
    }
  }

  if (draggingChair.value !== null) {
    const { tableIndex, chairIndex } = draggingChair.value;
    const chair = _tables.value[tableIndex]?.chairs[chairIndex];
    if (chair && !isPointInValidArea(chair.x + 15, chair.y + 15)) {
      // Notification
      const Notify = (await import('simple-notify')).default;
      // @ts-ignore
      new Notify({
        status: 'warning',
        title: 'Placement impossible',
        text: 'Les chaises doivent être placées à l\'intérieur de la salle ou sur une terrasse.',
        autoclose: true,
        autotimeout: 3000,
        notificationsGap: 20,
        type: 'outline',
        position: 'right top',
        customClass: 'custom-notify'
      });

      // Reset position
      if (draggingChairOriginalPos.value) {
        chair.x = draggingChairOriginalPos.value.x;
        chair.y = draggingChairOriginalPos.value.y;
        chair.relativeX = chair.x - (_tables.value[tableIndex]?.x ?? 0);
        chair.relativeY = chair.y - (_tables.value[tableIndex]?.y ?? 0);
      }
    }
  }

  draggingTable.value = null;
  draggingTableOriginalPos.value = null;
  draggingChair.value = null;
  draggingChairOriginalPos.value = null;
  rotatingTable.value = null;
  rotatingChair.value = null;
  draggingDoor.value = null;
  rotatingDoor.value = null;
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
      // Sauf si c'est une terrasse, on autorise tout
      const isTerrasse = selectedZoneType.value === 'terrasse';
      if (!isTerrasse && !isPointInRoom(cell.x + gridSize / 2, cell.y + gridSize / 2)) {
        return;
      }
      isDrawingZone.value = true;
      zoneDragStart.value = cell;
      zoneDragEnd.value = zoneDragStart.value;
      return;
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


const emit = defineEmits(['saved']);

const validateZone = () => {
  showContextMenu.value = false;
  if (currentZoneUnits.value.size > 0) {
    newZoneName.value = '';
    showZoneNamingModal.value = true;
  }
};

const confirmCreateZone = () => {
  if (currentZoneUnits.value.size > 0) {
    roomZonesData.value.push({
      name: newZoneName.value || (selectedZoneType.value === 'zone' ? 'Nouvelle zone' : (selectedZoneType.value === 'estrade' ? 'Nouvelle estrade' : 'Nouvelle terrasse')),
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
    const [x = 0, y = 0] = unit.split(',').map(Number);
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
      const newTable = data;
      delete newTable._type;
      newTable.x += 20;
      newTable.y += 20;
      newTable.chairs.forEach((chair: any) => {
        chair.x += 20;
        chair.y += 20;
        chair.rotation = chair.rotation || 0;
      });

      if (!isTableInValidArea(newTable)) {
        const Notify = (await import('simple-notify')).default;
        // @ts-ignore
        new Notify({
          status: 'warning',
          title: 'Collage impossible',
          text: 'La table collée serait en dehors de la salle ou d\'une terrasse.',
          autoclose: true,
          autotimeout: 3000,
          notificationsGap: 20,
          type: 'outline',
          position: 'right top',
          customClass: 'custom-notify'
        });
        return;
      }
      
      takeSnapshot();
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
        })),
        doors: doors_.value
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
      selectedDoorIndex.value = null;
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
  window.addEventListener('click', (e) => {
    console.log((e.target as HTMLElement), (e.target as HTMLElement).getAttribute('data-action'))
    if ((e.target as HTMLElement).getAttribute('data-action') !== 'add-door-dropdown') {
      showDoorDropdown.value = false;
    }
  });
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
              <button 
                v-if="!roomSlug" 
                class="btn btn-sm btn-primary" 
                style="margin-left: 8px;"
                @click="save"
              >
                Générer une url
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
          <button class="btn btn-sm btn-ghost btn-info" @click="showShortcutsModal = true">
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

        <!-- Modal pour les raccourcis clavier -->
        <div v-if="showShortcutsModal" class="modal-overlay" @click="showShortcutsModal = false">
          <div class="modal-content shortcuts-modal" @click.stop>
            <div class="modal-header">
              <h3>Raccourcis clavier</h3>
              <button class="btn-close" @click="showShortcutsModal = false">&times;</button>
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
              <button class="btn btn-primary" @click="showShortcutsModal = false">Fermer</button>
            </div>
          </div>
        </div>
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
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1e293b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

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
.shortcuts-modal {
  max-width: 500px !important;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
}
.modal-header h3 {
  margin: 0;
  color: #1e293b;
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
