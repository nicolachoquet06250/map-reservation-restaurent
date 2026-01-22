<script setup lang="ts">
// Rediriger vers le builder par défaut
onMounted(() => {
  navigateTo('/builder');
});
</script>

<template>
  <div class="loading">
    <p>Chargement...</p>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #666;
}
</style>
