<script setup lang="ts">
const { data: rooms } = await useFetch('/api/rooms');
const route = useRoute();

const token = useCookie('auth_token').value

const { data: profileData } = await useFetch('/api/profile', {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
})

const profileInitials = computed(() => {
  const name = profileData.value?.name ?? ''
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'RB'
  return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
})
</script>

<template>
  <div class="app-layout">
    <header v-if="!route.path.startsWith('/reservation/')" class="app-header">
      <div class="logo">
        <NuxtLink to="/" style="color: white; text-decoration: none;">
          RestauBuilder
        </NuxtLink>
      </div>
      <nav class="main-nav">
        <NuxtLink to="/dashboard" class="btn" :class="{ active: route.path === '/dashboard' }">Dashboard</NuxtLink>
        <NuxtLink
            to="/profile"
            class="avatar-link"
            :class="{ active: route.path === '/profile' }"
            aria-label="Accéder au profil"
        >
          <span class="avatar-circle">{{ profileInitials }}</span>
        </NuxtLink>
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

.avatar-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px solid transparent;
  text-decoration: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.avatar-circle {
  font-size: 0.75rem;
  font-weight: 700;
  color: #2563eb;
}

.avatar-link.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.avatar-link:hover {
  border-color: #94a3b8;
}
</style>
