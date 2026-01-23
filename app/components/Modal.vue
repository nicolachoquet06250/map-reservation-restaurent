<script setup lang="ts">
import { onUnmounted, watch } from 'vue';

const props = withDefaults(defineProps<{
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  contentClass?: string;
}>(), {
  closeOnOverlay: true,
  closeOnEsc: true,
  contentClass: ''
});

const modelValue = defineModel<boolean>();

const close = () => {
  modelValue.value = false;
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close();
  }
};

const canUseWindow = typeof window !== 'undefined';

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.closeOnEsc) {
    close();
  }
};

watch(
  modelValue,
  (isOpen) => {
    if (!props.closeOnEsc || !canUseWindow) return;
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (canUseWindow) {
    window.removeEventListener('keydown', handleKeyDown);
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" role="dialog" aria-modal="true" @click="handleOverlayClick">
      <div class="modal-content" :class="contentClass" @click.stop>
        <div v-if="$slots.header" class="modal-header">
          <slot name="header" />
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-actions">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1e293b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
}

.shortcuts-modal {
  max-width: 500px !important;
}
</style>
