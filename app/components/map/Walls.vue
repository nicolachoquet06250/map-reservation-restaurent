<script setup lang="ts">
import { computed } from 'vue';
import type {Point} from "~/types/room";

const props = defineProps<{
  closed: boolean,
  points: Point[],
  selected: boolean,
  preview?: { point: Point | null; axisLock: 'horizontal' | 'vertical' | null; isClosing: boolean } | null,
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

const draftPolyline = computed(() => {
  if (props.closed || props.points.length < 2) return '';
  return props.points.map(point => `${point.x},${point.y}`).join(' ');
});

const previewSegment = computed(() => {
  if (props.closed) return null;
  if (!props.preview?.point || props.points.length === 0) return null;
  const lastPoint = props.points[props.points.length - 1];
  if (!lastPoint) return null;
  return {
    p1: lastPoint,
    p2: props.preview.point
  };
});
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
  <template v-else>
    <polyline
        v-if="draftPolyline"
        :points="draftPolyline"
        class="wall-draft"
    />
    <line
        v-if="previewSegment"
        :x1="previewSegment.p1.x"
        :y1="previewSegment.p1.y"
        :x2="previewSegment.p2.x"
        :y2="previewSegment.p2.y"
        class="wall-preview-segment"
        :class="preview?.axisLock"
    />
    <circle
        v-if="preview?.point"
        :cx="preview.point.x"
        :cy="preview.point.y"
        r="4"
        class="wall-preview-point"
        :class="{ closing: preview?.isClosing }"
    />
    <circle
        v-if="preview?.isClosing && points.length"
        :cx="points[0]!.x"
        :cy="points[0]!.y"
        r="10"
        class="wall-preview-close"
    />
  </template>

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
.wall-draft {
  fill: none;
  stroke: rgba(43, 43, 43, 0.6);
  stroke-width: 3;
  stroke-linecap: square;
  stroke-linejoin: miter;
  pointer-events: none;
}
.wall-preview-segment {
  stroke: #007bff;
  stroke-width: 3;
  stroke-dasharray: 5 6;
  pointer-events: none;
}
.wall-preview-segment.horizontal {
  stroke: #17a2b8;
}
.wall-preview-segment.vertical {
  stroke: #ff9800;
}
.wall-preview-point {
  fill: #007bff;
  stroke: #fff;
  stroke-width: 1.5;
  pointer-events: none;
}
.wall-preview-point.closing {
  fill: #28a745;
}
.wall-preview-close {
  fill: none;
  stroke: rgba(40, 167, 69, 0.6);
  stroke-width: 2;
  stroke-dasharray: 4 4;
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