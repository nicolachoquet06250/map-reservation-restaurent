import type { Ref } from 'vue';
import type { Door, Table } from '~/types';

export const useRoomBuilderHistory = (
  tables: Ref<Table[]>,
  wallPoints: Ref<Array<{ x: number; y: number }>>,
  doors: Ref<Door[]>
) => {
  const undoStack = ref<string[]>([]);
  const redoStack = ref<string[]>([]);

  const takeSnapshot = () => {
    undoStack.value.push(
      JSON.stringify({
        tables: tables.value,
        wallPoints: wallPoints.value,
        doors: doors.value
      })
    );
    redoStack.value = [];
    if (undoStack.value.length > 50) {
      undoStack.value.shift();
    }
  };

  const undo = () => {
    if (undoStack.value.length > 0) {
      redoStack.value.push(
        JSON.stringify({
          tables: tables.value,
          wallPoints: wallPoints.value,
          doors: doors.value
        })
      );
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
      undoStack.value.push(
        JSON.stringify({
          tables: tables.value,
          wallPoints: wallPoints.value,
          doors: doors.value
        })
      );
      const nextStateString = redoStack.value.pop();
      if (nextStateString) {
        const nextState = JSON.parse(nextStateString);
        tables.value = nextState.tables;
        wallPoints.value = nextState.wallPoints;
        doors.value = nextState.doors || [];
      }
    }
  };

  return {
    undoStack,
    redoStack,
    takeSnapshot,
    undo,
    redo
  };
};
