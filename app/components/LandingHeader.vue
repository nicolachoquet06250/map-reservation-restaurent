<script setup lang="ts">
const route = useRoute();
const token = useCookie('auth_token').value

const { data: profileData } = await useFetch('/api/profile', {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
})

const isAuthenticated = computed(() => !!profileData.value);
</script>

<template>
  <header class="landing-header">
    <NuxtLink to="/" class="brand">
      <span class="brand-mark">RB</span>
      <span class="brand-name">RestauBuilder</span>
    </NuxtLink>
    <NuxtLink to="/dashboard" v-if="isAuthenticated">
      <div class="profile-card">
        <div class="profile-text">
          <strong>{{ profileData!.name }}</strong>
          <span>{{profileData!.restaurantName}}</span>
        </div>
        <div class="profile-avatar">CM</div>
      </div>
    </NuxtLink>
    <div v-else>
      <NuxtLink v-if="route.path === '/login'" to="/register" class="btn btn-primary">S'inscrire</NuxtLink>
      <NuxtLink v-else to="/login" class="btn btn-primary">Connexion</NuxtLink>
    </div>
  </header>
</template>

<style scoped>
.landing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 6vw;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  z-index: 100;
  border-bottom: 1px solid #f1f5f9;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  color: #0f172a;
  text-decoration: none;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.brand-name {
  font-size: 1.25rem;
  letter-spacing: -0.02em;
}

.profile-card {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: white;
  border-radius: 999px;
  padding: 0.35rem 0.45rem 0.35rem 1rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  border: 1px solid #f1f5f9;
}

.profile-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.profile-text strong {
  font-size: 0.85rem;
  color: #1e293b;
}

.profile-text span {
  font-size: 0.75rem;
  color: #64748b;
}

.profile-avatar {
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #2563eb;
}
</style>
