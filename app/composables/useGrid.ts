import type { Ref } from 'vue';

interface UseGridOptions {
  gridSize: number;
  zoomLevel: Ref<number>;
  panOffset: Ref<{ x: number; y: number }>;
  svgCanvas: Ref<SVGElement | null>;
}

export const useGrid = ({ gridSize, zoomLevel, panOffset, svgCanvas }: UseGridOptions) => {
  const snapToGrid = (point: { x: number; y: number }) => ({
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  });

  const alignToGridLine = (point: { x: number; y: number }, lastPoint: { x: number; y: number }) => {
    const dx = Math.abs(point.x - lastPoint.x);
    const dy = Math.abs(point.y - lastPoint.y);
    if (dx >= dy) {
      return { x: point.x, y: lastPoint.y };
    }
    return { x: lastPoint.x, y: point.y };
  };

  const getRawPointFromEvent = (event: MouseEvent) => {
    if (!svgCanvas.value) return { x: 0, y: 0 };
    const rect = svgCanvas.value.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / zoomLevel.value - panOffset.value.x,
      y: (event.clientY - rect.top) / zoomLevel.value - panOffset.value.y
    };
  };

  const getGridPointFromEvent = (event: MouseEvent) => {
    return snapToGrid(getRawPointFromEvent(event));
  };

  const getGridCellFromEvent = (event: MouseEvent) => {
    if (!svgCanvas.value) return { x: 0, y: 0 };
    const rect = svgCanvas.value.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / zoomLevel.value - panOffset.value.x) / gridSize) * gridSize;
    const y = Math.floor(((event.clientY - rect.top) / zoomLevel.value - panOffset.value.y) / gridSize) * gridSize;
    return { x, y };
  };

  return {
    gridSize,
    snapToGrid,
    alignToGridLine,
    getRawPointFromEvent,
    getGridPointFromEvent,
    getGridCellFromEvent
  };
};
