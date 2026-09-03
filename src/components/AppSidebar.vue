<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-brand">
      <img src="/logo.jpeg" alt="Alto Rango" style="height: 48px; width: 48px; object-fit: contain; border-radius: 8px; flex-shrink: 0;" />
      <transition name="fade">
        <span v-if="!collapsed || isMobile" class="brand-name">Alto Rango</span>
      </transition>
    </div>
    <nav class="sidebar-nav">
      <router-link v-for="item in menuItems" :key="item.path" :to="item.path" class="nav-item" :class="{ active: $route.path === item.path }">
        <span class="nav-icon">{{ item.icon }}</span>
        <transition name="fade">
          <span v-if="!collapsed || isMobile" class="nav-label">{{ item.label }}</span>
        </transition>
        <span v-if="(!collapsed || isMobile) && item.badge" class="nav-badge">{{ item.badge }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

const props = defineProps({ collapsed: Boolean })
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const isMobile = ref(false)
const checkMobile = () => { isMobile.value = window.innerWidth <= 768 }

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))

const allItems = [
  // Admin + Empleado
  { path: '/', icon: '📊', label: 'Dashboard', roles: ['admin', 'empleado'] },
  { path: '/clientes', icon: '👥', label: 'Clientes', roles: ['admin', 'empleado'] },
  { path: '/membresias', icon: '💳', label: 'Membresías', roles: ['admin'] },
  { path: '/cobros', icon: '💰', label: 'Cobros', roles: ['admin'] },
  { path: '/ventas', icon: '🛒', label: 'Ventas', roles: ['admin', 'empleado'] },
  { path: '/asistencia', icon: '✅', label: 'Asistencia', roles: ['admin', 'empleado'] },
  { path: '/entrenadores', icon: '🏋️', label: 'Entrenadores', roles: ['admin'] },
  { path: '/clases', icon: '📅', label: 'Clases', roles: ['admin', 'empleado'] },
  { path: '/rutinas', icon: '📝', label: 'Rutinas', roles: ['admin', 'empleado'] },
  { path: '/tienda', icon: '🛍️', label: 'Tienda', roles: ['admin', 'empleado'], badgeKey: 'cart' },
  { path: '/inventario', icon: '📦', label: 'Inventario', roles: ['admin'] },
  { path: '/reportes', icon: '📈', label: 'Reportes', roles: ['admin'] },
  { path: '/configuracion', icon: '⚙️', label: 'Configuración', roles: ['admin'] },
  { path: '/perfil', icon: '👤', label: 'Mi perfil', roles: ['admin', 'empleado'] },
  { path: '/public-store', icon: '🌐', label: 'Tienda Pública', roles: ['admin', 'empleado'] },
  // Solo cliente (usuario)
  { path: '/inicio-cliente', icon: '🏠', label: 'Inicio', roles: ['usuario'] },
  { path: '/mi-membresia', icon: '💳', label: 'Mi membresía', roles: ['usuario'] },
  { path: '/mis-asistencias', icon: '🕐', label: 'Mis asistencias', roles: ['usuario'] },
  { path: '/clases', icon: '📅', label: 'Mis clases', roles: ['usuario'] },
  { path: '/rutinas', icon: '🏋️', label: 'Mi rutina', roles: ['usuario'] },
  { path: '/tienda', icon: '🛍️', label: 'Tienda', roles: ['usuario'], badgeKey: 'cart' },
  { path: '/public-store', icon: '🌐', label: 'Tienda Pública', roles: ['usuario'] },
  { path: '/perfil', icon: '👤', label: 'Mi perfil', roles: ['usuario'] },
]

const menuItems = computed(() =>
  allItems
    .filter(i => i.roles.includes(auth.userRole))
    .map(i => ({
      ...i,
      badge: i.badgeKey === 'cart' ? (cart.totalItems || null) : null,
    }))
)
</script>

<style scoped>
.sidebar {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex; flex-direction: column;
  transition: width 0.3s ease;
  z-index: 50;
  backdrop-filter: blur(20px);
}
.sidebar.collapsed { width: 72px; }

.sidebar-brand {
  display: flex; align-items: center; gap: 12px;
  padding: 20px; height: var(--header-height);
  border-bottom: 1px solid var(--border-color);
}
.brand-name {
  font-family: var(--font-display); font-size: 1.4rem; font-weight: 800;
  background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

.sidebar-nav { flex: 1; padding: 12px 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }

.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 16px; border-radius: var(--radius-sm);
  color: var(--text-secondary); text-decoration: none;
  transition: var(--transition); font-size: 0.9rem; font-weight: 500;
  position: relative;
}
.nav-item:hover { background: rgba(59,130,246,0.08); color: var(--text-primary); }
.nav-item.active {
  background: rgba(59,130,246,0.12); color: var(--accent-light);
}
.nav-item.active::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 60%; background: var(--gradient-primary); border-radius: 0 4px 4px 0;
}
.nav-icon { font-size: 1.2rem; width: 24px; text-align: center; flex-shrink: 0; }
.nav-badge {
  margin-left: auto;
  background: var(--gradient-primary); color: white;
  font-size: 0.7rem; font-weight: 700;
  padding: 2px 8px; border-radius: 50px;
}

.sidebar-footer {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; border-top: 1px solid var(--border-color);
  color: var(--text-muted); cursor: pointer;
  transition: var(--transition); font-size: 0.9rem;
}
.sidebar-footer:hover { color: var(--danger); background: rgba(239,68,68,0.08); }

@media (max-width: 768px) {
  /* No width collapse logic on mobile, only translate handled by App.vue */
  .sidebar.collapsed { width: var(--sidebar-width); }
}
</style>
