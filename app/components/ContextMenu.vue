<script setup lang="ts">
const props = defineProps<{
  position: { x: number; y: number };
}>();

const modelValue = defineModel<boolean>();

const close = () => {
  modelValue.value = false;
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="custom-context-menu"
      :style="{ top: position.y + 'px', left: position.x + 'px' }"
      @click.stop
    >
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.custom-context-menu {
  position: fixed;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  padding: 4px;
  min-width: 160px;
}

:deep(button) {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #1e293b;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

:deep(button:hover) {
  background-color: #f1f5f9;
}

:deep(svg) {
  margin-right: 8px;
}
</style>
