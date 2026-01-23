<script setup lang="ts">
import {onClickOutside} from "@vueuse/core";

const modelValue = defineModel()

const close = () => modelValue.value = false;
const toggle = () => modelValue.value = !modelValue.value;

onClickOutside(useTemplateRef('dropdown'), close)
</script>

<template>
  <div class="custom-dropdown-container" ref="dropdown">
    <div class="dropdown-trigger" @click="toggle">
      <slot name="trigger" />
    </div>
    
    <div v-if="modelValue" class="custom-dropdown-menu">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.custom-dropdown-container {
  position: relative;
  display: inline-block;
}

.custom-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 140px;
  margin-top: 4px;
  overflow: hidden;
}

:deep(button) {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  background: none;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #1e293b;
  display: flex;
  align-items: center;
}

:deep(button:hover) {
  background-color: #f1f5f9;
}
</style>
