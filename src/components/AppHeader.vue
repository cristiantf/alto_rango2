<template>
  <header class="app-header">
    <div class="header-left">
      <button class="btn-icon header-menu-btn" @click="$emit('toggle-sidebar')">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      <div class="mobile-brand-name">Alto Rango</div>
      <div class="header-greeting">
        <h2>{{ greeting }}, {{ auth.userName }}</h2>
        <p class="header-sub">{{ auth.gymName }} · {{ auth.userRoleLabel }} · {{ today }}</p>
      </div>
    </div>
    <div class="header-right">
      <div class="notif-wrap">
        <button class="header-cart btn-icon" style="background: none; border: none; cursor: pointer;" @click="toggleNotifs">
          🔔
          <span v-if="gym.unreadNotifications" class="cart-count" style="background: var(--danger)">{{ gym.unreadNotifications }}</span>
        </button>
        <div v-if="showNotifs" class="notif-panel">
          <div class="notif-head">
            <strong>Notificaciones</strong>
            <button class="btn-icon" style="font-size:0.8rem" @click="gym.markNotificationsRead()">Marcar leídas</button>
          </div>
          <div v-if="!gym.notifications.length" class="notif-empty">Sin notificaciones</div>
          <div v-for="n in gym.notifications.slice(0, 8)" :key="n.id" class="notif-item" :class="{ unread: !n.read }">
            <strong>{{ n.title }}</strong>
            <p>{{ n.message }}</p>
            <small v-if="n.detail">{{ n.detail }}</small>
          </div>
        </div>
      </div>
      <router-link v-if="auth.canSell" to="/tienda" class="header-cart btn-icon" id="header-cart-btn">
        🛒
        <span v-if="cart.totalItems" class="cart-count">{{ cart.totalItems }}</span>
      </router-link>
      <router-link to="/perfil" class="header-avatar-link" id="header-profile-btn" title="Ver mi perfil">
        <img v-if="auth.user?.photoUrl" :src="auth.user.photoUrl" class="avatar avatar-photo" alt="Foto de perfil" />
        <div v-else class="avatar">{{ auth.user?.avatar || 'A' }}</div>
      </router-link>
      <button class="btn-icon header-logout-btn" @click="handleLogout" title="Cerrar Sesión" style="font-size: 1.5rem; padding: 6px 10px;">
        🚪
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useGymStore } from '../stores/gym'

defineEmits(['toggle-sidebar'])

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const gym = useGymStore()
const showNotifs = ref(false)

function handleLogout() {
  auth.logout()
  router.push('/login')
}

function toggleNotifs() {
  showNotifs.value = !showNotifs.value
}

function onDocClick(e) {
  if (!e.target.closest('.notif-wrap')) showNotifs.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
})

const today = computed(() => new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
</script>

<style scoped>
.app-header {
  position: fixed; top: 0; right: 0; left: var(--sidebar-width);
  height: var(--header-height);
  background: rgba(6,11,24,0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px;
  z-index: 40;
  transition: left 0.3s ease;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.header-menu-btn { font-size: 1.2rem; display: none; }
.header-greeting h2 { font-size: 1rem; font-weight: 600; }
.header-sub { font-size: 0.8rem; color: var(--text-muted); text-transform: capitalize; }
.header-right { display: flex; align-items: center; gap: 12px; }
.header-cart { position: relative; font-size: 1.2rem; }
.cart-count {
  position: absolute; top: -6px; right: -6px;
  background: var(--gradient-primary); color: white;
  font-size: 0.65rem; font-weight: 700;
  min-width: 18px; height: 18px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.notif-wrap { position: relative; }
.notif-panel {
  position: absolute; right: 0; top: 42px; width: 320px; max-height: 360px; overflow-y: auto;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); box-shadow: var(--shadow-lg); padding: 8px;
  z-index: 60;
}
.notif-head { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--border-color); }
.notif-empty { padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
.notif-item { padding: 10px 8px; border-bottom: 1px solid var(--border-color); font-size: 0.82rem; }
.notif-item.unread { background: rgba(59,130,246,0.08); }
.notif-item p { color: var(--text-secondary); margin-top: 2px; }
.notif-item small { color: var(--text-muted); }

.mobile-brand-name { display: none; font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

@media (max-width: 768px) {
  .app-header { left: 0; padding: 0 16px; }
  .header-menu-btn { display: flex; align-items: center; justify-content: center; padding: 6px; }
  .mobile-brand-name { display: block; }
  .header-greeting { display: none; }
}
@media (max-width: 480px) {
  .header-right { gap: 6px; }
}

.header-avatar-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  border-radius: 50%;
  transition: box-shadow 0.2s, transform 0.15s;
}
.header-avatar-link:hover {
  box-shadow: 0 0 0 3px rgba(139,92,246,0.5);
  transform: scale(1.05);
}
.avatar-photo {
  width: 38px;
  height: 38px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
}
</style>
