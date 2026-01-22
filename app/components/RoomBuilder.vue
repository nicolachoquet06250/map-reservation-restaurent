<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
import type { Chair, Door, Table } from '~/components/room-builder/types';
import { useRoomBuilderGrid } from '~/composables/useRoomBuilderGrid';
import { useRoomBuilderHistory } from '~/composables/useRoomBuilderHistory';
import { useRoomBuilderZoom } from '~/composables/useRoomBuilderZoom';

const props = defineProps<{
  roomId: number;
  roomName: string;
}>();

const _tables = ref<Table[]>([]);
const roomName = ref(props.roomName);
const { zoomLevel, zoomIn, zoomOut } = useRoomBuilderZoom(1);
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
const { undoStack, redoStack, takeSnapshot, undo, redo } = useRoomBuilderHistory(
  _tables,
  wallPoints,
  doors_
);

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

const clearSelectedChair = () => {
  selectedChairIndex.value = null;
};

const ensureTableExtraAttributes = (index: number) => {
  if (!_tables.value[index]?.extraAttributes) {
    _tables.value[index]!.extraAttributes = {
      lThicknessX: 40,
      lThicknessY: 40,
      uThickness: 30,
      uBaseThickness: 30
    };
  }
};

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

const handleAddDoor = (type: 'simple' | 'double') => {
  addDoor(type);
  showDoorDropdown.value = false;
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

const { snapToGrid, alignToGridLine, getGridPointFromEvent, getGridCellFromEvent } =
  useRoomBuilderGrid(gridSize, svgCanvas, zoomLevel, panOffset);

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
    <RoomBuilderToolbar
      :room-name="roomName"
      :room-slug="roomSlug"
      :zoom-level="zoomLevel"
      :undo-disabled="undoStack.length === 0"
      :redo-disabled="redoStack.length === 0"
      :room-layers="roomLayers"
      :active-layer-id="activeLayerId"
      :active-layer-type="activeLayerType"
      :selected-zone-type="selectedZoneType"
      :current-zone-units-size="currentZoneUnits.size"
      :wall-closed="wallClosed"
      :wall-selected="wallSelected"
      :show-door-dropdown="showDoorDropdown"
      @update:roomName="roomName = $event"
      @generate-url="save"
      @undo="undo"
      @redo="redo"
      @set-active-layer="activeLayerId = $event"
      @add-table="addTable"
      @toggle-door-dropdown="showDoorDropdown = !showDoorDropdown"
      @add-door="handleAddDoor"
      @update:selectedZoneType="selectedZoneType = $event"
      @validate-zone="validateZone"
      @reset-walls="resetWalls"
      @save="save"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @show-shortcuts="showShortcutsModal = true"
    />

    <RoomBuilderCanvas
      :svg-canvas="svgCanvas"
      :zoom-level="zoomLevel"
      :pan-offset="panOffset"
      :grid-size="gridSize"
      :is-interacting="isInteracting"
      :wall-closed="wallClosed"
      :wall-points="wallPoints"
      :wall-selected="wallSelected"
      :wall-segments="wallSegments"
      :wall-polyline-points="wallPolylinePoints"
      :active-layer-type="activeLayerType"
      :room-zones-data="roomZonesData"
      :current-zone-units="currentZoneUnits"
      :selected-zone-type="selectedZoneType"
      :is-drawing-zone="isDrawingZone"
      :zone-drag-start="zoneDragStart"
      :zone-drag-end="zoneDragEnd"
      :doors="doors_"
      :selected-door-index="selectedDoorIndex"
      :tables="_tables"
      :selected-table-index="selectedTableIndex"
      :selected-chair-index="selectedChairIndex"
      :dragging-table="draggingTable"
      :is-table-in-valid-area="isTableInValidArea"
      :get-zone-center="getZoneCenter"
      :handle-wall-click="handleWallClick"
      :stop-drag="stopDrag"
      :deselect="deselect"
      :select-wall="selectWall"
      :start-drag-wall-segment="startDragWallSegment"
      :start-drag-door="startDragDoor"
      :start-drag-table="startDragTable"
      :start-rotate-table="startRotateTable"
      :start-drag-chair="startDragChair"
      :start-rotate-chair="startRotateChair"
      :handle-context-menu="handleContextMenu"
      :delete-zone="deleteZone"
    />

    <RoomBuilderModals
      :show-delete-wall-modal="showDeleteWallModal"
      :show-zone-naming-modal="showZoneNamingModal"
      :show-context-menu="showContextMenu"
      :show-shortcuts-modal="showShortcutsModal"
      :context-menu-pos="contextMenuPos"
      :selected-zone-type="selectedZoneType"
      :new-zone-name="newZoneName"
      :zone-name-input="zoneNameInput"
      @close-delete-wall-modal="showDeleteWallModal = false"
      @perform-reset-walls="performResetWalls"
      @close-zone-naming-modal="showZoneNamingModal = false"
      @confirm-create-zone="confirmCreateZone"
      @update:newZoneName="newZoneName = $event"
      @validate-zone="validateZone"
      @close-shortcuts-modal="showShortcutsModal = false"
    />

    <RoomBuilderPropertiesPanel
      :tables="_tables"
      :doors="doors_"
      :selected-table-index="selectedTableIndex"
      :selected-chair-index="selectedChairIndex"
      :selected-door-index="selectedDoorIndex"
      :flip-chair="flipChair"
      :remove-chair="removeChair"
      :clear-selected-chair="clearSelectedChair"
      :flip-table="flipTable"
      :add-chair="addChair"
      :remove-table="removeTable"
      :ensure-table-extra-attributes="ensureTableExtraAttributes"
      :align-door-to-wall="alignDoorToWall"
      :flip-door="flipDoor"
      :remove-door="removeDoor"
    />
  </div>
</template>

<style src=\"./room-builder/room-builder.css\"></style>
