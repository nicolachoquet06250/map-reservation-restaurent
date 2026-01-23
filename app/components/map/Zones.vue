<script setup lang="ts">
import type {Point, RoomZone} from "~/types/room";

const props = defineProps<{
  isActive: boolean,
  data: RoomZone[],
  gridSize: number,
  getZoneCenter: (units: Set<string>) => Point,
  currentZoneUnits: Set<string>,
  selectedZoneType: 'zone' | 'estrade' | 'terrasse',
  isDrawingZone: boolean,
  zoneDragStart: Point | null,
  zoneDragEnd: Point | null,
}>();

const emit = defineEmits<{
  (e: 'delete-zone', zoneIdx: number): void;
  (e: 'context-menu', event: MouseEvent): void;
}>();

const deleteZone = (id: number) => {
  if (props.isActive) {
    emit('delete-zone', id)
  }
}
</script>

<template>
  <g :class="{ 'inactive-layer': !isActive }"
     :style="!isActive ? 'pointer-events: none;' : ''">
    <!-- Zones et estrades enregistrées -->
    <g v-for="(zone, zIdx) in data" :key="`zone-${zIdx}`">
      <rect
          v-for="unit in Array.from(zone.units)"
          :key="unit"
          :x="unit.split(',')[0]"
          :y="unit.split(',')[1]"
          :width="gridSize"
          :height="gridSize"
          :fill="zone.type === 'zone' ? '#800020' : (zone.type === 'estrade' ? '#808080' : '#4a90e2')"
          fill-opacity="0.6"
          stroke="white"
          stroke-width="0.5"
          @contextmenu.prevent="isActive && deleteZone(zIdx)"
      >
        <title v-if="zone.name">{{ zone.name }}</title>
      </rect>
      <g v-if="zone.name" class="zone-label-group">
        <rect
            :x="getZoneCenter(zone.units).x - (zone.name.length * 4 + 10)"
            :y="getZoneCenter(zone.units).y - 10"
            :width="zone.name.length * 8 + 20"
            :height="20"
            rx="10"
            class="zone-name-badge"
        />
        <text
            :x="getZoneCenter(zone.units).x"
            :y="getZoneCenter(zone.units).y"
            class="zone-name-label"
        >
          {{ zone.name }}
        </text>
      </g>
    </g>

    <!-- Sélection en cours -->
    <g v-if="isActive" @contextmenu="$emit('context-menu', $event)">
      <rect
          v-for="unit in Array.from(currentZoneUnits)"
          :key="`current-${unit}`"
          :x="unit.split(',')[0]"
          :y="unit.split(',')[1]"
          :width="gridSize"
          :height="gridSize"
          :fill="isActive ? '#800020' : (selectedZoneType === 'estrade' ? '#808080' : '#4a90e2')"
          fill-opacity="0.8"
          stroke="#fff"
          stroke-width="1"
          pointer-events="auto"
      />
    </g>

    <!-- Aperçu du drag -->
    <rect
        v-if="isActive && isDrawingZone && zoneDragStart && zoneDragEnd"
        :x="Math.min(zoneDragStart.x, zoneDragEnd.x)"
        :y="Math.min(zoneDragStart.y, zoneDragEnd.y)"
        :width="Math.abs(zoneDragEnd.x - zoneDragStart.x) + gridSize"
        :height="Math.abs(zoneDragEnd.y - zoneDragStart.y) + gridSize"
        fill="rgba(0, 123, 255, 0.2)"
        stroke="#007bff"
        stroke-width="1"
        stroke-dasharray="4"
        pointer-events="none"
    />
  </g>
</template>

<style scoped>
.inactive-layer {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}
.zone-label-group {
  pointer-events: none;
}
.zone-name-label {
  fill: white;
  font-size: 10px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  user-select: none;
}
.zone-name-badge {
  fill: rgba(0, 0, 0, 0.5);
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 1;
}
</style>