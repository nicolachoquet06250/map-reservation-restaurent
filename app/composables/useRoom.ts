import type { Ref } from 'vue';
import type {Door, Point, RoomLayer, RoomZone, Table} from '~/types/room';

interface UseRoomOptions {
  roomId: Ref<number>;
  initialRoomName: string;
  roomNameSource?: Ref<string>;
  tables: Ref<Table[]>;
  roomZonesData: Ref<RoomZone[]>;
  roomLayers: Ref<RoomLayer[]>;
  activeLayerId: Ref<number | null>;
  zoomLevel: Ref<number>;
  panOffset: Ref<{ x: number; y: number }>;
  svgCanvas: Ref<SVGElement | null>;
  dragOffset: { x: number; y: number };
  selectedTableIndex: Ref<number | null>;
  selectedChairIndex: Ref<{ tableIndex: number; chairIndex: number } | null>;
  onSaved?: () => void;
}

export const useRoom = ({
  roomId,
  initialRoomName,
  roomNameSource,
  tables,
  roomZonesData,
  roomLayers,
  activeLayerId,
  zoomLevel,
  panOffset,
  svgCanvas,
  dragOffset,
  selectedTableIndex,
  selectedChairIndex,
  onSaved
}: UseRoomOptions) => {
  const roomName = ref(initialRoomName);
  const roomSlug = ref<string | null>(null);

  const wallPoints = ref<Array<{ x: number; y: number }>>([]);
  const wallStartPoint = ref<{ x: number; y: number } | null>(null);
  const wallPreviewPoint = ref<{ x: number; y: number } | null>(null);
  const wallClosed = ref(false);
  const wallSelected = ref(false);
  const showDeleteWallModal = ref(false);
  const draggingWallSegment = ref<{ index1: number; index2: number; isHorizontal: boolean } | null>(null);

  const doors = ref<Door[]>([]);
  const draggingDoor = ref<number | null>(null);
  const rotatingDoor = ref<number | null>(null);
  const selectedDoorIndex = ref<number | null>(null);
  const initialDoorRotation = ref(0);
  const startDoorRotationAngle = ref(0);

  const undoStack = ref<string[]>([]);
  const redoStack = ref<string[]>([]);

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

  const wallPolylinePoints = computed(() => {
    const points = wallPoints.value.map(point => `${point.x},${point.y}`);
    if (wallPreviewPoint.value && !wallClosed.value) {
      points.push(`${wallPreviewPoint.value.x},${wallPreviewPoint.value.y}`);
    }
    return points.join(' ');
  });

  const takeSnapshot = () => {
    undoStack.value.push(JSON.stringify({
      tables: tables.value,
      wallPoints: wallPoints.value,
      doors: doors.value
    }));
    redoStack.value = [];
    if (undoStack.value.length > 50) {
      undoStack.value.shift();
    }
  };

  const undo = () => {
    if (undoStack.value.length > 0) {
      redoStack.value.push(JSON.stringify({
        tables: tables.value,
        wallPoints: wallPoints.value,
        doors: doors.value
      }));
      const previousStateString = undoStack.value.pop();
      if (previousStateString) {
        const previousState = JSON.parse(previousStateString);
        tables.value = previousState.tables;
        wallPoints.value = previousState.wallPoints;
        doors.value = previousState.doors || [];
      }
    }
  };

  const redo = () => {
    if (redoStack.value.length > 0) {
      undoStack.value.push(JSON.stringify({
        tables: tables.value,
        wallPoints: wallPoints.value,
        doors: doors.value
      }));
      const nextStateString = redoStack.value.pop();
      if (nextStateString) {
        const nextState = JSON.parse(nextStateString);
        tables.value = nextState.tables;
        wallPoints.value = nextState.wallPoints;
        doors.value = nextState.doors || [];
      }
    }
  };

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
    await save();
  };

  const addDoor = (type: 'simple' | 'double' = 'simple') => {
    takeSnapshot();

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

    doors.value.push({
      x: initialX,
      y: initialY,
      width: initialWidth,
      height: 10,
      rotation: initialRotation,
      type
    });
    selectedDoorIndex.value = doors.value.length - 1;
    selectedTableIndex.value = null;
    selectedChairIndex.value = null;
    wallSelected.value = false;
  };

  const flipDoor = (index: number) => {
    takeSnapshot();
    const door = doors.value[index];
    if (door) {
      door.rotation = (door.rotation + 180) % 360;
    }
  };

  const removeDoor = (index: number) => {
    takeSnapshot();
    doors.value.splice(index, 1);
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

    dragOffset.x = mouseX - doors.value[index]!.x - panOffset.value.x;
    dragOffset.y = mouseY - doors.value[index]!.y - panOffset.value.y;
  };

  const startRotateDoor = (event: MouseEvent, index: number) => {
    event.stopPropagation();
    takeSnapshot();
    rotatingDoor.value = index;
    const door = doors.value[index];
    const centerX = (door?.x ?? 0) + (door?.width ?? 0) / 2 + panOffset.value.x;
    const centerY = (door?.y ?? 0) + (door?.height ?? 0) / 2 + panOffset.value.y;

    const rect = svgCanvas.value!.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / zoomLevel.value;
    const mouseY = (event.clientY - rect.top) / zoomLevel.value;

    startDoorRotationAngle.value = Math.atan2(mouseY - centerY, mouseX - centerX);
    initialDoorRotation.value = door?.rotation || 0;
  };

  const isPointOnSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const d1 = Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
    const d2 = Math.sqrt(Math.pow(px - x2, 2) + Math.pow(py - y2, 2));
    const dLen = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    const buffer = 0.1;
    return d1 + d2 >= dLen - buffer && d1 + d2 <= dLen + buffer;
  };

  const isPointInRoom = (x: number, y: number) => {
    if (!wallClosed.value || wallPoints.value.length < 3) return false;

    let inside = false;
    for (let i = 0, j = wallPoints.value.length - 1; i < wallPoints.value.length; j = i++) {
      const xi = wallPoints.value[i]!.x, yi = wallPoints.value[i]!.y;
      const xj = wallPoints.value[j]!.x, yj = wallPoints.value[j]!.y;

      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    if (!inside) {
      for (const p of wallPoints.value) {
        if (Math.abs(p.x - x) < 0.1 && Math.abs(p.y - y) < 0.1) return true;
      }
      for (let i = 0, j = wallPoints.value.length - 1; i < wallPoints.value.length; j = i++) {
        if (isPointOnSegment(x, y, wallPoints.value[i]!.x, wallPoints.value[i]!.y, wallPoints.value[j]!.x, wallPoints.value[j]!.y)) {
          return true;
        }
      }
    }

    return inside;
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
        rotation = Math.abs(dx) > Math.abs(dy) ? 0 : 90;
      }
    });

    return { nearestPoint, rotation };
  };

  const alignDoorToWall = (index: number) => {
    const door = doors.value[index];
    if (!door) return;
    const { nearestPoint, rotation } = getNearestPointOnWall(door.x + door.width / 2, door.y + door.height / 2);
    door.x = nearestPoint.x - door.width / 2;
    door.y = nearestPoint.y - door.height / 2;

    const isFlipped = (door.rotation % 360) === ((rotation + 180) % 360);
    door.rotation = isFlipped ? (rotation + 180) % 360 : rotation;
  };

  const handleDoorMouseMove = (event: MouseEvent) => {
    if (!svgCanvas.value) return;
    const rect = svgCanvas.value.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / zoomLevel.value;
    const mouseY = (event.clientY - rect.top) / zoomLevel.value;

    if (draggingDoor.value !== null) {
      const door = doors.value[draggingDoor.value];
      if (door) {
        const targetX = mouseX - dragOffset.x - panOffset.value.x;
        const targetY = mouseY - dragOffset.y - panOffset.value.y;

        const { nearestPoint, rotation } = getNearestPointOnWall(targetX + door.width / 2, targetY + door.height / 2);

        door.x = nearestPoint.x - door.width / 2;
        door.y = nearestPoint.y - door.height / 2;

        const isFlipped = (door.rotation % 360) === ((rotation + 180) % 360);
        door.rotation = isFlipped ? (rotation + 180) % 360 : rotation;
      }
    } else if (rotatingDoor.value !== null) {
      const door = doors.value[rotatingDoor.value];
      const centerX = (door?.x ?? 0) + (door?.width ?? 0) / 2 + panOffset.value.x;
      const centerY = (door?.y ?? 0) + (door?.height ?? 0) / 2 + panOffset.value.y;

      const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
      const deltaAngle = (currentAngle - startDoorRotationAngle.value) * (180 / Math.PI);

      door!.rotation = (initialDoorRotation.value + deltaAngle) % 360;
    }
  };

  const handleWallSegmentDrag = (event: MouseEvent, getGridPointFromEvent: (event: MouseEvent) => { x: number; y: number }) => {
    if (!draggingWallSegment.value) return;
    const { index1, index2, isHorizontal } = draggingWallSegment.value;
    const snapped = getGridPointFromEvent(event);

    if (isHorizontal) {
      wallPoints.value[index1]!.y = snapped.y;
      wallPoints.value[index2]!.y = snapped.y;
    } else {
      wallPoints.value[index1]!.x = snapped.x;
      wallPoints.value[index2]!.x = snapped.x;
    }

    doors.value.forEach((_, dIdx) => alignDoorToWall(dIdx));
  };

  const updateWallPreview = (
    event: MouseEvent,
    getPointFromEvent: (event: MouseEvent) => Point,
    alignToGridLine: (point: Point, lastPoint: Point) => Point
  ) => {
    if (!wallStartPoint.value || wallClosed.value) return;
    const snapped = getPointFromEvent(event);
    const lastPoint = wallPoints.value[wallPoints.value.length - 1] ?? wallStartPoint.value;
    console.log(snapped, lastPoint, alignToGridLine(snapped, lastPoint));
    wallPreviewPoint.value = alignToGridLine(snapped, lastPoint);
  };

  const startDragWallSegment = (event: MouseEvent, segment: { index1: number; index2: number; isHorizontal: boolean }) => {
    if (event.ctrlKey || !wallSelected.value) return;
    takeSnapshot();
    event.stopPropagation();
    draggingWallSegment.value = {
      index1: segment.index1,
      index2: segment.index2,
      isHorizontal: segment.isHorizontal
    };
  };

  const handleWallClick = (
    event: MouseEvent,
    getGridPointFromEvent: (event: MouseEvent) => { x: number; y: number },
    alignToGridLine: (point: { x: number; y: number }, lastPoint: { x: number; y: number }) => { x: number; y: number }
  ) => {
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

  const loadRoom = async () => {
    try {
      const data = await $fetch<{
        room: {
          points: string | null;
          slug: string | null;
        } | null;
        layers: RoomLayer[];
        zones: {
          id: number;
          name?: string;
          type: 'zone' | 'estrade' | 'terrasse';
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
        }[];
        doors: {
          id?: number;
          rotation: number | null;
        }[];
      }>(`/api/room?id=${roomId.value}`);

      if (data?.room) {
        roomSlug.value = data.room.slug || null;
        if (data.room.points) {
          const points = data.room.points.split(' ').map(p => {
            const [x, y] = p.split(',').map(Number);
            return { x, y };
          });
          wallPoints.value = points as { x: number; y: number }[];
          wallStartPoint.value = (points[0] || null) as { x: number; y: number } | null;
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
        doors.value = data.doors.map(d => ({
          ...d,
          rotation: d.rotation || 0,
          type: (d as any).type || 'simple'
        } as Door));
        nextTick(() => {
          doors.value.forEach((_, dIdx) => alignDoorToWall(dIdx));
        });
      } else {
        doors.value = [];
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
          const tablesLayer = data.layers.find(l => l.type === 'tables');
          activeLayerId.value = tablesLayer ? tablesLayer.id : data.layers[0]!.id;
        }
      } else {
        roomLayers.value = [];
      }

      if (data?.tables) {
        tables.value = data.tables.map((t: any) => ({
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
        tables.value = [];
      }
    } catch (e) {
      console.log('Aucun plan existant ou erreur de chargement');
      tables.value = [];
    }
  };

  const save = async () => {
    const Notify = (await import('simple-notify')).default;
    try {
      const response = await $fetch<{ success: boolean; roomId: number }>(`/api/room?id=${roomId.value}`, {
        method: 'POST',
        body: {
          roomName: roomName.value,
          tables: tables.value,
          points: wallPoints.value.map(p => `${p.x},${p.y}`).join(' '),
          zones: roomZonesData.value.map(z => ({
            name: z.name || null,
            type: z.type,
            units: Array.from(z.units).join(' ')
          })),
          doors: doors.value
        }
      });

      if (response.success) {
        const currentWallSelected = wallSelected.value;
        const currentSelectedTableIndex = selectedTableIndex.value;
        const currentSelectedChairIndex = selectedChairIndex.value;

        await loadRoom();

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
      onSaved?.();
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

  const copyReservationLink = async () => {
    if (!roomSlug.value) return;
    const url = `${window.location.origin}/reservation/${roomSlug.value}`;
    await navigator.clipboard.writeText(url);
    const Notify = (await import('simple-notify')).default;
    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Lien copié',
      text: 'Le lien de réservation a été copié dans le presse-papier',
      autoclose: true,
      autotimeout: 2000,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
  };

  watch(roomId, async (newId) => {
    if (newId) {
      roomName.value = roomNameSource?.value ?? initialRoomName;
      await loadRoom();
    }
  });

  return {
    roomName,
    roomSlug,
    undoStack,
    redoStack,
    wallPoints,
    wallStartPoint,
    wallPreviewPoint,
    wallClosed,
    wallSelected,
    showDeleteWallModal,
    draggingWallSegment,
    wallSegments,
    wallPolylinePoints,
    doors,
    draggingDoor,
    rotatingDoor,
    selectedDoorIndex,
    initialDoorRotation,
    takeSnapshot,
    undo,
    redo,
    selectWall,
    resetWalls,
    performResetWalls,
    addDoor,
    flipDoor,
    removeDoor,
    startDragDoor,
    startRotateDoor,
    isPointInRoom,
    alignDoorToWall,
    handleDoorMouseMove,
    handleWallSegmentDrag,
    startDragWallSegment,
    updateWallPreview,
    handleWallClick,
    loadRoom,
    save,
    copyReservationLink
  };
};
