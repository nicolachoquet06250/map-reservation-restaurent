import type { Ref } from 'vue';
import type { Chair, Table } from '~/types/room';

interface UseTablesOptions {
  tables: Ref<Table[]>;
  gridSize: number;
  zoomLevel: Ref<number>;
  panOffset: Ref<{ x: number; y: number }>;
  svgCanvas: Ref<SVGElement | null>;
  dragOffset: { x: number; y: number };
  wallPoints: Ref<Array<{ x: number; y: number }>>;
  snapToGrid: (point: { x: number; y: number }) => { x: number; y: number };
  isPointInValidArea: (x: number, y: number) => boolean;
  takeSnapshot: () => void;
  selectedTableIndex?: Ref<number | null>;
  selectedChairIndex?: Ref<{ tableIndex: number; chairIndex: number } | null>;
}

export const useTables = ({
  tables,
  gridSize,
  zoomLevel,
  panOffset,
  svgCanvas,
  dragOffset,
  wallPoints,
  snapToGrid,
  isPointInValidArea,
  takeSnapshot,
  selectedTableIndex: selectedTableIndexInput,
  selectedChairIndex: selectedChairIndexInput
}: UseTablesOptions) => {
  const selectedTableIndex = selectedTableIndexInput ?? ref<number | null>(null);
  const selectedChairIndex = selectedChairIndexInput ?? ref<{ tableIndex: number; chairIndex: number } | null>(null);

  const draggingTable = ref<number | null>(null);
  const draggingTableOriginalPos = ref<{ x: number; y: number; rotation: number; chairs: { x: number; y: number }[] } | null>(null);
  const draggingChairOriginalPos = ref<{ x: number; y: number } | null>(null);
  const draggingChair = ref<{ tableIndex: number; chairIndex: number } | null>(null);
  const rotatingTable = ref<number | null>(null);
  const rotatingChair = ref<{ tableIndex: number; chairIndex: number } | null>(null);

  const startRotationAngle = ref(0);
  const initialTableRotation = ref(0);
  const initialChairRotation = ref(0);

  const isInteracting = computed(() =>
    draggingTable.value !== null ||
    draggingChair.value !== null ||
    rotatingTable.value !== null ||
    rotatingChair.value !== null
  );

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

  const isTableInValidArea = (table: Table) => {
    const points = [
      { x: table.x + table.width / 2, y: table.y + table.height / 2 },
      { x: table.x, y: table.y },
      { x: table.x + table.width, y: table.y },
      { x: table.x, y: table.y + table.height },
      { x: table.x + table.width, y: table.y + table.height }
    ];

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
    selectedChairIndex.value = { tableIndex, chairIndex: (table?.chairs.length ?? 0) - 1 };
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

  const startDragTable = (event: MouseEvent, index: number) => {
    takeSnapshot();
    draggingTable.value = index;
    selectedTableIndex.value = index;
    selectedChairIndex.value = null;
    const table = tables.value[index];
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
    dragOffset.x = (event.clientX - rect.left) / zoomLevel.value - (table?.x ?? 0) - panOffset.value.x;
    dragOffset.y = (event.clientY - rect.top) / zoomLevel.value - (table?.y ?? 0) - panOffset.value.y;
  };

  const startDragChair = (event: MouseEvent, tableIndex: number, chairIndex: number) => {
    takeSnapshot();
    event.stopPropagation();
    draggingChair.value = { tableIndex, chairIndex };
    selectedChairIndex.value = { tableIndex, chairIndex };
    selectedTableIndex.value = tableIndex;
    const chair = tables.value[tableIndex]?.chairs[chairIndex];
    if (chair) {
      draggingChairOriginalPos.value = { x: chair.x, y: chair.y };
    }
    if (!svgCanvas.value) return;
    const rect = svgCanvas.value.getBoundingClientRect();
    dragOffset.x = (event.clientX - rect.left) / zoomLevel.value - (chair?.x ?? 0) - panOffset.value.x;
    dragOffset.y = (event.clientY - rect.top) / zoomLevel.value - (chair?.y ?? 0) - panOffset.value.y;
  };

  const startRotateTable = (event: MouseEvent, index: number) => {
    takeSnapshot();
    event.stopPropagation();
    rotatingTable.value = index;
    selectedTableIndex.value = index;
    selectedChairIndex.value = null;

    const table = tables.value[index];
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

    const chair = tables.value[tableIndex]?.chairs[chairIndex];
    const centerX = (chair?.x ?? 0) + 15 + panOffset.value.x;
    const centerY = (chair?.y ?? 0) + 15 + panOffset.value.y;

    if (!svgCanvas.value) return;
    const rect = svgCanvas.value.getBoundingClientRect();
    startRotationAngle.value = Math.atan2((event.clientY - rect.top) / zoomLevel.value - centerY, (event.clientX - rect.left) / zoomLevel.value - centerX);
    initialChairRotation.value = chair?.rotation || 0;
  };

  const handleTableMouseMove = (event: MouseEvent) => {
    if (!svgCanvas.value) return;
    const rect = svgCanvas.value.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / zoomLevel.value;
    const mouseY = (event.clientY - rect.top) / zoomLevel.value;

    if (draggingTable.value !== null) {
      const table = tables.value[draggingTable.value];
      const oldX = table?.x ?? 0;
      const oldY = table?.y ?? 0;
      table!.x = mouseX - dragOffset.x - panOffset.value.x;
      table!.y = mouseY - dragOffset.y - panOffset.value.y;

      const dx = (table?.x ?? 0) - oldX;
      const dy = (table?.y ?? 0) - oldY;
      if (dx !== 0 || dy !== 0) {
        table?.chairs.forEach(chair => {
          chair.x += dx;
          chair.y += dy;
        });
      }

      if (event.ctrlKey) {
        const snapThreshold = 30;
        let snapX = null;
        let snapY = null;
        let minDistX = snapThreshold;
        let minDistY = snapThreshold;

        tables.value.forEach((otherTable, idx) => {
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

        const snapDx = table!.x - oldSnappedX;
        const snapDy = table!.y - oldSnappedY;
        if (snapDx !== 0 || snapDy !== 0) {
          table?.chairs.forEach(chair => {
            chair.x += snapDx;
            chair.y += snapDy;
          });
        }
      }
      return;
    }

    if (draggingChair.value !== null) {
      const { tableIndex, chairIndex } = draggingChair.value;
      const table = tables.value[tableIndex];
      const chair = table?.chairs[chairIndex];
      chair!.x = mouseX - dragOffset.x - panOffset.value.x;
      chair!.y = mouseY - dragOffset.y - panOffset.value.y;

      if (event.ctrlKey) {
        const snapThreshold = 30;
        let snapX = null;
        let snapY = null;
        let minDistX = snapThreshold;
        let minDistY = snapThreshold;

        tables.value.forEach((t) => {
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

      chair!.relativeX = (chair?.x ?? 0) - (table?.x ?? 0);
      chair!.relativeY = (chair?.y ?? 0) - (table?.y ?? 0);
      return;
    }

    if (rotatingTable.value !== null) {
      const table = tables.value[rotatingTable.value];
      const centerX = (table?.x ?? 0) + (table?.width ?? 0) / 2 + panOffset.value.x;
      const centerY = (table?.y ?? 0) + (table?.height ?? 0) / 2 + panOffset.value.y;

      const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
      const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);

      table!.rotation = (initialTableRotation.value + deltaAngle) % 360;
      return;
    }

    if (rotatingChair.value !== null) {
      const { tableIndex, chairIndex } = rotatingChair.value;
      const chair = tables.value[tableIndex]?.chairs[chairIndex];
      const centerX = (chair?.x ?? 0) + 15 + panOffset.value.x;
      const centerY = (chair?.y ?? 0) + 15 + panOffset.value.y;

      const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
      const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);

      chair!.rotation = (initialChairRotation.value + deltaAngle) % 360;
    }
  };

  const handleTableStopDrag = async () => {
    if (draggingTable.value !== null || rotatingTable.value !== null) {
      const tableIndex = draggingTable.value !== null ? draggingTable.value : rotatingTable.value;
      const table = tables.value[tableIndex!];
      if (table && !isTableInValidArea(table)) {
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
      const chair = tables.value[tableIndex]?.chairs[chairIndex];
      if (chair && !isPointInValidArea(chair.x + 15, chair.y + 15)) {
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

        if (draggingChairOriginalPos.value) {
          chair.x = draggingChairOriginalPos.value.x;
          chair.y = draggingChairOriginalPos.value.y;
          chair.relativeX = chair.x - (tables.value[tableIndex]?.x ?? 0);
          chair.relativeY = chair.y - (tables.value[tableIndex]?.y ?? 0);
        }
      }
    }
  };

  const resetInteractions = () => {
    draggingTable.value = null;
    draggingTableOriginalPos.value = null;
    draggingChair.value = null;
    draggingChairOriginalPos.value = null;
    rotatingTable.value = null;
    rotatingChair.value = null;
  };

  const duplicateChair = (tableIndex: number, chairIndex: number) => {
    takeSnapshot();
    const chair = tables.value[tableIndex]?.chairs[chairIndex];
    if (!chair) return;

    const newChair = JSON.parse(JSON.stringify(chair));
    delete newChair.id;
    newChair.x += 10;
    newChair.y += 10;
    newChair.relativeX += 10;
    newChair.relativeY += 10;

    tables.value[tableIndex]?.chairs.push(newChair);
    selectedChairIndex.value = { tableIndex, chairIndex: tables.value[tableIndex]!.chairs.length - 1 };
  };

  const copyChair = (tableIndex: number, chairIndex: number) => {
    const chair = tables.value[tableIndex]?.chairs[chairIndex];
    if (!chair) return;

    const copyData = JSON.parse(JSON.stringify(chair));
    delete copyData.id;
    copyData._type = 'chair';

    navigator.clipboard.writeText(JSON.stringify(copyData))
      .then(() => console.log('Chair copied to clipboard'))
      .catch(err => console.error('Failed to copy chair: ', err));
  };

  const duplicateTable = (index: number) => {
    takeSnapshot();
    const table = tables.value[index];
    const newTable = JSON.parse(JSON.stringify(table));
    delete newTable.id;
    newTable.name = `${table?.name} (copie)`;
    newTable.x += 20;
    newTable.y += 20;

    newTable.chairs.forEach((chair: any) => {
      delete chair.id;
      chair.x += 20;
      chair.y += 20;
      chair.rotation = chair.rotation || 0;
    });

    tables.value.push(newTable);
    selectedTableIndex.value = tables.value.length - 1;
    selectedChairIndex.value = null;
  };

  const copyTable = (index: number) => {
    const table = tables.value[index];
    const copyData = JSON.parse(JSON.stringify(table));
    delete copyData.id;
    copyData.chairs.forEach((c: any) => delete c.id);
    copyData._type = 'table';

    navigator.clipboard.writeText(JSON.stringify(copyData))
      .then(() => console.log('Table copied to clipboard'))
      .catch(err => console.error('Failed to copy table: ', err));
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);

      if (!data || typeof data !== 'object') return;

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

          tables.value[selectedTableIndex.value]?.chairs.push(newChair);
          selectedChairIndex.value = {
            tableIndex: selectedTableIndex.value,
            chairIndex: tables.value[selectedTableIndex.value]!.chairs.length - 1
          };
        }
        return;
      }

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
        tables.value.push(newTable);
        selectedTableIndex.value = tables.value.length - 1;
        selectedChairIndex.value = null;
      }
    } catch (err) {
      console.error('Failed to paste from clipboard: ', err);
    }
  };

  return {
    tables,
    selectedTableIndex,
    selectedChairIndex,
    draggingTable,
    draggingTableOriginalPos,
    draggingChairOriginalPos,
    draggingChair,
    rotatingTable,
    rotatingChair,
    isInteracting,
    addTable,
    addChair,
    removeTable,
    removeChair,
    flipTable,
    flipChair,
    startDragTable,
    startDragChair,
    startRotateTable,
    startRotateChair,
    handleTableMouseMove,
    handleTableStopDrag,
    resetInteractions,
    duplicateChair,
    copyChair,
    duplicateTable,
    copyTable,
    pasteFromClipboard,
    isTableInValidArea
  };
};
