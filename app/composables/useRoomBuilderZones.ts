import type { Ref } from 'vue';

interface ZoneData {
  id?: number;
  name?: string;
  type: 'zone' | 'estrade' | 'terrasse';
  units: Set<string>;
}

interface ZoneActionsOptions {
  roomZonesData: Ref<ZoneData[]>;
  currentZoneUnits: Ref<Set<string>>;
  selectedZoneType: Ref<'zone' | 'estrade' | 'terrasse'>;
  showZoneNamingModal: Ref<boolean>;
  newZoneName: Ref<string>;
  showContextMenu: Ref<boolean>;
  gridSize: number;
  save: () => void | Promise<void>;
}

export const useRoomBuilderZones = (options: ZoneActionsOptions) => {
  const {
    roomZonesData,
    currentZoneUnits,
    selectedZoneType,
    showZoneNamingModal,
    newZoneName,
    showContextMenu,
    gridSize,
    save
  } = options;

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
        name:
          newZoneName.value ||
          (selectedZoneType.value === 'zone'
            ? 'Nouvelle zone'
            : selectedZoneType.value === 'estrade'
            ? 'Nouvelle estrade'
            : 'Nouvelle terrasse'),
        type: selectedZoneType.value,
        units: new Set(currentZoneUnits.value)
      });
      currentZoneUnits.value.clear();
      showZoneNamingModal.value = false;
      showContextMenu.value = false;
      save();
    }
  };

  const deleteZone = (index: number) => {
    roomZonesData.value.splice(index, 1);
    save();
  };

  const getZoneCenter = (units: Set<string>) => {
    if (units.size === 0) return { x: 0, y: 0 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    units.forEach((unit) => {
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

  return {
    validateZone,
    confirmCreateZone,
    deleteZone,
    getZoneCenter
  };
};
