<template>
  <div class="client-dashboard">
    <div class="welcome-banner">
      <div>
        <h1>¡Hola, {{ auth.userName.split(` `)[0] }}! 👋</h1>
        <p class="page-subtitle">Bienvenido a Alto Rango — aquí está tu resumen de hoy</p>
      </div>
      <button class="btn btn-primary" @click="showCheckin = true">🕐 Registrar asistencia</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(59,130,246,0.15)">💳</div>
        <div class="stat-value" style="font-size:1.1rem">{{ myClient?.plan || `—` }}</div>
        <div class="stat-label">Mi membresía</div>
        <div class="stat-change"><span class="badge" :class="membershipStatusClass">{{ membershipStatusLabel }}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(16,185,129,0.15)">🕐</div>
        <div class="stat-value">{{ monthAttendances }}</div>
        <div class="stat-label">Asistencias este mes</div>
        <div class="stat-change" style="color:var(--accent)">Este mes</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(139,92,246,0.15)">📅</div>
        <div class="stat-value" style="font-size:1.1rem">{{ nextClass?.name || `Sin clases` }}</div>
        <div class="stat-label">Próxima clase</div>
        <div class="stat-change" style="color:var(--text-muted)">{{ nextClassTime }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(245,158,11,0.15)">🏋️</div>
        <div class="stat-value" style="font-size:1.1rem">{{ myRoutine?.name || `Sin asignar` }}</div>
        <div class="stat-label">Mi rutina</div>
        <div class="stat-change" style="color:var(--text-muted)">{{ myRoutine?.goal || `Consulta al entrenador` }}</div>
      </div>
    </div>

    <div class="dashboard-bottom">
      <div class="card">
        <h3 style="margin-bottom:16px">💳 Mi Membresía</h3>
        <div v-if="myClient">
          <div class="membership-header">
            <div>
              <div class="membership-name">{{ myClient.plan }}</div>
              <span class="badge" :class="membershipStatusClass">{{ membershipStatusLabel }}</span>
            </div>
            <div class="days-remaining" :class="daysRemainingClass">
              <span class="days-number">{{ daysRemaining }}</span>
              <span class="days-label">días restantes</span>
            </div>
          </div>
          <div class="progress-bar" style="margin:16px 0 4px">
            <div class="progress-fill" :class="progressClass" :style="{ width: progressPercent + `%` }"></div>
          </div>
          <div class="progress-labels">
            <span>{{ myClient.join_date?.split(`T`)[0] || `—` }}</span>
            <span>{{ myClient.plan_end?.split(`T`)[0] || `—` }}</span>
          </div>
          <div class="membership-info-grid" style="margin-top:16px">
            <div class="info-item"><span class="info-label">Total asistencias</span><span>{{ myClient.visits || 0 }}</span></div>
            <div class="info-item" v-if="myClient.plan?.includes(`Pospago`)"><span class="info-label">Restantes</span><span>{{ myClient.visits_remaining ?? 30 }}</span></div>
          </div>
          <div v-if="daysRemaining <= 5 && daysRemaining > 0" class="membership-alert alert-warning" style="margin-top:12px">🟡 Tu membresía vence pronto.</div>
          <div v-if="daysRemaining <= 0 || myClient.status === `expired`" class="membership-alert alert-danger" style="margin-top:12px">🔴 Tu membresía ha vencido.</div>
        </div>
        <div v-else class="empty-state" style="padding:20px"><p>No se encontró membresía asociada.</p></div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3>🕐 Asistencias Recientes</h3>
          <router-link to="/mis-asistencias" class="btn btn-secondary btn-sm">Ver todo</router-link>
        </div>
        <div v-if="recentAttendances.length">
          <div v-for="a in recentAttendances" :key="a.id" class="attendance-item">
            <div class="attendance-date">{{ (a.date || ``).split(`T`)[0] }}</div>
            <div class="attendance-time">{{ a.checkin || `—` }}</div>
            <span class="badge" :class="a.status === `verified` ? `badge-success` : a.status === `cancelled` ? `badge-danger` : `badge-warning`">
              {{ a.status === `verified` ? `Completa` : a.status === `cancelled` ? `Anulada` : `Registrada` }}
            </span>
          </div>
        </div>
        <div v-else class="empty-state" style="padding:20px"><p>Sin asistencias recientes</p></div>
      </div>
    </div>

    <div v-if="showCheckin" class="modal-overlay" @click.self="showCheckin = false">
      <div class="modal-content" style="text-align:center">
        <div class="modal-header">
          <h2>🕐 Registrar Asistencia</h2>
          <button class="modal-close-btn" @click="showCheckin = false">✕</button>
        </div>
        <div v-if="myClient" style="padding:16px 0">
          <div style="font-size:4rem;margin-bottom:12px">{{ myClient.photo || `👤` }}</div>
          <h3>{{ myClient.name }}</h3>
          <p style="color:var(--text-muted);margin:8px 0">{{ myClient.plan }}</p>
          <span class="badge" :class="membershipStatusClass" style="margin-bottom:16px;display:inline-block">{{ membershipStatusLabel }}</span>
          <div v-if="myClient.status === `active`" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:12px;margin-bottom:16px;color:#10b981">🟢 Acceso habilitado</div>
          <div v-else style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;margin-bottom:16px;color:#ef4444">🔴 Membresía inactiva</div>
          <button class="btn btn-primary" style="width:100%" @click="doCheckin" :disabled="myClient.status !== `active`">✅ Registrar mi entrada</button>
        </div>
        <div v-else style="padding:24px;color:var(--text-muted)">No se encontró tu perfil. Contacta al administrador.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import { useGymStore } from "../stores/gym"
import { useAuthStore } from "../stores/auth"
import { useToastStore } from "../stores/toast"

const gym = useGymStore()
const auth = useAuthStore()
const toast = useToastStore()
const showCheckin = ref(false)

const myClient = computed(() => gym.clients.find(c => c.email === auth.user?.email) || null)
const myRoutine = computed(() => gym.routines.find(r => r.client === myClient.value?.name) || null)
const today = new Date().toISOString().split("T")[0]

const monthAttendances = computed(() => {
  if (!myClient.value) return 0
  const month = today.slice(0, 7)
  return gym.attendance.filter(a => a.client_id === myClient.value.id && (a.date || "").startsWith(month) && a.status !== "cancelled").length
})

const recentAttendances = computed(() => {
  if (!myClient.value) return []
  return gym.attendance.filter(a => a.client_id === myClient.value.id).slice(0, 5)
})

const nextClass = computed(() => {
  const now = new Date()
  return (gym.classes || []).find(c => new Date(c.schedule || c.date) >= now) || null
})

const nextClassTime = computed(() => {
  if (!nextClass.value) return "No hay clases programadas"
  const d = new Date(nextClass.value.schedule || nextClass.value.date)
  return `${d.toLocaleDateString("es-EC", { weekday: "short", day: "numeric" })} · ${d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}`
})

const membershipStatusClass = computed(() => {
  const s = myClient.value?.status
  return s === "active" ? "badge-success" : s === "frozen" ? "badge-warning" : "badge-danger"
})

const membershipStatusLabel = computed(() => {
  const s = myClient.value?.status
  return { active: "Activa", expired: "Vencida", frozen: "Congelada", completed: "Cumplida" }[s] || "—"
})

const daysRemaining = computed(() => {
  if (!myClient.value?.plan_end) return 0
  const end = new Date(myClient.value.plan_end.split("T")[0])
  return Math.max(0, Math.ceil((end - new Date(today)) / 86400000))
})

const daysRemainingClass = computed(() => daysRemaining.value <= 0 ? "days-expired" : daysRemaining.value <= 5 ? "days-warning" : "days-ok")

const progressPercent = computed(() => {
  if (!myClient.value?.plan_end || !myClient.value?.join_date) return 0
  const start = new Date(myClient.value.join_date.split("T")[0])
  const end = new Date(myClient.value.plan_end.split("T")[0])
  const now = new Date(today)
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
})

const progressClass = computed(() => progressPercent.value >= 90 ? "progress-danger" : progressPercent.value >= 70 ? "progress-warning" : "progress-ok")

async function doCheckin() {
  if (!myClient.value) return
  const res = await gym.registerCheckin(myClient.value.id)
  if (res.success) { toast.success(res.message); showCheckin.value = false }
  else toast.error(res.message)
}
</script>

<style scoped>
.welcome-banner { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
.welcome-banner h1 { font-size:1.6rem; margin-bottom:4px; }
.dashboard-bottom { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px; }
.membership-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
.membership-name { font-size:1.2rem; font-weight:700; margin-bottom:6px; }
.days-remaining { text-align:center; padding:8px 16px; }
.days-number { display:block; font-size:2rem; font-weight:800; line-height:1; }
.days-label { font-size:0.72rem; color:var(--text-muted); }
.days-ok .days-number { color:#10b981; }
.days-warning .days-number { color:#f59e0b; }
.days-expired .days-number { color:#ef4444; }
.progress-bar { background:var(--bg-hover); border-radius:50px; height:8px; overflow:hidden; }
.progress-fill { height:100%; border-radius:50px; transition:width 0.5s; }
.progress-ok { background:linear-gradient(90deg,#3b82f6,#06b6d4); }
.progress-warning { background:linear-gradient(90deg,#f59e0b,#ef4444); }
.progress-danger { background:#ef4444; }
.progress-labels { display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); margin-top:4px; }
.membership-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.info-item { display:flex; flex-direction:column; padding:8px 12px; background:var(--bg-hover); border-radius:var(--radius-sm); }
.info-label { font-size:0.72rem; color:var(--text-muted); margin-bottom:2px; }
.membership-alert { padding:10px 14px; border-radius:var(--radius-sm); font-size:0.85rem; }
.alert-warning { background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); color:#f59e0b; }
.alert-danger { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#ef4444; }
.attendance-item { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-color); }
.attendance-item:last-child { border:none; }
.attendance-date { font-weight:600; font-size:0.85rem; min-width:90px; }
.attendance-time { flex:1; font-size:0.82rem; color:var(--text-muted); }
@media (max-width:768px) { 
  .dashboard-bottom { grid-template-columns:1fr; } 
  .membership-info-grid { grid-template-columns:1fr; } 
}
@media (max-width:480px) {
  .welcome-banner { flex-direction:column; align-items:flex-start; }
  .welcome-banner .btn { width:100%; justify-content:center; }
}
</style>
