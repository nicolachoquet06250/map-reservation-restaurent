export const useRoomBuilderZoom = (initialZoom = 1) => {
  const zoomLevel = ref(initialZoom);

  const zoomIn = () => {
    zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3);
  };

  const zoomOut = () => {
    zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.2);
  };

  return {
    zoomLevel,
    zoomIn,
    zoomOut
  };
};
