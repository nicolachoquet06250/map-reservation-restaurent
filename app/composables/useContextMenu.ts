import { ref } from 'vue';

export function useContextMenu() {
  const isOpen = ref(false);
  const position = ref({ x: 0, y: 0 });

  const open = (event: MouseEvent) => {
    event.preventDefault();
    position.value = { x: event.clientX, y: event.clientY };
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  return {
    isOpen,
    position,
    open,
    close
  };
}
