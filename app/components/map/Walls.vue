<script setup lang="ts">
import type {Point} from "~/types/room";

defineProps<{
  closed: boolean,
  points: Point[],
  selected: boolean,
  polylinePoints?: string,
  segments?: { p1?: Point, p2?: Point, isHorizontal: boolean }[],
}>();

type Segment = {
  p1?: Point
  p2?: Point
  index1: number
  index2: number
  isHorizontal: boolean
};

defineEmits<{
  (e: 'select', evt: MouseEvent): void,
  (e: 'click', evt: MouseEvent): void,
  (e: 'start-drag', evt: MouseEvent, sgm: Segment): void,
}>();
</script>

<template>
  <polygon
      v-if="closed && points.length"
      :points="points.map(p => `${p.x},${p.y}`).join(' ')"
      class="wall-shape"
      :class="{ selected }"
      mask="url(#wallMask)"
      @mousedown="$emit('select', $event)"
      @click="$emit('click', $event)"
  />
  <polyline
      v-else-if="polylinePoints"
      :points="polylinePoints"
      class="wall-shape wall-preview"
  />

  <!-- Segments de mur interactifs pour le déplacement -->
  <template v-if="closed && selected">
    <line
        v-for="(segment, index) in segments"
        :key="`segment-${index}`"
        :x1="segment.p1!.x"
        :y1="segment.p1!.y"
        :x2="segment.p2!.x"
        :y2="segment.p2!.y"
        class="wall-segment-handle"
        :class="{ 'horizontal': segment.isHorizontal, 'vertical': !segment.isHorizontal }"
        @mousedown.stop="$emit('start-drag', $event, segment as Segment)"
    />
  </template>

  <circle
      v-if="!closed"
      v-for="(point, index) in points"
      :key="`wall-point-${index}`"
      :cx="point.x"
      :cy="point.y"
      r="3"
      class="wall-point"
  />
</template>

<style scoped>
.wall-shape {
  fill: rgba(60, 60, 60, 0.15);
  stroke: #2b2b2b;
  stroke-width: 4;
  stroke-linecap: square;
  stroke-linejoin: miter;
  cursor: pointer;
  mask: url(#wallMask);
}
.wall-shape.selected {
  stroke: #007bff;
  fill: rgba(0, 123, 255, 0.1);
}
.wall-shape.wall-preview {
  fill: none;
  stroke-dasharray: 6 4;
  pointer-events: none;
}
.wall-segment-handle {
  stroke: transparent;
  stroke-width: 10;
  cursor: pointer;
}
.wall-segment-handle.horizontal {
  cursor: ns-resize;
}
.wall-segment-handle.vertical {
  cursor: ew-resize;
}
.wall-segment-handle:hover {
  stroke: rgba(0, 123, 255, 0.3);
}
.wall-point {
  fill: #ff4500;
  stroke: #fff;
  stroke-width: 1;
}
</style>