<script setup lang="ts">
const route = useRoute();
const tokenCookie = useCookie('auth_token')
const token = computed(() => tokenCookie.value)

const { data: profileData, refresh: refreshProfile } = await useFetch('/api/profile', {
  headers: { Authorization: `Bearer ${token.value}` },
  watch: [token],
})

const isAuthenticated = computed(() => Boolean(token.value));
const isMenuOpen = ref(false);
const profileMenuRef = ref<HTMLElement | null>(null);
const displayName = computed(() => profileData.value?.name ?? 'Chargement...')
const restaurantName = computed(() => profileData.value?.restaurantName ?? '')
const avatarInitials = computed(() => {
  if (!profileData.value?.name) {
    return '??'
  }
  const parts = profileData.value.name.trim().split(' ').filter(Boolean)
  return parts.map((part) => part[0]?.toUpperCase()).slice(0, 2).join('')
})

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

const handleLogout = () => {
  tokenCookie.value = null
  profileData.value = undefined
  closeMenu()
  navigateTo('/login')
}

watch(token, (value) => {
  if (!value) {
    profileData.value = undefined
    return
  }
  refreshProfile()
})

onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (!profileMenuRef.value) return;
    if (!profileMenuRef.value.contains(event.target as Node)) {
      closeMenu();
    }
  };
  document.addEventListener('click', handleClickOutside);
  onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
  });
});
</script>

<template>
  <header class="landing-header">
    <NuxtLink to="/" class="brand">
      <span class="brand-mark">RB</span>
      <span class="brand-name">RestauBuilder</span>
    </NuxtLink>
    <div v-if="isAuthenticated" class="auth-actions">
      <div class="profile-menu" ref="profileMenuRef">
        <button
            class="profile-card"
            type="button"
            aria-haspopup="true"
            :aria-expanded="isMenuOpen"
            @click="toggleMenu"
        >
          <div class="profile-text">
            <strong>{{ displayName }}</strong>
            <span v-if="restaurantName">{{ restaurantName }}</span>
          </div>
          <div class="profile-avatar">{{ avatarInitials }}</div>
        </button>
        <div class="profile-dropdown" role="menu" :class="{ open: isMenuOpen }">
          <NuxtLink to="/dashboard" class="dropdown-link" role="menuitem" @click="closeMenu">Dashboard</NuxtLink>
          <NuxtLink to="/profile" class="dropdown-link" role="menuitem" @click="closeMenu">Profil</NuxtLink>
          <button class="dropdown-link logout-link" type="button" role="menuitem" @click="handleLogout">
            Déconnexion
          </button>
        </div>
      </div>
    </div>
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

.auth-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.profile-menu {
  position: relative;
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
  text-decoration: none;
  cursor: pointer;
}

.profile-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  background: white;
  border-radius: 12px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  min-width: 180px;
  display: none;
  flex-direction: column;
  gap: 0.25rem;
}

.profile-menu:focus-within .profile-dropdown,
.profile-menu:hover .profile-dropdown {
  display: flex;
}

.dropdown-link {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  text-decoration: none;
  color: #0f172a;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
}

.dropdown-link:hover,
.dropdown-link:focus {
  background: #f1f5f9;
}

.dropdown-link.logout-link {
  color: #dc2626;
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
