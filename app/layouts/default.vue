<script setup lang="ts">
const { data: rooms } = await useFetch('/api/rooms');
const route = useRoute();
</script>

<template>
  <div class="app-layout">
    <header v-if="!route.path.startsWith('/reservation/')" class="app-header">
      <div class="logo">RestauBuilder</div>
      <nav class="main-nav">
        <NuxtLink to="/builder" class="btn" :class="{ active: route.path === '/builder' }">Mode Restaurateur</NuxtLink>
        <NuxtLink to="/reservations" class="btn" :class="{ active: route.path === '/reservations' }">Liste des Réservations</NuxtLink>
      </nav>
    </header>
    <slot />
  </div>
</template>

<style>
/* Styles globaux déplacés ici */
:root {
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

body {
  margin: 0;
  padding: 0;
  font-family: inherit;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  font-size: 0.9rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
}
.btn:hover {
  background: #f3f4f6;
}
.btn-primary {
  background: #2563eb;
  color: white;
  border-color: #1d4ed8;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-primary:disabled {
  background: #93c5fd;
  border-color: #93c5fd;
  cursor: not-allowed;
}
.btn-danger {
  background: #ef4444;
  color: white;
  border-color: #dc2626;
}
.btn-danger:hover {
  background: #dc2626;
}
.btn-secondary {
  background: white;
  color: #374151;
  border-color: #d1d5db;
}
.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}
</style>

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
  padding: 0.5rem 1rem;
  color: white;
}
.logo {
  font-weight: bold;
  font-size: 1.2rem;
}
.main-nav {
  display: flex;
  gap: 0.5rem;
}
.main-nav .btn.active {
  background: #2563eb;
  border-color: #1d4ed8;
  color: white;
}
</style>
