<script setup lang="ts">
import type { Table, Door } from '~/types/room';

const props = defineProps<{
  selectedTableIndex: number | null;
  selectedChairIndex: { tableIndex: number; chairIndex: number } | null;
  selectedDoorIndex: number | null;
  tables: Table[];
  doors: Door[];
}>();

const emit = defineEmits<{
  (e: 'updateTableShape', index: number, shape: Table['shape']): void;
  (e: 'flipChair', tableIndex: number, chairIndex: number): void;
  (e: 'removeChair', tableIndex: number, chairIndex: number): void;
  (e: 'backFromChair'): void;
  (e: 'flipTable', index: number): void;
  (e: 'addChair', index: number): void;
  (e: 'removeTable', index: number): void;
  (e: 'flipDoor', index: number): void;
  (e: 'removeDoor', index: number): void;
  (e: 'alignDoorToWall', index: number): void;
}>();

const _tables = computed(() => props.tables);
const doors_ = computed(() => props.doors);

function onShapeChange(index: number, shape: Table['shape']) {
  emit('updateTableShape', index, shape);
}
</script>

<template>
  <div v-if="selectedTableIndex !== null || selectedDoorIndex !== null" class="properties-panel">
    <div v-if="selectedTableIndex !== null">
      <div v-if="selectedChairIndex">
        <h3>Chaise</h3>
        <p class="parent-info">Table: <strong>{{ _tables[selectedChairIndex.tableIndex]?.name }}</strong></p>
        <label>Rotation (°): <input type="number" v-model.number="_tables[selectedChairIndex.tableIndex]!.chairs[selectedChairIndex.chairIndex]!.rotation" /></label>
        <div class="actions">
          <button @click="emit('flipChair', selectedChairIndex.tableIndex, selectedChairIndex.chairIndex)" class="btn btn-primary" title="Faire pivoter la chaise de 180°">Pivoter 180°</button>
          <button @click="emit('removeChair', selectedChairIndex.tableIndex, selectedChairIndex.chairIndex)" class="btn btn-danger">Supprimer</button>
          <button @click="emit('backFromChair')" class="btn btn-secondary">Retour</button>
        </div>
      </div>
      <div v-else>
        <h3>Table</h3>
        <label>Nom: <input v-model="_tables[selectedTableIndex]!.name" /></label>
        <label>Forme:
          <select v-model="_tables[selectedTableIndex]!.shape" @change="onShapeChange(selectedTableIndex, _tables[selectedTableIndex]!.shape)">
            <option value="rectangle">Rectangle</option>
            <option value="circle">Cercle</option>
            <option value="L">Table en L</option>
            <option value="U">Table en U</option>
          </select>
        </label>
        <div class="properties-group">
          <label>Largeur: <input type="number" v-model.number="_tables[selectedTableIndex]!.width" /></label>
          <label>Hauteur: <input type="number" v-model.number="_tables[selectedTableIndex]!.height" /></label>
        </div>
        <label>Rotation (°): <input type="number" v-model.number="_tables[selectedTableIndex]!.rotation" /></label>

        <div v-if="_tables[selectedTableIndex]?.shape === 'L'" class="properties-group">
          <label>Épaisseur H: <input type="number" v-model.number="_tables[selectedTableIndex]!.extraAttributes!.lThicknessX" /></label>
          <label>Épaisseur V: <input type="number" v-model.number="_tables[selectedTableIndex]!.extraAttributes!.lThicknessY" /></label>
        </div>

        <div v-if="_tables[selectedTableIndex]?.shape === 'U'" class="properties-group">
          <label>Épaisseur branches: <input type="number" v-model.number="_tables[selectedTableIndex]!.extraAttributes!.uThickness" /></label>
          <label>Épaisseur base: <input type="number" v-model.number="_tables[selectedTableIndex]!.extraAttributes!.uBaseThickness" /></label>
        </div>

        <div class="actions">
          <button @click="emit('flipTable', selectedTableIndex)" class="btn btn-primary" title="Faire pivoter la table de 180°">Pivoter 180°</button>
          <button @click="emit('addChair', selectedTableIndex)" class="btn btn-primary">Ajouter une chaise</button>
          <button @click="emit('removeTable', selectedTableIndex)" class="btn btn-danger">Supprimer la table</button>
        </div>
      </div>
    </div>

    <div v-else-if="selectedDoorIndex !== null">
      <div class="panel-header">
        <h3>Porte {{ doors_[selectedDoorIndex]!.type === 'double' ? 'double' : 'simple' }}</h3>
      </div>

      <div class="form-group">
        <label>Largeur (cm)</label>
        <input type="number" v-model.number="doors_[selectedDoorIndex]!.width" step="5" @input="emit('alignDoorToWall', selectedDoorIndex)" />
      </div>

      <div class="actions">
        <button @click="emit('flipDoor', selectedDoorIndex)" class="btn btn-primary" title="Faire pivoter la porte de 180°">Pivoter 180°</button>
        <button @click="emit('removeDoor', selectedDoorIndex)" class="btn btn-danger">Supprimer la porte</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.properties-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 280px;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.25rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  max-height: calc(100% - 2rem - 40px);
  overflow-y: auto;
  z-index: 10;
}
.properties-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 0.5rem;
}
.parent-info {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 1rem;
}
.parent-info strong {
  color: #374151;
}
.properties-panel label {
  display: block;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
}
.properties-panel input, .properties-panel select {
  width: calc(100% - 10px);
  margin-top: 0.25rem;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #1f2937;
  transition: border-color 0.2s;
}
.properties-panel input:focus, .properties-panel select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}
.properties-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary {
  background-color: #2563eb;
  color: white;
  border: 1px solid transparent;
}
.btn-primary:hover {
  background-color: #1d4ed8;
}
.btn-danger {
  background-color: #ef4444;
  color: white;
  border: 1px solid transparent;
}
.btn-danger:hover {
  background-color: #dc2626;
}
.btn-secondary {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}
.btn-secondary:hover {
  background-color: #f3f4f6;
}
</style>
