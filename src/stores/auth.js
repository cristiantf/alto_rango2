import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const DEFAULT_GYM = {
  id: 1,
  name: 'Alto Rango Gym',
  logo: '💪',
  currency: 'USD',
  phone: '+593 999 000 111',
  address: 'Av. Principal 123',
  city: 'Quito',
  email: 'info@altorango.com',
  website: 'www.altorango.com',
}

const ROLE_LABELS = {
  admin: 'Administrador',
  empleado: 'Empleado/Encargado',
  usuario: 'Usuario',
}

function initials(name) {
  return (name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function normalizeRole(raw, roleId) {
  const value = String(raw || '').toLowerCase().trim()
  if (roleId === 1) return 'admin'
  if (roleId === 2) return 'empleado'
  if (roleId === 3) return 'usuario'
  if (['admin', 'administrador', 'super admin', 'superadmin'].includes(value)) return 'admin'
  if (['empleado', 'encargado', 'recepcion', 'recepcionista'].includes(value)) return 'empleado'
  if (value === 'usuario') return 'usuario'
  return value || 'usuario'
}

function normalizeUser(data) {
  if (!data) return null
  const role = normalizeRole(data.role, data.role_id)
  return {
    ...data,
    role,
    position: data.position || ROLE_LABELS[role] || role,
    avatar: data.photoUrl ? null : (data.avatar || initials(data.name)),
  }
}

export const useAuthStore = defineStore('auth', () => {
  // ── Estado persistido en localStorage ──────────────────
  let initialUser = null
  try { initialUser = JSON.parse(localStorage.getItem('gym_user') || 'null') } catch { /* noop */ }

  let initialGym = DEFAULT_GYM
  try {
    const g = JSON.parse(localStorage.getItem('gym_info') || 'null')
    if (g) initialGym = { ...DEFAULT_GYM, ...g }
  } catch { /* noop */ }

  const user        = ref(normalizeUser(initialUser))
  const gym         = ref(initialGym)
  const systemUsers = ref([])   // se carga desde la API

  // ── Computed ────────────────────────────────────────────
  const isAuthenticated  = computed(() => !!user.value)
  const userName         = computed(() => user.value?.name || '')
  const userRole         = computed(() => user.value?.role || '')
  const userRoleLabel    = computed(() => ROLE_LABELS[user.value?.role] || user.value?.role || '')
  const gymName          = computed(() => gym.value?.name || 'Alto Rango Gym')
  const isAdmin          = computed(() => user.value?.role === 'admin')
  const isEmpleado       = computed(() => user.value?.role === 'empleado')
  const isUsuario        = computed(() => user.value?.role === 'usuario')
  const canManageUsers   = computed(() => isAdmin.value)
  const canManagePlans   = computed(() => isAdmin.value)
  const canSell          = computed(() => isAdmin.value || isEmpleado.value)
  const canAccessControl = computed(() => isAdmin.value || isEmpleado.value)

  // ── Login → llama a POST /api/auth/login ────────────────
  async function login(email, password) {
    if (!email || !password) return false
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) return false
      const data = await res.json()
      const u = normalizeUser({
        ...data,
        photoUrl: data.photoUrl || null,
      })
      user.value = u
      localStorage.setItem('gym_user', JSON.stringify(u))
      if (data.gym) {
        gym.value = { ...gym.value, ...data.gym }
        localStorage.setItem('gym_info', JSON.stringify(gym.value))
      } else {
        localStorage.setItem('gym_info', JSON.stringify(gym.value))
      }
      return true
    } catch (err) {
      console.error('Login error:', err)
      return false
    }
  }

  function logout() {
    user.value = null
    localStorage.removeItem('gym_user')
  }

  // ── Usuarios del sistema (cargados desde API) ───────────
  async function loadSystemUsers() {
    try {
      const res = await fetch(`${API}/users`)
      if (res.ok) systemUsers.value = await res.json()
    } catch (err) { console.error('loadSystemUsers error:', err) }
  }

  async function addUser(userData) {
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      if (res.ok) await loadSystemUsers()
    } catch (err) { console.error('addUser error:', err) }
  }

  async function updateUser(id, data) {
    try {
      const res = await fetch(`${API}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        await loadSystemUsers()
        // Si es el usuario en sesión, actualizar también el estado local
        if (user.value?.id === id) {
          user.value = {
            ...user.value,
            ...data,
            avatar: data.photoUrl ? null : (data.name ? initials(data.name) : user.value.avatar),
          }
          localStorage.setItem('gym_user', JSON.stringify(user.value))
        }
      }
    } catch (err) { console.error('updateUser error:', err) }
  }

  async function deleteUser(id) {
    if (user.value?.id === id) return false
    try {
      const res = await fetch(`${API}/users/${id}`, { method: 'DELETE' })
      if (res.ok) await loadSystemUsers()
      return res.ok
    } catch (err) { console.error('deleteUser error:', err); return false }
  }

  function updateProfile(data) {
    user.value = { ...user.value, ...data }
    localStorage.setItem('gym_user', JSON.stringify(user.value))
  }

  function saveGym(data) {
    gym.value = { ...gym.value, ...data }
    localStorage.setItem('gym_info', JSON.stringify(gym.value))
  }

  function hasRole(...roles) {
    return roles.includes(user.value?.role)
  }

  return {
    user, gym, isAuthenticated, userName, userRole, userRoleLabel, gymName,
    isAdmin, isEmpleado, isUsuario, canManageUsers, canManagePlans, canSell, canAccessControl,
    systemUsers, ROLE_LABELS,
    login, logout, loadSystemUsers, addUser, updateUser, deleteUser, updateProfile, saveGym, hasRole,
  }
})
