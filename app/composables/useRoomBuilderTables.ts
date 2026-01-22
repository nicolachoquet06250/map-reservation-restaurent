import type { Ref } from 'vue';
import type { Chair, Table } from '~/components/room-builder/types';

interface TableActionsOptions {
  tables: Ref<Table[]>;
  wallPoints: Ref<Array<{ x: number; y: number }>>;
  selectedTableIndex: Ref<number | null>;
  selectedChairIndex: Ref<{ tableIndex: number; chairIndex: number } | null>;
  snapToGrid: (point: { x: number; y: number }) => { x: number; y: number };
  isTableInValidArea: (table: Table) => boolean;
  isPointInValidArea: (x: number, y: number) => boolean;
  takeSnapshot: () => void;
}

export const useRoomBuilderTables = (options: TableActionsOptions) => {
  const {
    tables,
    wallPoints,
    selectedTableIndex,
    selectedChairIndex,
    snapToGrid,
    isTableInValidArea,
    isPointInValidArea,
    takeSnapshot
  } = options;

  const getRoomCenter = () => {
    if (wallPoints.value.length === 0) return { x: 100, y: 100 };

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    wallPoints.value.forEach((p) => {
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
      name: `Table ${tables.value.length + 1}`,
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

      if (!isPointInValidArea(newTable.x, newTable.y)) {
        newTable.x = 50;
        newTable.y = 50;
      }
    }

    takeSnapshot();
    tables.value.push(newTable);
    selectedTableIndex.value = tables.value.length - 1;
    selectedChairIndex.value = null;
  };

  const addChair = (tableIndex: number) => {
    takeSnapshot();
    const table = tables.value[tableIndex];
    if (table?.chairs === null) {
      table.chairs = [];
    }
    table?.chairs.push({
      x: table.x + table.width + 10,
      y: table.y + table.height / 2 - 15,
      relativeX: table.width + 10,
      relativeY: table.height / 2 - 15,
      rotation: 0
    });
    selectedChairIndex.value = {
      tableIndex,
      chairIndex: (table?.chairs.length ?? 0) - 1
    };
  };

  const removeTable = async (index: number) => {
    takeSnapshot();
    const table = tables.value[index];
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
    tables.value.splice(index, 1);
    selectedTableIndex.value = null;
    selectedChairIndex.value = null;
  };

  const removeChair = async (tableIndex: number, chairIndex: number) => {
    takeSnapshot();
    const chair = tables.value[tableIndex]?.chairs[chairIndex] as any;
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
    tables.value[tableIndex]?.chairs.splice(chairIndex, 1);
    selectedChairIndex.value = null;
  };

  const flipTable = (index: number) => {
    takeSnapshot();
    const table = tables.value[index];
    if (table) {
      table.rotation = ((table.rotation || 0) + 180) % 360;
    }
  };

  const flipChair = (tableIndex: number, chairIndex: number) => {
    takeSnapshot();
    const chair = tables.value[tableIndex]?.chairs[chairIndex];
    if (chair) {
      chair.rotation = (chair.rotation + 180) % 360;
    }
  };

  return {
    addTable,
    addChair,
    removeTable,
    removeChair,
    flipTable,
    flipChair
  };
};
