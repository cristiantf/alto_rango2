<template>
  <div class="app-wrapper" :class="{ 'app-wrapper--public': !showAppShell }">
    <template v-if="showAppShell">
      <!-- Overlay para cerrar sidebar en móvil -->
      <div v-if="sidebarOpen" class="sidebar-overlay active" @click="sidebarOpen = false"></div>
      <AppSidebar :collapsed="sidebarCollapsed" :class="{ 'sidebar-mobile-open': sidebarOpen }" @toggle="sidebarCollapsed = !sidebarCollapsed" />
      <div class="main-area" :class="{ collapsed: sidebarCollapsed }">
        <AppHeader @toggle-sidebar="toggleSidebar" />
        <main class="main-content">
          <router-view />
        </main>
      </div>
    </template>
    <template v-else>
      <div class="public-shell">
        <router-view />
      </div>
    </template>
    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useGymStore }  from './stores/gym'
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import ToastContainer from './components/ToastContainer.vue'

const auth = useAuthStore()
const gym  = useGymStore()
const route = useRoute()
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const showAppShell = computed(() => auth.isAuthenticated && !route.meta.public)

function toggleSidebar() {
  // En móvil abre/cierra el drawer; en desktop colapsa/expande
  if (window.innerWidth <= 768) {
    sidebarOpen.value = !sidebarOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

// Cargar datos cuando el usuario está autenticado
onMounted(() => { if (auth.isAuthenticated) gym.loadAll() })
watch(() => auth.isAuthenticated, (val) => { if (val) gym.loadAll() })

// Cerrar sidebar en móvil al cambiar de ruta
watch(route, () => {
  if (window.innerWidth <= 768) {
    sidebarOpen.value = false
  }
})
</script>

<style>
.app-wrapper {
  display: flex;
  min-height: 100vh;
  width: 100%;
  position: relative;
}
.app-wrapper--public {
  display: block;
}
.public-shell {
  width: 100%;
  min-height: 100vh;
}

.main-area {
  flex: 1;
  margin-left: var(--sidebar-width);
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
}
.main-area.collapsed { margin-left: 72px; }

.main-content {
  flex: 1;
  padding: 28px;
  margin-top: var(--header-height);
}

@media (max-width: 768px) {
  .main-area { margin-left: 0 !important; }
  .main-content { padding: 16px; }
}

/* Sidebar como drawer en móvil */
.sidebar-overlay {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  z-index: 50; /* Menor que el sidebar (51) */
}
.sidebar-overlay.active { display: block; }

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 51;
  }
  .sidebar.sidebar-mobile-open {
    transform: translateX(0);
  }
}
</style>
