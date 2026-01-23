<script setup lang="ts">
const { data: rooms } = await useFetch('/api/rooms');
const route = useRoute();
</script>

<template>
  <div class="app-layout">
    <header v-if="!route.path.startsWith('/reservation/')" class="app-header">
      <div class="logo">RestauBuilder</div>
      <nav class="main-nav">
        <NuxtLink to="/dashboard" class="btn" :class="{ active: route.path === '/dashboard' }">Dashboard</NuxtLink>
      </nav>
    </header>
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
.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1a1a1a;
  padding: 0.25rem 1rem;
  color: white;
}
.logo {
  font-weight: bold;
  font-size: 1.1rem;
}
.main-nav {
  display: flex;
  gap: 0.5rem;
}
.main-nav .btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
}
.main-nav .btn.active {
  background: #2563eb;
  border-color: #1d4ed8;
  color: white;
}
</style>
