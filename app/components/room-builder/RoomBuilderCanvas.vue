<script setup lang="ts">
import type { Door, Table } from '~/types';

const props = defineProps<{
  zoomLevel: number;
  panOffset: { x: number; y: number };
  gridSize: number;
  isInteracting: boolean;
  wallClosed: boolean;
  wallPoints: Array<{ x: number; y: number }>;
  wallSelected: boolean;
  wallSegments: Array<{
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    index1: number;
    index2: number;
    isHorizontal: boolean;
  }>;
  wallPolylinePoints: string | null;
  activeLayerType: string | null;
  roomZonesData: Array<{ id?: number; name?: string; type: 'zone' | 'estrade' | 'terrasse'; units: Set<string> }>;
  currentZoneUnits: Set<string>;
  selectedZoneType: 'zone' | 'estrade' | 'terrasse';
  isDrawingZone: boolean;
  zoneDragStart: { x: number; y: number } | null;
  zoneDragEnd: { x: number; y: number } | null;
  doors: Door[];
  selectedDoorIndex: number | null;
  tables: Table[];
  selectedTableIndex: number | null;
  selectedChairIndex: { tableIndex: number; chairIndex: number } | null;
  draggingTable: number | null;
  isTableInValidArea: (table: Table) => boolean;
  getZoneCenter: (units: Set<string>) => { x: number; y: number };
  handleWallClick: (event: MouseEvent) => void;
  stopDrag: (event: MouseEvent) => void;
  deselect: (event: MouseEvent) => void;
  selectWall: (event: MouseEvent) => void;
  startDragWallSegment: (event: MouseEvent, segment: { index1: number; index2: number; isHorizontal: boolean }) => void;
  startDragDoor: (event: MouseEvent, index: number) => void;
  startDragTable: (event: MouseEvent, index: number) => void;
  startRotateTable: (event: MouseEvent, index: number) => void;
  startDragChair: (event: MouseEvent, tableIndex: number, chairIndex: number) => void;
  startRotateChair: (event: MouseEvent, tableIndex: number, chairIndex: number) => void;
  handleContextMenu: (event: MouseEvent) => void;
  deleteZone: (index: number) => void;
}>();

const svgCanvas = defineModel<SVGElement | null | undefined>('svgCanvas', {
  required: true
})
</script>

