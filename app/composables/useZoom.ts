export const useZoom = () => {
  const zoomLevel = ref(1);
  const panOffset = ref({ x: 0, y: 0 });
  const svgCanvas = ref<SVGElement | null>(null);
  const isPanning = ref(false);

  const zoomIn = () => {
    zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3);
  };

  const zoomOut = () => {
    zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.2);
  };

  const handlePan = (event: MouseEvent) => {
    if (!isPanning.value) return false;
    panOffset.value.x += event.movementX / zoomLevel.value;
    panOffset.value.y += event.movementY / zoomLevel.value;
    return true;
  };

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }
  };

  return {
    zoomLevel,
    panOffset,
    svgCanvas,
    isPanning,
    zoomIn,
    zoomOut,
    handlePan,
    onWheel
  };
};
