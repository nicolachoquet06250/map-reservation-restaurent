import type { Ref } from 'vue';
import type { RoomLayer, RoomZone, ZoneType } from '~/types/room';

interface UseZonesOptions {
  gridSize: number;
  isPointInRoom: (x: number, y: number) => boolean;
  roomZonesData: Ref<RoomZone[]>;
  roomLayers: Ref<RoomLayer[]>;
  activeLayerId: Ref<number | null>;
  save: () => Promise<void> | void;
  getDefaultZoneName: (type: ZoneType) => string;
}

export const useZones = ({
  gridSize,
  isPointInRoom,
  roomZonesData,
  roomLayers,
  activeLayerId,
  save,
  getDefaultZoneName
}: UseZonesOptions) => {
  const selectedZoneType = ref<ZoneType>('zone');
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

  const isAdjacent = (unit1Str: string, unit2Str: string) => {
    const [x1, y1] = unit1Str.split(',').map(Number);
    const [x2, y2] = unit2Str.split(',').map(Number);
    const dx = Math.abs(x1! - x2!);
    const dy = Math.abs(y1! - y2!);
    return (dx === gridSize && dy === 0) || (dx === 0 && dy === gridSize);
  };

  const isPointInValidArea = (x: number, y: number) => {
    if (isPointInRoom(x, y)) return true;

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
        name: newZoneName.value || getDefaultZoneName(selectedZoneType.value),
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

  const handleZoneMouseMove = (event: MouseEvent, getGridCellFromEvent: (event: MouseEvent) => { x: number; y: number }) => {
    if (activeLayerType.value === 'zones' && event.ctrlKey && zoneDragStart.value) {
      zoneDragEnd.value = getGridCellFromEvent(event);
      const dx = Math.abs(zoneDragStart.value.x - zoneDragEnd.value.x);
      const dy = Math.abs(zoneDragStart.value.y - zoneDragEnd.value.y);
      if (dx > 0 || dy > 0) {
        isDrawingZone.value = true;
      }
      return true;
    }
    return false;
  };

  const handleZoneStopDrag = (event: MouseEvent, getGridCellFromEvent: (event: MouseEvent) => { x: number; y: number }) => {
    if (!isDrawingZone.value) return;

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
  };

  const startZoneDrawing = (event: MouseEvent, getGridCellFromEvent: (event: MouseEvent) => { x: number; y: number }) => {
    const cell = getGridCellFromEvent(event);
    const isTerrasse = selectedZoneType.value === 'terrasse';
    if (!isTerrasse && !isPointInRoom(cell.x + gridSize / 2, cell.y + gridSize / 2)) {
      return false;
    }
    isDrawingZone.value = true;
    zoneDragStart.value = cell;
    zoneDragEnd.value = zoneDragStart.value;
    return true;
  };

  return {
    selectedZoneType,
    currentZoneUnits,
    isDrawingZone,
    zoneDragStart,
    zoneDragEnd,
    showZoneNamingModal,
    newZoneName,
    zoneNameInput,
    showContextMenu,
    contextMenuPos,
    activeLayerType,
    isPointInValidArea,
    validateZone,
    confirmCreateZone,
    handleContextMenu,
    deleteZone,
    getZoneCenter,
    handleZoneMouseMove,
    handleZoneStopDrag,
    startZoneDrawing
  };
};