<template>
  <div class="canvas-area">
    <svg :ref="svgCanvas" width="100%" height="100%" class="canvas-svg" :class="{ interacting: props.isInteracting }" @mousedown="props.deselect">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eee" stroke-width="1" />
        </pattern>
        <mask id="wallMask">
          <rect width="10000" height="10000" x="-5000" y="-5000" fill="white" />
          <g v-for="(door, dIdx) in props.doors" :key="`mask-door-${dIdx}`">
            <rect
              :x="door.x"
              :y="door.y"
              :width="door.width"
              :height="door.height"
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
        :transform="`translate(${props.panOffset.x % 20}, ${props.panOffset.y % 20})`"
        @click="props.handleWallClick"
        @mouseup="props.stopDrag"
      />

      <g :transform="`scale(${props.zoomLevel}) translate(${props.panOffset.x}, ${props.panOffset.y})`">
        <polygon
          v-if="props.wallClosed && props.wallPoints.length"
          :points="props.wallPoints.map(p => `${p.x},${p.y}`).join(' ')"
          class="wall-shape"
          :class="{ selected: props.wallSelected }"
          mask="url(#wallMask)"
          @mousedown="props.selectWall"
          @click="props.handleWallClick"
        />
        <polyline v-else-if="props.wallPolylinePoints" :points="props.wallPolylinePoints" class="wall-shape wall-preview" />

        <g :class="{ 'inactive-layer': props.activeLayerType !== 'zones' }" :style="props.activeLayerType !== 'zones' ? 'pointer-events: none;' : ''">
          <g v-for="(zone, zIdx) in props.roomZonesData" :key="`zone-${zIdx}`">
            <rect
              v-for="unit in Array.from(zone.units)"
              :key="unit"
              :x="unit.split(',')[0]"
              :y="unit.split(',')[1]"
              :width="props.gridSize"
              :height="props.gridSize"
              :fill="zone.type === 'zone' ? '#800020' : (zone.type === 'estrade' ? '#808080' : '#4a90e2')"
              fill-opacity="0.6"
              stroke="white"
              stroke-width="0.5"
              @contextmenu.prevent="props.activeLayerType === 'zones' && props.deleteZone(zIdx)"
            >
              <title v-if="zone.name">{{ zone.name }}</title>
            </rect>
            <g v-if="zone.name" class="zone-label-group">
              <rect
                :x="props.getZoneCenter(zone.units).x - (zone.name.length * 4 + 10)"
                :y="props.getZoneCenter(zone.units).y - 10"
                :width="zone.name.length * 8 + 20"
                :height="20"
                rx="10"
                class="zone-name-badge"
              />
              <text :x="props.getZoneCenter(zone.units).x" :y="props.getZoneCenter(zone.units).y" class="zone-name-label">
                {{ zone.name }}
              </text>
            </g>
          </g>

          <g v-if="props.activeLayerType === 'zones'" @contextmenu="props.handleContextMenu">
            <rect
              v-for="unit in Array.from(props.currentZoneUnits)"
              :key="`current-${unit}`"
              :x="unit.split(',')[0]"
              :y="unit.split(',')[1]"
              :width="props.gridSize"
              :height="props.gridSize"
              :fill="props.selectedZoneType === 'zone' ? '#800020' : (props.selectedZoneType === 'estrade' ? '#808080' : '#4a90e2')"
              fill-opacity="0.8"
              stroke="#fff"
              stroke-width="1"
              pointer-events="auto"
            />
          </g>

          <rect
            v-if="props.activeLayerType === 'zones' && props.isDrawingZone && props.zoneDragStart && props.zoneDragEnd"
            :x="Math.min(props.zoneDragStart.x, props.zoneDragEnd.x)"
            :y="Math.min(props.zoneDragStart.y, props.zoneDragEnd.y)"
            :width="Math.abs(props.zoneDragEnd.x - props.zoneDragStart.x) + props.gridSize"
            :height="Math.abs(props.zoneDragEnd.y - props.zoneDragStart.y) + props.gridSize"
            fill="rgba(0, 123, 255, 0.2)"
            stroke="#007bff"
            stroke-width="1"
            stroke-dasharray="4"
            pointer-events="none"
          />
        </g>

        <template v-if="props.wallClosed && props.wallSelected">
          <line
            v-for="(segment, index) in props.wallSegments"
            :key="`segment-${index}`"
            :x1="segment.p1.x"
            :y1="segment.p1.y"
            :x2="segment.p2.x"
            :y2="segment.p2.y"
            class="wall-segment-handle"
            :class="{ horizontal: segment.isHorizontal, vertical: !segment.isHorizontal }"
            @mousedown.stop="props.startDragWallSegment($event, segment)"
          />
        </template>

        <circle
          v-if="!props.wallClosed"
          v-for="(point, index) in props.wallPoints"
          :key="`wall-point-${index}`"
          :cx="point.x"
          :cy="point.y"
          r="3"
          class="wall-point"
        />

        <g :class="{ 'inactive-layer': props.activeLayerType !== 'tables' }" :style="props.activeLayerType !== 'tables' ? 'pointer-events: none;' : ''">
          <g v-for="(door, dIdx) in props.doors" :key="`door-${dIdx}`">
            <g :transform="`rotate(${door.rotation || 0}, ${door.x + door.width / 2}, ${door.y + door.height / 2})`">
              <rect
                :x="door.x"
                :y="door.y"
                :width="door.width"
                :height="door.height"
                class="door-rect"
                :class="{ selected: props.selectedDoorIndex === dIdx }"
                @mousedown="props.activeLayerType === 'tables' && props.startDragDoor($event, dIdx)"
              />
              <template v-if="door.type === 'double'">
                <path
                  :d="`M ${door.x + door.width / 2} ${door.y + door.height} A ${door.width / 2} ${door.width / 2} 0 0 0 ${door.x} ${door.y + door.height - door.width / 2}`"
                  fill="none"
                  stroke="#333"
                  stroke-width="2"
                  stroke-dasharray="4 2"
                  style="pointer-events: none;"
                />
                <line
                  :x1="door.x"
                  :y1="door.y + door.height"
                  :x2="door.x"
                  :y2="door.y + door.height - door.width / 2"
                  stroke="#333"
                  stroke-width="2"
                  style="pointer-events: none;"
                />
                <path
                  :d="`M ${door.x + door.width / 2} ${door.y + door.height} A ${door.width / 2} ${door.width / 2} 0 0 1 ${door.x + door.width} ${door.y + door.height - door.width / 2}`"
                  fill="none"
                  stroke="#333"
                  stroke-width="2"
                  stroke-dasharray="4 2"
                  style="pointer-events: none;"
                />
                <line
                  :x1="door.x + door.width"
                  :y1="door.y + door.height"
                  :x2="door.x + door.width"
                  :y2="door.y + door.height - door.width / 2"
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
                  :x1="door.x"
                  :y1="door.y + door.height"
                  :x2="door.x"
                  :y2="door.y + door.height - door.width"
                  stroke="#333"
                  stroke-width="2"
                  style="pointer-events: none;"
                />
              </template>
            </g>
          </g>

          <g v-for="(table, tIdx) in props.tables" :key="tIdx">
            <g :transform="`rotate(${table.rotation || 0}, ${table.x + table.width / 2}, ${table.y + table.height / 2})`">
              <rect
                v-if="table.shape === 'rectangle'"
                :x="table.x"
                :y="table.y"
                :width="table.width"
                :height="table.height"
                class="table-rect"
                :class="{
                  selected: props.selectedTableIndex === tIdx && !props.selectedChairIndex,
                  invalid: props.draggingTable === tIdx && !props.isTableInValidArea(table)
                }"
                @mousedown="props.activeLayerType === 'tables' && props.startDragTable($event, tIdx)"
              />
              <ellipse
                v-else-if="table.shape === 'circle'"
                :cx="table.x + table.width / 2"
                :cy="table.y + table.height / 2"
                :rx="table.width / 2"
                :ry="table.height / 2"
                class="table-rect"
                :class="{
                  selected: props.selectedTableIndex === tIdx && !props.selectedChairIndex,
                  invalid: props.draggingTable === tIdx && !props.isTableInValidArea(table)
                }"
                @mousedown="props.activeLayerType === 'tables' && props.startDragTable($event, tIdx)"
              />
              <path
                v-else-if="table.shape === 'L'"
                :d="`M ${table.x} ${table.y} H ${table.x + table.width} V ${table.y + (table.extraAttributes?.lThicknessY || table.height * 0.4)} H ${table.x + (table.extraAttributes?.lThicknessX || table.width * 0.4)} V ${table.y + table.height} H ${table.x} Z`"
                class="table-rect"
                :class="{
                  selected: props.selectedTableIndex === tIdx && !props.selectedChairIndex,
                  invalid: props.draggingTable === tIdx && !props.isTableInValidArea(table)
                }"
                @mousedown="props.activeLayerType === 'tables' && props.startDragTable($event, tIdx)"
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
                  selected: props.selectedTableIndex === tIdx && !props.selectedChairIndex,
                  invalid: props.draggingTable === tIdx && !props.isTableInValidArea(table)
                }"
                @mousedown="props.activeLayerType === 'tables' && props.startDragTable($event, tIdx)"
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

              <template v-if="props.activeLayerType === 'tables' && props.selectedTableIndex === tIdx && !props.selectedChairIndex">
                <circle
                  v-for="(pos, pIdx) in [
                    { x: table.x, y: table.y },
                    { x: table.x + table.width, y: table.y },
                    { x: table.x, y: table.y + table.height },
                    { x: table.x + table.width, y: table.y + table.height }
                  ]"
                  :key="pIdx"
                  :cx="pos.x"
                  :cy="pos.y"
                  r="6"
                  class="rotation-handle"
                  @mousedown="props.startRotateTable($event, tIdx)"
                />
              </template>
            </g>

            <g v-for="(chair, cIdx) in table.chairs" :key="cIdx">
              <rect
                :x="chair.x"
                :y="chair.y"
                width="30"
                height="30"
                rx="5"
                class="chair-rect"
                :class="{ selected: props.selectedChairIndex?.tableIndex === tIdx && props.selectedChairIndex?.chairIndex === cIdx }"
                :transform="`rotate(${chair.rotation || 0}, ${chair.x + 15}, ${chair.y + 15})`"
                @mousedown="props.activeLayerType === 'tables' && props.startDragChair($event, tIdx, cIdx)"
              />
              <template v-if="props.activeLayerType === 'tables' && props.selectedChairIndex?.tableIndex === tIdx && props.selectedChairIndex?.chairIndex === cIdx">
                <circle
                  v-for="(pos, pIdx) in [
                    { x: chair.x, y: chair.y },
                    { x: chair.x + 30, y: chair.y },
                    { x: chair.x, y: chair.y + 30 },
                    { x: chair.x + 30, y: chair.y + 30 }
                  ]"
                  :key="pIdx"
                  :cx="pos.x"
                  :cy="pos.y"
                  r="4"
                  class="rotation-handle"
                  :transform="`rotate(${chair.rotation || 0}, ${chair.x + 15}, ${chair.y + 15})`"
                  @mousedown="props.startRotateChair($event, tIdx, cIdx)"
                />
              </template>
            </g>
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>
