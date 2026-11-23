<template>
  <div>
    <div class="page-header"><div><h1>⚙️ Configuración</h1><p class="page-subtitle">Gimnasio, usuarios, roles y control de acceso</p></div></div>
    <div class="settings-grid">
      <div class="card" v-if="auth.isAdmin">
        <h3 style="margin-bottom:20px">🏢 Datos del Gimnasio</h3>
        <div class="form-group"><label>Nombre del Gimnasio</label><input v-model="gymForm.name" /></div>
        <div class="form-row">
          <div class="form-group"><label>Teléfono</label><input v-model="gymForm.phone" /></div>
          <div class="form-group"><label>Ciudad</label><input v-model="gymForm.city" /></div>
        </div>
        <div class="form-group"><label>Dirección</label><input v-model="gymForm.address" /></div>
        <div class="form-group"><label>Sitio web</label><input v-model="gymForm.website" /></div>
        <button class="btn btn-primary" @click="saveGym">💾 Guardar Cambios</button>
      </div>

      <div class="card" v-if="auth.isAdmin">
        <h3 style="margin-bottom:20px">🏦 Datos Bancarios</h3>
        <div class="form-group"><label>Banco</label><input v-model="bank.name" /></div>
        <div class="form-row">
          <div class="form-group"><label>Tipo de Cuenta</label><select v-model="bank.type"><option>Corriente</option><option>Ahorros</option></select></div>
          <div class="form-group"><label>Número de Cuenta</label><input v-model="bank.number" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Titular</label><input v-model="bank.holder" /></div>
          <div class="form-group"><label>RUC / Cédula</label><input v-model="bank.ruc" /></div>
        </div>
        <button class="btn btn-primary" @click="toast.success('Datos bancarios guardados')">💾 Guardar</button>
      </div>

      <div class="card">
        <h3 style="margin-bottom:20px">👤 Mi Perfil</h3>
        <div class="form-group"><label>Nombre</label><input :value="auth.userName" readonly /></div>
        <div class="form-group"><label>Email</label><input :value="auth.user?.email" readonly /></div>
        <div class="form-group"><label>Rol</label><input :value="auth.userRoleLabel" readonly /></div>
      </div>

      <div class="card" v-if="auth.canAccessControl">
        <h3 style="margin-bottom:20px">🚪 Control de Acceso</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px">
          Cuando está activo, la puerta solo se abre si la membresía está vigente (RF-007 / RF-009).
        </p>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="badge" :class="gym.accessControlEnabled ? 'badge-success' : 'badge-danger'">
            {{ gym.accessControlEnabled ? 'Activo' : 'Desactivado' }}
          </span>
          <button class="btn btn-secondary" @click="toggleAccess">
            {{ gym.accessControlEnabled ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Users management RF-001 RF-002 -->
    <div v-if="auth.canManageUsers" style="margin-top:28px">
      <div class="page-header" style="margin-bottom:12px">
        <div><h2>👥 Usuarios del Sistema</h2><p class="page-subtitle">Crear y eliminar cuentas · roles Admin / Empleado / Usuario</p></div>
        <button class="btn btn-primary" @click="openUserModal()">➕ Nuevo Usuario</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="u in auth.systemUsers" :key="u.id">
              <td><strong>{{ u.name }}</strong></td>
              <td>{{ u.email }}</td>
              <td><span class="badge badge-info">{{ auth.ROLE_LABELS[u.role] || u.role }}</span></td>
              <td><span class="badge" :class="u.status === 'active' ? 'badge-success' : 'badge-warning'">{{ u.status }}</span></td>
              <td>{{ u.createdAt }}</td>
              <td style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" @click="openUserModal(u)">✏️</button>
                <button class="btn btn-danger btn-sm" @click="removeUser(u)" :disabled="u.id === auth.user?.id">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>{{ editingUser ? 'Editar' : 'Nuevo' }} Usuario</h2><button class="modal-close-btn" @click="showUserModal = false">✕</button></div>
        <form @submit.prevent="saveUser">
          <div class="form-group"><label>Nombre</label><input v-model="userForm.name" required /></div>
          <div class="form-group"><label>Email</label><input v-model="userForm.email" type="email" required /></div>
          <div class="form-row">
            <div class="form-group">
              <label>Rol</label>
              <select v-model="userForm.role">
                <option value="admin">Administrador</option>
                <option value="empleado">Empleado/Encargado</option>
                <option value="usuario">Usuario</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estado</label>
              <select v-model="userForm.status"><option value="active">active</option><option value="inactive">inactive</option></select>
            </div>
          </div>
          <div class="form-group"><label>Contraseña {{ editingUser ? '(dejar vacío para no cambiar)' : '' }}</label><input v-model="userForm.password" type="password" :required="!editingUser" /></div>
          <button type="submit" class="btn btn-primary" style="width:100%">Guardar</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useGymStore } from '../stores/gym'
import { useToastStore } from '../stores/toast'

const auth = useAuthStore()
const gym = useGymStore()
const toast = useToastStore()

// La tabla "Usuarios del Sistema" estaba vacía porque nunca se cargaban
onMounted(() => auth.loadSystemUsers())

const gymForm = ref({
  name: auth.gym?.name || 'Alto Rango Gym',
  phone: auth.gym?.phone || '+593 999 000 111',
  city: auth.gym?.city || 'Quito',
  address: auth.gym?.address || 'Av. Principal 123',
  website: auth.gym?.website || 'www.altorango.com',
})
const bank = ref({ name: 'Banco Pichincha', type: 'Corriente', number: '2200123456', holder: 'Alto Rango Gym S.A.', ruc: '1791234567001' })

const showUserModal = ref(false)
const editingUser = ref(null)
const userForm = ref({ name: '', email: '', role: 'empleado', status: 'active', password: '' })

function saveGym() {
  auth.saveGym(gymForm.value)
  toast.success('Configuración de Alto Rango guardada')
}

function toggleAccess() {
  gym.setAccessControl(!gym.accessControlEnabled)
  toast.info(gym.accessControlEnabled ? 'Control de acceso activado' : 'Control de acceso desactivado')
}

function openUserModal(u = null) {
  editingUser.value = u?.id || null
  userForm.value = u
    ? { name: u.name, email: u.email, role: u.role, status: u.status, password: '' }
    : { name: '', email: '', role: 'empleado', status: 'active', password: '' }
  showUserModal.value = true
}

function saveUser() {
  if (editingUser.value) {
    const data = { name: userForm.value.name, email: userForm.value.email, role: userForm.value.role, status: userForm.value.status }
    if (userForm.value.password) data.password = userForm.value.password
    auth.updateUser(editingUser.value, data)
    toast.success('Usuario actualizado')
  } else {
    auth.addUser({ ...userForm.value })
    toast.success('Usuario creado')
  }
  showUserModal.value = false
}

function removeUser(u) {
  if (!confirm(`¿Eliminar a ${u.name}?`)) return
  if (auth.deleteUser(u.id)) toast.success('Usuario eliminado')
  else toast.error('No puedes eliminar tu propia sesión')
}
</script>

<style scoped>
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr; } }
</style>
