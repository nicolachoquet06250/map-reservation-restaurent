<script setup lang="ts">
import type {Door, Point} from "~/types/room";

defineProps<{
  doors: Door[],
  panOffset: Point,
  zoomLevel: number,
}>();

defineEmits<{
  (e: 'click', event: MouseEvent): void;
  (e: 'mouseup', event: MouseEvent): void;
}>()
</script>

<template>
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eee" stroke-width="1"/>
    </pattern>

    <mask id="wallMask">
      <rect width="10000" height="10000" x="-5000" y="-5000" fill="white" />
      <g v-for="(door, dIdx) in doors" :key="`mask-door-${dIdx}`">
        <rect
            :x="door.x" :y="door.y"
            :width="door.width" :height="door.height"
            fill="black"
            :transform="`rotate(${door.rotation || 0}, ${door.x + door.width / 2}, ${door.y + door.height / 2})`"
        />
      </g>
    </mask>
  </defs>

  <rect
      width="100%"
      height="100%"
      fill="url(#grid)"
      class="canvas-background"
      :transform="`translate(${panOffset.x % 20}, ${panOffset.y % 20})`"
      @click="$emit('click', $event)"
      @mouseup="$emit('mouseup', $event)"
  />

  <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`">
    <slot />
  </g>
</template>

<style scoped>
.canvas-background {
  cursor: grab;
}
.canvas-background:active {
  cursor: grabbing;
}
</style>