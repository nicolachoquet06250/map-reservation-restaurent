<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
import type {Door, Room, Table, Zone} from "~/types/room";

const props = defineProps<{
  roomId: number;
  roomData: {
    room: Room,
    zones: Zone[],
    doors: Door[],
    tables: Table[]
  };
  reservationDate: Date;
}>();

const roomData = computed(() => ({
  ...props.roomData,
  zones: props.roomData.zones.map(zone => ({
    ...zone,
    units: new Set((zone.units as unknown as string).split(' '))
  })),
}));

const emit = defineEmits<{
  (e: 'reserved'): void;
}>();

const gridSize = 20;
const getZoneCenter = (units: Set<string>) => {
  if (units.size === 0) return { x: 0, y: 0 };
  const centers: Array<{ x: number; y: number }> = [];
  units.forEach(unit => {
    const [x = 0, y = 0] = unit.split(',').map(Number);
    centers.push({ x: x + gridSize / 2, y: y + gridSize / 2 });
  });

  if (centers.length === 0) return { x: 0, y: 0 };

  const average = centers.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
  );
  const target = { x: average.x / centers.length, y: average.y / centers.length };

  return centers.reduce((closest, point) => {
    const currentDistance = (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
    const closestDistance = (closest.x - target.x) ** 2 + (closest.y - target.y) ** 2;
    return currentDistance < closestDistance ? point : closest;
  });
};
const customerName = ref('');

const selectedChairs = ref<number[]>([]);

const zoomLevel = ref(1);
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.2);
};

const onMouseMove = (event: MouseEvent) => {
  if (isPanning.value) {
    panOffset.value.x += event.movementX / zoomLevel.value;
    panOffset.value.y += event.movementY / zoomLevel.value;
  }
};

const onMouseUp = () => {
  isPanning.value = false;
};

const onWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    event.preventDefault();
    if (event.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }
};

const startPanning = (event: MouseEvent) => {
  if ((event.target as SVGElement).classList.contains('canvas-background')) {
    isPanning.value = true;
  }
};

const toggleChair = (chairId: number) => {
  const index = selectedChairs.value.indexOf(chairId);
  if (index === -1) {
    selectedChairs.value.push(chairId);
  } else {
    selectedChairs.value.splice(index, 1);
  }
};

const toggleTable = (table: any) => {
  const availableChairs = table.chairs.filter((c: any) => !c.isReserved);
  if (availableChairs.length === 0) return;

  const allSelected = availableChairs.every((c: any) => selectedChairs.value.includes(c.id));

  if (allSelected) {
    // Si tout est sélectionné, on déselectionne tout pour cette table
    const chairIds = availableChairs.map((c: any) => c.id);
    selectedChairs.value = selectedChairs.value.filter(id => !chairIds.includes(id));
  } else {
    // Sinon, on sélectionne tout ce qui n'est pas déjà sélectionné
    availableChairs.forEach((c: any) => {
      if (!selectedChairs.value.includes(c.id)) {
        selectedChairs.value.push(c.id);
      }
    });
  }
};

