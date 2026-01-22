import type { Ref } from 'vue';
import type { Door } from '~/components/room-builder/types';

interface DoorActionsOptions {
  doors: Ref<Door[]>;
  wallSegments: Ref<
    Array<{ p1: { x: number; y: number }; p2: { x: number; y: number }; isHorizontal: boolean }>
  >;
  selectedDoorIndex: Ref<number | null>;
  selectedTableIndex: Ref<number | null>;
  selectedChairIndex: Ref<{ tableIndex: number; chairIndex: number } | null>;
  wallSelected: Ref<boolean>;
  takeSnapshot: () => void;
}

export const useRoomBuilderDoors = (options: DoorActionsOptions) => {
  const {
    doors,
    wallSegments,
    selectedDoorIndex,
    selectedTableIndex,
    selectedChairIndex,
    wallSelected,
    takeSnapshot
  } = options;

  const addDoor = (type: 'simple' | 'double' = 'simple') => {
    takeSnapshot();

    let initialX = 100;
    let initialY = 100;
    let initialRotation = 0;
    const initialWidth = type === 'double' ? 120 : 60;

    if (wallSegments.value.length > 0) {
      const firstSegment = wallSegments.value[0];
      if (firstSegment) {
        initialX = (firstSegment.p1.x + firstSegment.p2.x) / 2 - initialWidth / 2;
        initialY = (firstSegment.p1.y + firstSegment.p2.y) / 2 - 5;
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

  return {
    addDoor,
    flipDoor,
    removeDoor
  };
};
