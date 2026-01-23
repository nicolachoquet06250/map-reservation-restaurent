<script setup lang="ts">
import type {Door, Table} from "~/types/room";

const props = defineProps<{
  isActive: boolean;
  doors: Door[],
  selectedDoorIndex: number | null,
  tables: Table[],
  selectedChairIndex: {
    tableIndex: number;
    chairIndex: number;
  } | null,
  selectedTableIndex: number | null,
  draggingTable: number | null,
  isTableInValidArea: (table: Table) => boolean
}>();

const emit = defineEmits<{
  (e: 'start-drag-door', event: MouseEvent, doorIndex: number): void;
  (e: 'start-drag-chair', event: MouseEvent, tableIndex: number, chairIndex: number): void;
  (e: 'start-rotate-chair', event: MouseEvent, tableIndex: number, chairIndex: number): void;
  (e: 'start-drag-table', event: MouseEvent, tableIndex: number): void;
  (e: 'start-rotate-table', event: MouseEvent, tableIndex: number): void;
}>();

const startDragDoor = (event: MouseEvent, doorIndex: number) => {
  if (props.isActive) {
    emit('start-drag-door', event, doorIndex);
  }
}

const startDragChair = (event: MouseEvent, tableIndex: number, chairIndex: number) => {
  if (props.isActive) {
    emit('start-drag-chair', event, tableIndex, chairIndex);
  }
}

const startDragTable = (event: MouseEvent, tableIndex: number) => {
  if (props.isActive) {
    emit('start-drag-table', event, tableIndex);
  }
}
</script>

