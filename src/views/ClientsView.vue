<template>
  <div>
    <div class="page-header">
      <div><h1>Clientes</h1><p class="page-subtitle">Gestiona los clientes del gimnasio</p></div>
      <div class="header-actions">
        <button v-if="auth.isAdmin" class="btn btn-secondary" @click="$router.push('/kiosk')">👁️ Modo Kiosco</button>
        <button v-if="auth.isAdmin" class="btn btn-warning" @click="openDoorManual">🚪 Abrir Puerta Manual</button>
        <button v-if="auth.isAdmin" class="btn btn-primary" @click="showModal = true">➕ Nuevo Cliente</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-bar" style="flex:1;max-width:360px">
        <span>🔍</span>
        <input v-model="search" placeholder="Buscar cliente..." />
      </div>
      <button v-for="f in ['Todos','Activos','Vencidos','Congelados']" :key="f" class="filter-chip" :class="{ active: filter === f }" @click="filter = f">{{ f }}</button>
    </div>

    <div class="table-container">
      <table>
        <thead><tr><th>Cliente</th><th class="hide-mobile">Email</th><th>Plan</th><th class="hide-mobile">Vence</th><th>Estado</th><th class="hide-mobile">Visitas</th><th v-if="auth.isAdmin" class="hide-mobile">Acceso Facial</th><th v-if="auth.isAdmin" class="hide-mobile">Verificación</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.id">
            <td><div style="display:flex;align-items:center;gap:10px"><span style="font-size:1.5rem">{{ c.photo }}</span><strong>{{ c.name }}</strong></div></td>
            <td class="hide-mobile">{{ c.email }}</td>
            <td>{{ c.plan }}</td>
            <td class="hide-mobile">{{ formatDate(c.plan_end) }}</td>
            <td><span class="badge" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</span></td>
            <td class="hide-mobile">{{ c.visits }}</td>
            <td v-if="auth.isAdmin" class="hide-mobile">
              <label class="toggle-switch" title="Permiso de Acceso Facial">
                <input type="checkbox" :checked="!!c.facial_access" @change="toggleFacialAccess(c, $event)">
                <span class="slider round"></span>
              </label>
            </td>
            <td v-if="auth.isAdmin" class="hide-mobile">
              <label class="toggle-switch toggle-success" title="Abrir puerta remotamente">
                <input type="checkbox" @change="remoteCheckin(c, $event)">
                <span class="slider round"></span>
              </label>
            </td>
            <td>
              <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: max-content;">
                <button class="btn btn-secondary btn-sm" @click="viewClient(c)">👁️</button>
                <button v-if="auth.isAdmin" class="btn btn-secondary btn-sm" @click="editClient(c)">✏️</button>
                <button v-if="auth.isAdmin" class="btn btn-secondary btn-sm" @click="openFaceScan(c)" title="Escanear Rostro">📸</button>
                <button v-if="auth.isAdmin && !c.password" class="btn btn-warning btn-sm" @click="openSetPassword(c)" title="Asignar contraseña">🔑</button>
                <button v-if="auth.isAdmin" class="btn btn-danger btn-sm" @click="deleteClient(c.id)">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!filtered.length" class="empty-state"><div class="empty-icon">👥</div><p>No se encontraron clientes</p></div>

    <!-- Modal Crear/Editar -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editing ? 'Editar' : 'Nuevo' }} Cliente</h2>
          <button class="modal-close-btn" @click="showModal = false">✕</button>
        </div>
        <form @submit.prevent="saveClient">
          <div class="form-row">
            <div class="form-group"><label>Nombre</label><input v-model="form.name" required /></div>
            <div class="form-group"><label>Email</label><input v-model="form.email" type="email" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Teléfono</label><input v-model="form.phone" /></div>
            <div class="form-group"><label>Plan</label>
              <select v-model="form.plan"><option v-for="p in plans" :key="p">{{ p }}</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Peso (kg)</label><input v-model.number="form.weight" type="number" /></div>
            <div class="form-group"><label>Altura (cm)</label><input v-model.number="form.height" type="number" /></div>
          </div>
          <div class="form-group">
            <label>Contraseña (Para que el cliente acceda a la App)</label>
            <input v-model="form.password" type="text" :required="!editing" :placeholder="editing ? 'Dejar en blanco para no cambiarla' : 'Ej: 123456'" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">{{ editing ? 'Guardar Cambios' : 'Registrar Cliente' }}</button>
        </form>
      </div>
    </div>

    <!-- Modal Asignar contraseña rápida -->
    <div v-if="showPassModal" class="modal-overlay" @click.self="showPassModal = false">
      <div class="modal-content" style="max-width:420px">
        <div class="modal-header">
          <h2>🔑 Asignar Contraseña</h2>
          <button class="modal-close-btn" @click="showPassModal = false">✕</button>
        </div>
        <div style="padding:8px 0 16px">
          <p style="color:var(--text-muted);margin-bottom:16px">Cliente: <strong>{{ passClient?.name }}</strong> · {{ passClient?.email }}</p>
          <div class="form-group">
            <label>Nueva contraseña</label>
            <input v-model="newPassword" type="text" placeholder="Ej: 123456" required />
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:12px" @click="savePassword" :disabled="!newPassword">✅ Guardar contraseña</button>
        </div>
      </div>
    </div>
    <!-- Modal Escanear Rostro -->
    <div v-if="showFaceModal" class="modal-overlay" @click.self="closeFaceScan">
      <div class="modal-content" style="max-width:500px">
        <div class="modal-header">
          <h2>📸 Escanear Rostro: {{ scanClient?.name }}</h2>
          <button class="modal-close-btn" @click="closeFaceScan">✕</button>
        </div>
        <div style="padding:16px 0; text-align:center">
          <p v-if="scanStatus">{{ scanStatus }}</p>
          <div style="position:relative; width:100%; max-width:400px; margin:0 auto; background:#000; border-radius:8px; overflow:hidden;">
            <video ref="scanVideoEl" autoplay muted playsinline style="width:100%; display:block; filter: brightness(150%) contrast(120%);"></video>
          </div>
          <button class="btn btn-primary" style="margin-top:16px; width:100%" @click="captureFace" :disabled="!modelsLoaded">
            Capturar y Guardar Rostro
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Detalle del Cliente</h2>
          <button class="modal-close-btn" @click="showDetail = false">✕</button>
        </div>
        <div style="text-align:center;margin-bottom:12px">
          <div style="font-size:3rem;line-height:1">{{ detailClient.photo }}</div>
          <h3 style="margin:4px 0">{{ detailClient.name }}</h3>
          <span class="badge" :class="statusClass(detailClient.status)">{{ statusLabel(detailClient.status) }}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">Email</span><span>{{ detailClient.email }}</span></div>
          <div class="detail-item"><span class="detail-label">Teléfono</span><span>{{ detailClient.phone }}</span></div>
          <div class="detail-item"><span class="detail-label">Plan</span><span>{{ detailClient.plan }}</span></div>
          <div class="detail-item"><span class="detail-label">Vence</span><span>{{ formatDate(detailClient.plan_end) }}</span></div>
          <div class="detail-item"><span class="detail-label">Peso</span><span>{{ detailClient.weight }} kg</span></div>
          <div class="detail-item"><span class="detail-label">Altura</span><span>{{ detailClient.height }} cm</span></div>
          <div class="detail-item"><span class="detail-label">IMC</span><span>{{ detailClient.bmi }}</span></div>
          <div class="detail-item"><span class="detail-label">Visitas</span><span>{{ detailClient.visits }}</span></div>
          <div class="detail-item"><span class="detail-label">Miembro desde</span><span>{{ formatDate(detailClient.join_date) }}</span></div>
        </div>
        <div style="text-align:center;margin-top:12px;padding:12px;background:var(--bg-card);border-radius:var(--radius-sm);font-family:monospace;font-size:1.1rem;letter-spacing:2px">
          QR: {{ detailClient.name.replace(/\s/g,'').toUpperCase().slice(0,6) }}-{{ detailClient.id }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGymStore } from '../stores/gym'
