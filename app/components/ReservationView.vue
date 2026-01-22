<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
import type {Table} from "~/components/RoomBuilder.vue";

const props = defineProps<{
  roomId: number;
}>();

const { data: roomData, refresh } = await useFetch<{tables: Table[]}>(() => `/api/room?id=${props.roomId}`, {
  transform: (data) => {
    return {
      tables: data.tables.map(t => ({
        ...t,
        extraAttributes: t.extraAttributes || {
          lThicknessX: 40,
          lThicknessY: 40,
          uThickness: 30,
          uBaseThickness: 30
        }
      }))
    }
  }
});
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
        chairIds: selectedChairs.value
      }
    });
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
    refresh();
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
</script>

<template>
  <div class="reservation-container">
    <div class="header">
      <h1>Réservez votre place</h1>
      <div class="zoom-controls">
        <button class="btn btn-sm btn-secondary" @click="zoomOut" :disabled="zoomLevel <= 0.2">-</button>
        <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
        <button class="btn btn-sm btn-secondary" @click="zoomIn" :disabled="zoomLevel >= 3">+</button>
      </div>
      <div class="form">
        <input v-model="customerName" placeholder="Votre nom" />
        <button class="btn btn-primary" @click="reserve">Réserver</button>
      </div>
    </div>

    <div class="canvas-area">
      <svg width="100%" height="100%" class="canvas-svg" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" @wheel="onWheel" @mousedown="startPanning">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eee" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" class="canvas-background" :transform="`translate(${panOffset.x % 20}, ${panOffset.y % 20})`" />

        <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`">
          <g v-for="table in roomData?.tables" :key="table.id">
            <g :transform="`rotate(${table.rotation || 0}, ${Number(table.x) + Number(table.width) / 2}, ${Number(table.y) + Number(table.height) / 2})`">
              <!-- Table -->
              <rect
                v-if="table.shape === 'rectangle'"
                :x="Number(table.x)" :y="Number(table.y)"
                :width="Number(table.width)" :height="Number(table.height)"
                class="table-rect"
                @click="toggleTable(table)"
              />
              <ellipse
                v-else-if="table.shape === 'circle'"
                :cx="Number(table.x) + Number(table.width)/2" :cy="Number(table.y) + Number(table.height)/2"
                :rx="Number(table.width)/2" :ry="Number(table.height)/2"
                class="table-rect"
                @click="toggleTable(table)"
              />
              <path
                v-else-if="table.shape === 'L'"
                :d="`M ${Number(table.x)} ${Number(table.y)} H ${Number(table.x) + Number(table.width)} V ${Number(table.y) + (table.extraAttributes?.lThicknessY || Number(table.height) * 0.4)} H ${Number(table.x) + (table.extraAttributes?.lThicknessX || Number(table.width) * 0.4)} V ${Number(table.y) + Number(table.height)} H ${Number(table.x)} Z`"
                class="table-rect"
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
  font-family: sans-serif;
}
.header {
  padding: 1rem;
  background: #333;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.form {
  display: flex;
  gap: 1rem;
}
.form input {
  padding: 0.5rem;
  border-radius: 4px;
  border: none;
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
.canvas-background {
  cursor: grab;
}
.canvas-background:active {
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
</style>
