<script setup lang="ts">
const route = useRoute();

const shouldShowHeader = computed(() => {
  return !route.path.startsWith('/reservation/') && !route.path.startsWith('/builder');
});
</script>

<template>
  <div class="app-layout">
    <LandingHeader v-if="shouldShowHeader" />
    <slot />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
</style>