import { useToastStore } from '../stores/toast'
import { useAuthStore } from '../stores/auth'
import * as faceapi from '@vladmandic/face-api'

const router = useRouter()
const gym = useGymStore()
const toast = useToastStore()
const auth = useAuthStore()

const search = ref('')
const filter = ref('Todos')
const showModal = ref(false)
const showDetail = ref(false)
const editing = ref(null)
const detailClient = ref({})
const plans = computed(() => gym.plans.map(p => p.name))

const emptyForm = { name: '', email: '', phone: '', plan: 'Mensual', weight: 70, height: 170, password: '' }
const form = ref({ ...emptyForm })

const filtered = computed(() => {
  let list = gym.clients
  if (filter.value === 'Activos') list = list.filter(c => c.status === 'active')
  else if (filter.value === 'Vencidos') list = list.filter(c => c.status === 'expired' || c.status === 'completed')
  else if (filter.value === 'Congelados') list = list.filter(c => c.status === 'frozen')
  if (search.value) { const s = search.value.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s)) }
  return list
})

function statusClass(s) { return s === 'active' ? 'badge-success' : (s === 'expired' || s === 'completed') ? 'badge-danger' : 'badge-warning' }
function statusLabel(s) { return { active: 'Activo', expired: 'Vencido', frozen: 'Congelado', completed: 'Cumplido' }[s] || s }

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

async function checkinClient(c) {
  const res = await gym.registerCheckin(c.id)
  if (res.success) toast.success(res.message)
  else toast.error(res.message)
}

const showPassModal = ref(false)
const passClient = ref(null)
const newPassword = ref('')