const reserve = async () => {
  const Notify = (await import('simple-notify')).default;
  if (!customerName.value) {
    // @ts-ignore
    new Notify({
      status: 'warning',
      title: 'Attention',
      text: 'Veuillez entrer votre nom',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
    return;
  }
  if (selectedChairs.value.length === 0) {
    // @ts-ignore
    new Notify({
      status: 'warning',
      title: 'Attention',
      text: 'Veuillez sélectionner au moins une chaise',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
    return;
  }

  try {
    await $fetch('/api/reserve', {
      method: 'POST',
      body: {
        customerName: customerName.value,
        chairIds: selectedChairs.value,
        reservationDate: props.reservationDate
      }
    });
    emit('reserved')
    // @ts-ignore
    new Notify({
      status: 'success',
      title: 'Réservation réussie !',
      autoclose: true,
      autotimeout: 1500,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
    selectedChairs.value = [];
  } catch (e) {
    console.error(e);
    // @ts-ignore
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: 'Erreur lors de la réservation',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
  }
};

const tooltip = useTemplateRef('tooltip');

const OFFSET_X = 12;
const OFFSET_Y = 14;

function openTip(text: string) {
  tooltip.value!.textContent = text;
  tooltip.value!.dataset.open = "true";
  tooltip.value!.setAttribute('aria-hidden', 'false');
}

function closeTip() {
  tooltip.value!.dataset.open = "false";
  tooltip.value!.setAttribute('aria-hidden', 'true');
  tooltip.value!.style.transform = 'translate(-9999px, -9999px)';
}

function moveTip(clientX: number, clientY: number) {
  // Mesure après mise à jour du texte (sinon mauvais calcul)
  const rect = tooltip.value!.getBoundingClientRect();
  let x = clientX + OFFSET_X;
  let y = clientY - rect.height - OFFSET_Y; // au-dessus du curseur

  // Flip vertical si on dépasse en haut
  if (y < 8) y = clientY + OFFSET_Y;

  // Clamp horizontal si on dépasse à droite/gauche
  const maxX = window.innerWidth - rect.width - 8;
  if (x > maxX) x = maxX;
  if (x < 8) x = 8;

  tooltip.value!.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

const handleMouseOver = (e: MouseEvent) => {
  const el = (e.target as SVGElement).closest('[data-tooltip]');
  if (!el) return;
  openTip(el.getAttribute('data-tooltip') || '');
  moveTip(e.clientX, e.clientY);
}

const handleMouseMove = (e: MouseEvent) => {
  if (tooltip.value!.dataset.open !== "true") return;
  moveTip(e.clientX, e.clientY);
}

const handleMouseOut = (e: MouseEvent) => {
  // Fermer uniquement si on sort d'un élément tooltippé
  const from = (e.target as SVGElement).closest?.('[data-tooltip]');
  if (!from) return;
  closeTip();
}

onMounted(() => {
  window.addEventListener('blur', closeTip);
})
</script>

<template>
  <div ref="tooltip" class="svg-tooltip" role="tooltip" aria-hidden="true"/>

  <div class="reservation-container">
    <div class="header">
      <h1 class="header-title">Réservez votre place</h1>
      <div class="zoom-controls">
        <button class="btn btn-sm btn-secondary" @click="zoomOut" :disabled="zoomLevel <= 0.2">-</button>
        <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
        <button class="btn btn-sm btn-secondary" @click="zoomIn" :disabled="zoomLevel >= 3">+</button>
      </div>
      <div class="form">
        <input v-model="customerName" placeholder="Votre nom" class="form-input" />
        <button class="btn btn-primary btn-sm" @click="reserve">Réserver</button>
      </div>
    </div>

    <div class="canvas-area">
      <svg width="100%" height="100%" class="canvas-svg" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" @wheel="onWheel" @mousedown="startPanning">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eee" stroke-width="1"/>
          </pattern>
          <mask id="wallMaskClient">
            <rect width="10000" height="10000" x="-5000" y="-5000" fill="white" />
            <g v-for="(door, dIdx) in roomData?.doors" :key="`mask-door-${dIdx}`">
              <rect
                :x="door.x" :y="door.y"
                :width="door.width" :height="door.height"
                fill="black"
                :transform="`rotate(${door.rotation || 0}, ${door.x + door.width / 2}, ${door.y + door.height / 2})`"
              />
            </g>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" class="canvas-background" :transform="`translate(${panOffset.x % 20}, ${panOffset.y % 20})`" />

        <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`">
          <!-- Murs -->
          <polygon
            v-if="roomData?.room?.points"
            :points="roomData.room.points"
            class="wall-shape"
            mask="url(#wallMaskClient)"
          />

          <!-- Zones et estrades -->
          <g v-for="(zone, zIdx) in roomData?.zones" :key="`zone-${zIdx}`">
            <rect
              v-for="unit in Array.from(zone.units)"
              :key="unit"
              :x="unit.split(',')[0]"
              :y="unit.split(',')[1]"
              :width="gridSize"
              :height="gridSize"
              :fill="zone.type === 'zone' ? '#800020' : (zone.type === 'estrade' ? '#808080' : '#4a90e2')"
              fill-opacity="0.3"
              stroke="white"
              stroke-width="0.5"
              @mouseover="handleMouseOver"
              @mousemove="handleMouseMove"
              @mouseout="handleMouseOut"
              :data-tooltip="zone.name"
            />
            <g v-if="zone.name" class="zone-label-group" style="opacity: 0.6;">
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

          <!-- Portes -->
          <g v-for="(door, dIdx) in roomData?.doors" :key="`door-${dIdx}`">
            <g :transform="`rotate(${door.rotation || 0}, ${door.x + door.width / 2}, ${door.y + door.height / 2})`">
              <rect
                :x="door.x" :y="door.y"
                :width="door.width" :height="door.height"
                class="door-rect"
              />
              <!-- Représentation du sens d'ouverture -->
              <template v-if="(door as any).type === 'double'">
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

          {{roomData?.tables}}

          <g v-for="table in roomData?.tables" :key="table.id">
            <g :transform="`rotate(${table.rotation || 0}, ${Number(table.x) + Number(table.width) / 2}, ${Number(table.y) + Number(table.height) / 2})`">
              <!-- Table -->
              <rect
                v-if="table.shape === 'rectangle'"
                :x="Number(table.x)" :y="Number(table.y)"
                :width="Number(table.width)" :height="Number(table.height)"
                class="table-rect"
                style="fill-opacity: 0.8;"
                @click="toggleTable(table)"
              />
              <ellipse
                v-else-if="table.shape === 'circle'"
                :cx="Number(table.x) + Number(table.width)/2" :cy="Number(table.y) + Number(table.height)/2"
                :rx="Number(table.width)/2" :ry="Number(table.height)/2"
                class="table-rect"
                style="fill-opacity: 0.8;"
                @click="toggleTable(table)"
              />
              <path
                v-else-if="table.shape === 'L'"
                :d="`M ${Number(table.x)} ${Number(table.y)} H ${Number(table.x) + Number(table.width)} V ${Number(table.y) + (table.extraAttributes?.lThicknessY || Number(table.height) * 0.4)} H ${Number(table.x) + (table.extraAttributes?.lThicknessX || Number(table.width) * 0.4)} V ${Number(table.y) + Number(table.height)} H ${Number(table.x)} Z`"
                class="table-rect"
                style="fill-opacity: 0.8;"
                @click="toggleTable(table)"
              />
              <path
                v-else-if="table.shape === 'U'"
                :d="`
                  M ${Number(table.x)} ${Number(table.y)} 
                  H ${Number(table.x) + (table.extraAttributes?.uThickness || Number(table.width) * 0.3)}
                  V ${Number(table.y) + Number(table.height) - (table.extraAttributes?.uBaseThickness || Number(table.height) * 0.3)} 
                  H ${Number(table.x) + Number(table.width) - (table.extraAttributes?.uThickness || Number(table.width) * 0.3)} 
                  V ${Number(table.y)} 
                  H ${Number(table.x) + Number(table.width)} 
                  V ${Number(table.y) + Number(table.height)} 
                  H ${Number(table.x)} 
                  Z`"
                class="table-rect"
                style="fill-opacity: 0.8;"
                @click="toggleTable(table)"
              />
              <text
                :x="Number(table.x) + Number(table.width) / 2"
                :y="Number(table.y) + Number(table.height) / 2"
                text-anchor="middle"
                dominant-baseline="middle"
                class="table-label"
                :transform="`rotate(${- (table.rotation || 0)}, ${Number(table.x) + Number(table.width) / 2}, ${Number(table.y) + Number(table.height) / 2})`"
              >
                {{ table.name }}
              </text>
            </g>

            <!-- Chaises -->
            <rect
              v-for="chair in table.chairs" :key="chair.id"
              :x="Number(chair.x)" :y="Number(chair.y)"
              width="30" height="30" rx="5"
              class="chair-rect"
              :class="{ 
                selected: selectedChairs.includes(chair.id!),
                reserved: chair.isReserved 
              }"
              :transform="`rotate(${chair.rotation || 0}, ${Number(chair.x) + 15}, ${Number(chair.y) + 15})`"
              @click="!chair.isReserved && toggleChair(chair.id!)"
            />
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<style>
.custom-notify {
  margin-right: 40px;
}
</style>

<style scoped>
.reservation-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.header {
  padding: 0.25rem 1rem;
  background: #333;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-title {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 600;
}
.form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.form-input {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: none;
  font-size: 0.85rem;
}
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 4px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.zoom-text {
  font-size: 0.8rem;
  min-width: 45px;
  text-align: center;
  font-weight: 600;
  color: #374151;
}
.canvas-area {
  flex: 1;
  overflow: hidden;
  background: #f0f0f0;
}
.canvas-svg {
  cursor: grab;
}
.canvas-svg:active {
  cursor: grabbing;
}
.table-rect {
  fill: #e3d5ca;
  stroke: #d5bdaf;
  stroke-width: 2;
  cursor: pointer;
}
.table-rect:hover {
  stroke: #c4a484;
}
.wall-shape {
  fill: rgba(60, 60, 60, 0.1);
  stroke: #2b2b2b;
  stroke-width: 4;
  stroke-linecap: square;
  stroke-linejoin: miter;
  pointer-events: none;
}
.door-rect {
  fill: #fff;
  stroke: #333;
  stroke-width: 2;
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
.zone-label-group {
  pointer-events: none;
}
.zone-name-badge {
  fill: rgba(0, 0, 0, 0.4);
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
}
.chair-rect {
  fill: #fff;
  stroke: #ccc;
  cursor: pointer;
  transition: all 0.2s;
}
.chair-rect:hover {
  stroke: #999;
}
.chair-rect.selected {
  fill: #ff4500;
  stroke: #ff4500;
}
.chair-rect.reserved {
  fill: #ccc;
  cursor: not-allowed;
}
.table-label {
  font-size: 10px;
  fill: #666;
  pointer-events: none;
}

.svg-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  padding: 6px 10px;
  border-radius: 8px;
  font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: rgba(20, 20, 20, 0.92);
  color: #fff;
  box-shadow: 0 6px 24px rgba(0,0,0,0.25);
  opacity: 0;
  transform: translate(-9999px, -9999px);
  transition: opacity 80ms linear;
  white-space: nowrap;
}
.svg-tooltip[data-open="true"] { opacity: 1; }
</style>
