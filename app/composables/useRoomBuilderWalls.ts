import type { Ref } from 'vue';

interface WallActionsOptions {
  wallPoints: Ref<Array<{ x: number; y: number }>>;
  wallStartPoint: Ref<{ x: number; y: number } | null>;
  wallPreviewPoint: Ref<{ x: number; y: number } | null>;
  wallClosed: Ref<boolean>;
  wallSelected: Ref<boolean>;
  showDeleteWallModal: Ref<boolean>;
  selectedTableIndex: Ref<number | null>;
  selectedChairIndex: Ref<{ tableIndex: number; chairIndex: number } | null>;
  selectedDoorIndex: Ref<number | null>;
  save: () => Promise<void>;
}

export const useRoomBuilderWalls = (options: WallActionsOptions) => {
  const {
    wallPoints,
    wallStartPoint,
    wallPreviewPoint,
    wallClosed,
    wallSelected,
    showDeleteWallModal,
    selectedTableIndex,
    selectedChairIndex,
    selectedDoorIndex,
    save
  } = options;

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

  return {
    selectWall,
    resetWalls,
    performResetWalls
  };
};