function openSetPassword(c) { passClient.value = c; newPassword.value = ''; showPassModal.value = true }

async function savePassword() {
  if (!passClient.value || !newPassword.value) return
  await gym.updateClient(passClient.value.id, { password: newPassword.value, email: passClient.value.email, name: passClient.value.name })
  passClient.value.password = newPassword.value
  toast.success('Contraseña asignada a ' + passClient.value.name + '. Ya puede iniciar sesión.')
  showPassModal.value = false
}

async function openDoorManual() {
  const res = await gym.openDoorDirectly(auth.user?.id || 1);
  if (res.success) toast.success(res.message);
  else toast.error(res.message);
}

async function toggleFacialAccess(c, event) {
  const newVal = event.target.checked;
  await gym.updateClient(c.id, { facial_access: newVal ? 1 : 0 });
  toast.success(`Acceso facial ${newVal ? 'activado' : 'desactivado'} para ${c.name}`);
}

async function remoteCheckin(c, event) {
  const isChecked = event.target.checked;
  if (!isChecked) return; // Si lo apagan manualmente antes, no hacer nada

  const res = await gym.registerCheckin(c.id);
  if (res.success) {
    toast.success('Puerta abierta para ' + c.name);
    // Devolver el interruptor a su posición original después de 2 segundos
    setTimeout(() => {
      if (event.target) event.target.checked = false;
    }, 2000);
  } else {
    toast.error(res.message);
    event.target.checked = false; // Revertir si hay error (ej. plan vencido)
  }
}

// Lógica Escaneo Facial
const showFaceModal = ref(false)
const scanClient = ref(null)
const scanVideoEl = ref(null)
const scanStatus = ref('')
const modelsLoaded = ref(false)
let scanStream = null

async function openFaceScan(c) {
  scanClient.value = c
  showFaceModal.value = true
  scanStatus.value = 'Cargando cámara y modelos...'
  modelsLoaded.value = false
  
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    modelsLoaded.value = true
    scanStatus.value = 'Modelos cargados. Asegúrate de tener buena iluminación.'
    
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    if (scanVideoEl.value) scanVideoEl.value.srcObject = scanStream
  } catch (err) {
    scanStatus.value = 'Error al iniciar: ' + err.message
  }
}

function closeFaceScan() {
  if (scanStream) scanStream.getTracks().forEach(t => t.stop())
  showFaceModal.value = false
  scanClient.value = null
}

async function captureFace() {
  if (!scanVideoEl.value) return
  scanStatus.value = 'Analizando rostro...'
  
  const detection = await faceapi.detectSingleFace(scanVideoEl.value).withFaceLandmarks().withFaceDescriptor()
  
  if (detection) {
    const descriptor = Array.from(detection.descriptor)
    await gym.updateClient(scanClient.value.id, { face_descriptor: JSON.stringify(descriptor) })
    toast.success('Rostro guardado correctamente para ' + scanClient.value.name)
    closeFaceScan()
  } else {
    scanStatus.value = 'No se detectó un rostro claro. Intenta acercarte o mejorar la luz.'
    toast.error('No se pudo detectar el rostro')
  }
}

function viewClient(c) { detailClient.value = c; showDetail.value = true }
function editClient(c) { editing.value = c.id; form.value = { ...c }; showModal.value = true }
function deleteClient(id) {
  gym.deleteClient(id)
  toast.success('Cliente eliminado')
}

async function saveClient() {
  if (editing.value) {
    const idx = gym.clients.findIndex(c => c.id === editing.value)
    if (idx >= 0) {
      const planChanged = gym.clients[idx].plan !== form.value.plan
      await gym.updateClient(editing.value, form.value)
      if (planChanged) gym.changeClientPlan(editing.value, form.value.plan, { registerPayment: false })
    }
    toast.success('Cliente actualizado')
  } else {
    const plan = gym.getPlanByName(form.value.plan)
    const end = new Date()
    end.setDate(end.getDate() + (plan?.duration === 999 ? 365 : (plan?.duration || 30)))
    const newC = {
      ...form.value,
      status: 'active',
      photo: '👤',
      plan_end: end.toISOString().split('T')[0],
      bmi: +(form.value.weight / ((form.value.height / 100) ** 2)).toFixed(1),
      join_date: new Date().toISOString().split('T')[0],
      visits: 0,
      visits_remaining: form.value.plan.includes('Pospago') ? 30 : null,
    }
    await gym.addClient(newC)
    toast.success('Cliente registrado en base de datos')
  }
  showModal.value = false; editing.value = null; form.value = { ...emptyForm }
}
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.detail-item { 
  display: flex; flex-direction: column; 
  padding: 6px 10px; background: var(--bg-card); border-radius: var(--radius-sm);
  min-width: 0;
}
.detail-item span:not(.detail-label) {
  word-break: break-word;
  font-size: 0.9rem;
}
.detail-label { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px; }

</style>
