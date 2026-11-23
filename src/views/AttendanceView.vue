<template>
  <div>
    <div class="page-header">
      <div>
        <h1>📋 Control de Acceso y Asistencia</h1>
        <p class="page-subtitle">Registro de acceso y Asistencias</p>
        <div style="margin-top: 8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
          <button v-if="auth.isEmpleado || auth.isAdmin || auth.isUsuario" class="btn btn-primary btn-sm" @click="showCheckin = true">
            📱 Registrar Asistencia
          </button>
          <span class="badge" :class="gym.accessControlEnabled ? 'badge-success' : 'badge-danger'">
            Control: {{ gym.accessControlEnabled ? 'Activo' : 'Desactivado' }}
          </span>
          <button v-if="auth.isEmpleado || auth.isAdmin" class="btn btn-secondary btn-sm" @click="toggleAccess">
            {{ gym.accessControlEnabled ? 'Desactivar control' : 'Activar control' }}
          </button>
          <button v-if="auth.isAdmin" class="btn btn-danger btn-sm" @click="directOpen">
            🔑 Apertura Directa
          </button>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(59,130,246,0.15)">📊</div><div class="stat-value">{{ todayCount }}</div><div class="stat-label">Asistencias Hoy</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.15)">💳</div><div class="stat-value">{{ pospagoLeft }}</div><div class="stat-label">Asistencias pospago restantes</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.15)">✅</div><div class="stat-value">{{ verifiedCount }}</div><div class="stat-label">Verificadas</div></div>
    </div>

    <div class="table-container">
      <table>
        <thead><tr><th>Cliente</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Estado</th><th v-if="auth.canAccessControl">Acciones</th></tr></thead>
        <tbody>
          <tr v-for="r in gym.attendance" :key="r.id" :class="{ cancelled: r.status === 'cancelled' }">
            <td><strong>{{ r.client || r.client_name }}</strong></td>
            <td>{{ r.date ? r.date.split('T')[0] : '—' }}</td>
            <td>{{ r.checkin }}</td>
            <td>{{ r.checkout || '—' }}</td>
            <td>
              <span class="badge" :class="r.status === 'verified' ? 'badge-success' : r.status === 'cancelled' ? 'badge-danger' : 'badge-warning'">
                {{ r.status === 'verified' ? 'Verificada' : r.status === 'cancelled' ? 'Anulada' : 'Pendiente' }}
              </span>
            </td>
            <td v-if="auth.canAccessControl">
              <div style="display:flex;gap:6px" v-if="r.status !== 'cancelled'">
                <button v-if="r.status !== 'verified'" class="btn btn-success btn-sm" @click="verify(r)">✓ Verificar</button>
                <button class="btn btn-danger btn-sm" @click="cancel(r)">✕ Anular</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showCheckin" class="modal-overlay" @click.self="showCheckin = false">
      <div class="modal-content" style="text-align:center">
        <div class="modal-header"><h2>📱 Registrar Asistencia</h2><button class="modal-close-btn" @click="showCheckin = false">✕</button></div>
        <div style="font-size:5rem;margin:20px 0;animation:pulse 1.5s ease infinite">📷</div>
        <p style="color:var(--text-muted);margin-bottom:16px">Solo se abre la puerta con membresía activa y vigente</p>
        <select v-model="selectedClientId" style="margin-bottom:16px">
          <option value="">Seleccionar cliente...</option>
          <option v-for="c in selectableClients" :key="c.id" :value="String(c.id)">
            {{ c.name }} — {{ c.plan }} ({{ statusLabel(c.status) }}{{ c.visits_remaining != null ? ', ' + c.visits_remaining + ' rest.' : '' }})
          </option>
        </select>
        <button class="btn btn-primary btn-lg" style="width:100%" @click="registerAttendance" :disabled="!selectedClientId">✅ Validar y Abrir Puerta</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGymStore, isPospago, POSPAGO_VISITS } from '../stores/gym'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const gym = useGymStore()
const auth = useAuthStore()
const toast = useToastStore()

const showCheckin = ref(false)
const selectedClientId = ref('')
const doorStatus = ref('Cerrada')

const today = new Date().toISOString().split('T')[0]
const todayCount = computed(() => gym.attendance.filter(r => r.date === today && r.status !== 'cancelled').length)
const verifiedCount = computed(() => gym.attendance.filter(r => r.status === 'verified').length)
// Suma de asistencias pendientes de todos los clientes con plan pospago
const pospagoLeft = computed(() => {
  return gym.clients
    .filter(c => isPospago(c.plan) && c.status === 'active')
    .reduce((sum, c) => sum + Number(c.visits_remaining ?? POSPAGO_VISITS), 0)
})

const selectableClients = computed(() => {
  if (auth.isUsuario && auth.user?.clientId) {
    return gym.clients.filter(c => c.id === auth.user.clientId)
  }
  return gym.clients
})

function statusLabel(s) {
  return { active: 'Activa', expired: 'Vencida', frozen: 'Congelada', completed: 'Cumplida' }[s] || s
}

function toggleAccess() {
  gym.setAccessControl(!gym.accessControlEnabled)
  toast.info(gym.accessControlEnabled ? 'Control de acceso activado' : 'Control de acceso desactivado')
}

async function registerAttendance() {
  const result = await gym.registerCheckin(Number(selectedClientId.value))
  if (!result.success) {
    doorStatus.value = 'Cerrada'
    toast.error(result.message)
    return
  }
  doorStatus.value = 'Abierta'
  setTimeout(() => { doorStatus.value = 'Cerrada' }, 3000)
  toast.success(result.message)
  showCheckin.value = false
  selectedClientId.value = ''
}

function directOpen() {
  doorStatus.value = 'Abierta'
  setTimeout(() => { doorStatus.value = 'Cerrada' }, 3000)
  toast.success('Puerta abierta manualmente')
}

function verify(r) {
  gym.verifyAttendance(r.id)
  toast.success(`Asistencia verificada: ${r.client}`)
}

function cancel(r) {
  gym.cancelAttendance(r.id)
  toast.info(`Asistencia anulada: ${r.client}`)
}
</script>

<style scoped>
.cancelled { opacity: 0.55; text-decoration: line-through; }
</style>
