<script setup lang="ts">
import type { Door, Table } from '~/types';

const props = defineProps<{
  tables: Table[];
  doors: Door[];
  selectedTableIndex: number | null;
  selectedChairIndex: { tableIndex: number; chairIndex: number } | null;
  selectedDoorIndex: number | null;
  flipChair: (tableIndex: number, chairIndex: number) => void;
  removeChair: (tableIndex: number, chairIndex: number) => void;
  clearSelectedChair: () => void;
  flipTable: (index: number) => void;
  addChair: (index: number) => void;
  removeTable: (index: number) => void;
  ensureTableExtraAttributes: (index: number) => void;
  alignDoorToWall: (index: number) => void;
  flipDoor: (index: number) => void;
  removeDoor: (index: number) => void;
}>();
</script>

<template>
  <div v-if="props.selectedTableIndex !== null || props.selectedDoorIndex !== null" class="properties-panel">
    <div v-if="props.selectedTableIndex !== null">
      <div v-if="props.selectedChairIndex">
        <h3>Chaise</h3>
        <p class="parent-info">Table: <strong>{{ props.tables[props.selectedChairIndex.tableIndex]?.name }}</strong></p>
        <label>Rotation (°): <input type="number" v-model.number="props.tables[props.selectedChairIndex.tableIndex]!.chairs[props.selectedChairIndex.chairIndex]!.rotation" /></label>
        <div class="actions">
          <button @click="props.flipChair(props.selectedChairIndex.tableIndex, props.selectedChairIndex.chairIndex)" class="btn btn-primary" title="Faire pivoter la chaise de 180°">Pivoter 180°</button>
          <button @click="props.removeChair(props.selectedChairIndex.tableIndex, props.selectedChairIndex.chairIndex)" class="btn btn-danger">Supprimer</button>
          <button @click="props.clearSelectedChair" class="btn btn-secondary">Retour</button>
        </div>
      </div>
      <div v-else>
        <h3>Table</h3>
        <label>Nom: <input v-model="props.tables[props.selectedTableIndex]!.name" /></label>
        <label>
          Forme:
          <select v-model="props.tables[props.selectedTableIndex]!.shape" @change="props.ensureTableExtraAttributes(props.selectedTableIndex)">
            <option value="rectangle">Rectangle</option>
            <option value="circle">Cercle</option>
            <option value="L">Table en L</option>
            <option value="U">Table en U</option>
          </select>
        </label>
        <div class="properties-group">
          <label>Largeur: <input type="number" v-model.number="props.tables[props.selectedTableIndex]!.width" /></label>
          <label>Hauteur: <input type="number" v-model.number="props.tables[props.selectedTableIndex]!.height" /></label>
        </div>
        <label>Rotation (°): <input type="number" v-model.number="props.tables[props.selectedTableIndex]!.rotation" /></label>

        <div v-if="props.tables[props.selectedTableIndex]?.shape === 'L'" class="properties-group">
          <label>Épaisseur H: <input type="number" v-model.number="props.tables[props.selectedTableIndex]!.extraAttributes!.lThicknessX" /></label>
          <label>Épaisseur V: <input type="number" v-model.number="props.tables[props.selectedTableIndex]!.extraAttributes!.lThicknessY" /></label>
        </div>

        <div v-if="props.tables[props.selectedTableIndex]?.shape === 'U'" class="properties-group">
          <label>Épaisseur branches: <input type="number" v-model.number="props.tables[props.selectedTableIndex]!.extraAttributes!.uThickness" /></label>
          <label>Épaisseur base: <input type="number" v-model.number="props.tables[props.selectedTableIndex]!.extraAttributes!.uBaseThickness" /></label>
        </div>

        <div class="actions">
          <button @click="props.flipTable(props.selectedTableIndex)" class="btn btn-primary" title="Faire pivoter la table de 180°">Pivoter 180°</button>
          <button @click="props.addChair(props.selectedTableIndex)" class="btn btn-primary">Ajouter une chaise</button>
          <button @click="props.removeTable(props.selectedTableIndex)" class="btn btn-danger">Supprimer la table</button>
        </div>
      </div>
    </div>

    <div v-else-if="props.selectedDoorIndex !== null">
      <div class="panel-header">
        <h3>Porte {{ props.doors[props.selectedDoorIndex]!.type === 'double' ? 'double' : 'simple' }}</h3>
      </div>

      <div class="form-group">
        <label>Largeur (cm)</label>
        <input
          type="number"
          v-model.number="props.doors[props.selectedDoorIndex]!.width"
          step="5"
          @input="props.alignDoorToWall(props.selectedDoorIndex)"
        />
      </div>

      <div class="actions">
        <button @click="props.flipDoor(props.selectedDoorIndex)" class="btn btn-primary" title="Faire pivoter la porte de 180°">Pivoter 180°</button>
        <button @click="props.removeDoor(props.selectedDoorIndex)" class="btn btn-danger">Supprimer la porte</button>
      </div>
    </div>
  </div>
</template>
