<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <slot name="left" />
    </div>
    <div class="toolbar-center">
      <slot name="center" />
    </div>
    <div class="toolbar-right">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  flex-shrink: 0;
  padding: 0.75rem 1.5rem;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 20;
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  padding: 0.4rem 1rem;
  border-radius: 9999px;
  border: 1px solid #f1f5f9;
}
</style>
