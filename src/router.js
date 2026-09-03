import { createRouter, createWebHashHistory } from "vue-router"
import { useAuthStore } from "./stores/auth"
import { pinia } from "./stores/pinia"

const routes = [
  { path: "/login", name: "Login", component: () => import("./views/LoginView.vue"), meta: { public: true } },
  { path: "/", name: "Dashboard", component: () => import("./views/DashboardView.vue"), meta: { roles: ["admin", "empleado"] } },
  { path: "/clientes", name: "Clientes", component: () => import("./views/ClientsView.vue"), meta: { roles: ["admin", "empleado"] } },
  { path: "/membresias", name: "Membresias", component: () => import("./views/MembershipsView.vue"), meta: { roles: ["admin"] } },
  { path: "/planes", name: "Planes", component: () => import("./views/PlansView.vue"), meta: { roles: ["admin"] } },
  { path: "/promociones", name: "Promociones", component: () => import("./views/PromotionsView.vue"), meta: { roles: ["admin"] } },
  { path: "/cobros", name: "Cobros", component: () => import("./views/PaymentsView.vue"), meta: { roles: ["admin"] } },
  { path: "/asistencia", name: "Asistencia", component: () => import("./views/AttendanceView.vue"), meta: { roles: ["admin", "empleado"] } },
  { path: "/entrenadores", name: "Entrenadores", component: () => import("./views/TrainersView.vue"), meta: { roles: ["admin"] } },
  { path: "/clases", name: "Clases", component: () => import("./views/ClassesView.vue"), meta: { roles: ["admin", "empleado", "usuario"] } },
  { path: "/tienda", name: "Tienda", component: () => import("./views/StoreView.vue"), meta: { roles: ["admin", "empleado", "usuario"] } },
  { path: "/carrito", name: "Carrito", component: () => import("./views/CartView.vue"), meta: { roles: ["admin", "empleado", "usuario"] } },
  { path: "/checkout", name: "Checkout", component: () => import("./views/CheckoutView.vue"), meta: { roles: ["admin", "empleado", "usuario"] } },
  { path: "/ventas", name: "Ventas", component: () => import("./views/SalesView.vue"), meta: { roles: ["admin", "empleado"] } },
  { path: "/inventario", name: "Inventario", component: () => import("./views/InventoryView.vue"), meta: { roles: ["admin"] } },
  { path: "/reportes", name: "Reportes", component: () => import("./views/ReportsView.vue"), meta: { roles: ["admin"] } },
  { path: "/configuracion", name: "Configuracion", component: () => import("./views/SettingsView.vue"), meta: { roles: ["admin"] } },
  { path: "/kiosk", name: "Kiosk", component: () => import("./views/KioskView.vue"), meta: { roles: ["admin", "empleado"] } },
  { path: "/rutinas", name: "Rutinas", component: () => import("./views/RoutinesView.vue"), meta: { roles: ["admin", "empleado", "usuario"] } },
  { path: "/perfil", name: "Perfil", component: () => import("./views/ProfileView.vue"), meta: { roles: ["admin", "empleado", "usuario"] } },
  { path: "/public-store", name: "PublicStore", component: () => import("./views/PublicStoreView.vue"), meta: { public: true } },
  { path: "/inicio-cliente", name: "ClientDashboard", component: () => import("./views/ClientDashboardView.vue"), meta: { roles: ["usuario"] } },
  { path: "/mis-asistencias", name: "MisAsistencias", component: () => import("./views/MyAttendanceView.vue"), meta: { roles: ["usuario"] } },
  { path: "/mi-membresia", name: "MiMembresia", component: () => import("./views/MyMembershipView.vue"), meta: { roles: ["usuario"] } },
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuthStore(pinia)
  if (!to.meta.public && !auth.isAuthenticated) {
    next({ path: "/login", replace: true })
    return
  }
  if (to.path === "/login" && auth.isAuthenticated) {
    next({ path: auth.isUsuario ? "/inicio-cliente" : "/", replace: true })
    return
  }
  if (to.meta.roles && auth.isAuthenticated && !to.meta.roles.includes(auth.userRole)) {
    const fallbackPath = auth.isUsuario ? "/inicio-cliente" : "/"
    if (to.path === fallbackPath) {
      auth.logout()
      next({ path: "/login", replace: true })
      return
    }
    next({ path: fallbackPath, replace: true })
    return
  }
  next()
})

export default router