<template>
  <g :class="{ 'inactive-layer': !isActive }" :style="!isActive ? 'pointer-events: none;' : ''">
    <g v-for="(door, dIdx) in doors" :key="`door-${dIdx}`">
      <g :transform="`rotate(${door.rotation || 0}, ${door.x + door.width / 2}, ${door.y + door.height / 2})`">
        <rect
            :x="door.x" :y="door.y"
            :width="door.width" :height="door.height"
            class="door-rect"
            :class="{ selected: selectedDoorIndex === dIdx }"
            @mousedown="startDragDoor($event, dIdx)"
        />
        <!-- Représentation du sens d'ouverture -->
        <template v-if="door.type === 'double'">
          <!-- Côté gauche -->
          <path
              :d="`M ${door.x + door.width / 2} ${door.y + door.height} A ${door.width / 2} ${door.width / 2} 0 0 0 ${door.x} ${door.y + door.height - door.width / 2}`"
              fill="none"
              stroke="#333"
              stroke-width="2"
              stroke-dasharray="4 2"
              style="pointer-events: none;"
          />
          <line
              :x1="door.x" :y1="door.y + door.height"
              :x2="door.x" :y2="door.y + door.height - door.width / 2"
              stroke="#333"
              stroke-width="2"
              style="pointer-events: none;"
          />
          <!-- Côté droit -->
          <path
              :d="`M ${door.x + door.width / 2} ${door.y + door.height} A ${door.width / 2} ${door.width / 2} 0 0 1 ${door.x + door.width} ${door.y + door.height - door.width / 2}`"
              fill="none"
              stroke="#333"
              stroke-width="2"
              stroke-dasharray="4 2"
              style="pointer-events: none;"
          />
          <line
              :x1="door.x + door.width" :y1="door.y + door.height"
              :x2="door.x + door.width" :y2="door.y + door.height - door.width / 2"
              stroke="#333"
              stroke-width="2"
              style="pointer-events: none;"
          />
        </template>
        <template v-else>
          <path
              :d="`M ${door.x + door.width} ${door.y + door.height} A ${door.width} ${door.width} 0 0 0 ${door.x} ${door.y + door.height - door.width}`"
              fill="none"
              stroke="#333"
              stroke-width="2"
              stroke-dasharray="4 2"
              style="pointer-events: none;"
          />
          <line
              :x1="door.x" :y1="door.y + door.height"
              :x2="door.x" :y2="door.y + door.height - door.width"
              stroke="#333"
              stroke-width="2"
              style="pointer-events: none;"
          />
        </template>
      </g>
    </g>

    <g v-for="(table, tIdx) in tables" :key="tIdx">
      <g :transform="`rotate(${table.rotation || 0}, ${table.x + table.width / 2}, ${table.y + table.height / 2})`">
        <!-- Table -->
        <rect
            v-if="table.shape === 'rectangle'"
            :x="table.x" :y="table.y"
            :width="table.width" :height="table.height"
            class="table-rect"
            :class="{
              selected: selectedTableIndex === tIdx && !selectedChairIndex,
              invalid: draggingTable === tIdx && !isTableInValidArea(table)
            }"
            @mousedown="startDragTable($event, tIdx)"
        />
        <ellipse
            v-else-if="table.shape === 'circle'"
            :cx="table.x + table.width/2" :cy="table.y + table.height/2"
            :rx="table.width/2" :ry="table.height/2"
            class="table-rect"
            :class="{
                      selected: selectedTableIndex === tIdx && !selectedChairIndex,
                      invalid: draggingTable === tIdx && !isTableInValidArea(table)
                    }"
            @mousedown="isActive && startDragTable($event, tIdx)"
        />
        <path
            v-else-if="table.shape === 'L'"
            :d="`M ${table.x} ${table.y} H ${table.x + table.width} V ${table.y + (table.extraAttributes?.lThicknessY || table.height * 0.4)} H ${table.x + (table.extraAttributes?.lThicknessX || table.width * 0.4)} V ${table.y + table.height} H ${table.x} Z`"
            class="table-rect"
            :class="{
                      selected: selectedTableIndex === tIdx && !selectedChairIndex,
                      invalid: draggingTable === tIdx && !isTableInValidArea(table)
                    }"
            @mousedown="isActive && startDragTable($event, tIdx)"
        />
        <path
            v-else-if="table.shape === 'U'"
            :d="`
                    M ${table.x} ${table.y}
                    H ${table.x + (table.extraAttributes?.uThickness || table.width * 0.3)}
                    V ${table.y + table.height - (table.extraAttributes?.uBaseThickness || table.height * 0.3)}
                    H ${table.x + table.width - (table.extraAttributes?.uThickness || table.width * 0.3)}
                    V ${table.y}
                    H ${table.x + table.width}
                    V ${table.y + table.height}
                    H ${table.x}
                    Z`"
            class="table-rect"
            :class="{
                      selected: selectedTableIndex === tIdx && !selectedChairIndex,
                      invalid: draggingTable === tIdx && !isTableInValidArea(table)
                    }"
            @mousedown="isActive && startDragTable($event, tIdx)"
        />

        <text
            :x="table.x + table.width / 2"
            :y="table.y + table.height / 2"
            text-anchor="middle"
            dominant-baseline="middle"
            class="table-label"
            :transform="`rotate(${- (table.rotation || 0)}, ${table.x + table.width / 2}, ${table.y + table.height / 2})`"
        >
          {{ table.name }}
        </text>

        <!-- Poignées de rotation sur les coins (visibles seulement si sélectionnée) -->
        <template v-if="isActive && selectedTableIndex === tIdx && !selectedChairIndex">
          <circle
              v-for="(pos, pIdx) in [
                {x: table.x, y: table.y},
                {x: table.x + table.width, y: table.y},
                {x: table.x, y: table.y + table.height},
                {x: table.x + table.width, y: table.y + table.height}
              ]"
              :key="pIdx"
              :cx="pos.x" :cy="pos.y" r="6"
              class="rotation-handle"
              @mousedown="$emit('start-rotate-table', $event, tIdx)"
          />
        </template>
      </g>

      <!-- Chaises (ne pas faire pivoter avec la table car leur position x,y est déjà absolue) -->
      <g v-for="(chair, cIdx) in table.chairs" :key="cIdx">
        <rect
            :x="chair.x" :y="chair.y"
            width="30" height="30" rx="5"
            class="chair-rect"
            :class="{ selected: selectedChairIndex?.tableIndex === tIdx && selectedChairIndex?.chairIndex === cIdx }"
            :transform="`rotate(${chair.rotation || 0}, ${chair.x + 15}, ${chair.y + 15})`"
            @mousedown="startDragChair($event, tIdx, cIdx)"
        />
        <!-- Poignées de rotation sur les coins (visibles seulement si sélectionnée) -->
        <template v-if="isActive && selectedChairIndex?.tableIndex === tIdx && selectedChairIndex?.chairIndex === cIdx">
          <circle
              v-for="(pos, pIdx) in [
                {x: chair.x, y: chair.y},
                {x: chair.x + 30, y: chair.y},
                {x: chair.x, y: chair.y + 30},
                {x: chair.x + 30, y: chair.y + 30}
              ]"
              :key="pIdx"
              :cx="pos.x" :cy="pos.y" r="4"
              class="rotation-handle"
              :transform="`rotate(${chair.rotation || 0}, ${chair.x + 15}, ${chair.y + 15})`"
              @mousedown="$emit('start-rotate-chair', $event, tIdx, cIdx)"
          />
        </template>
      </g>
    </g>
  </g>
</template>

<style scoped>
.table-rect {
  fill: #d2b48c;
  stroke: #8b4513;
  stroke-width: 2;
  cursor: move;
}
.table-rect.selected {
  stroke: #3b82f6;
  stroke-width: 3;
}
.table-rect.invalid {
  fill: #fee2e2;
  stroke: #ef4444;
  stroke-width: 3;
}

.chair-rect {
  fill: #555;
  stroke: #333;
  cursor: move;
}
.chair-rect.selected {
  stroke: #ff4500;
  stroke-width: 3;
}
.door-rect {
  fill: #fff;
  stroke: #333;
  stroke-width: 2;
  cursor: move;
}
.door-rect.selected {
  stroke: #ff4500;
  stroke-width: 4;
}
.rotation-handle {
  fill: white;
  stroke: #ff4500;
  stroke-width: 2;
  cursor: alias;
}
.table-label {
  pointer-events: none;
  font-size: 12px;
  font-weight: bold;
  user-select: none;
}
</style>