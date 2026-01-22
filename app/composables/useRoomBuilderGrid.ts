import type { Ref } from 'vue';

export const useRoomBuilderGrid = (
  gridSize: number,
  svgCanvas: Ref<SVGElement | null>,
  zoomLevel: Ref<number>,
  panOffset: Ref<{ x: number; y: number }>
) => {
  const snapToGrid = (point: { x: number; y: number }) => ({
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  });

  const alignToGridLine = (
    point: { x: number; y: number },
    lastPoint: { x: number; y: number }
  ) => {
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
    const x =
      Math.floor(
        ((event.clientX - rect.left) / zoomLevel.value - panOffset.value.x) /
          gridSize
      ) * gridSize;
    const y =
      Math.floor(
        ((event.clientY - rect.top) / zoomLevel.value - panOffset.value.y) /
          gridSize
      ) * gridSize;
    return { x, y };
  };

  return {
    snapToGrid,
    alignToGridLine,
    getGridPointFromEvent,
    getGridCellFromEvent
  };
};
