<template>
  <div class="dashboard">
    <div class="page-header">
      <div><h1>Dashboard</h1><p class="page-subtitle">Resumen general de tu gimnasio</p></div>
    </div>

    <div class="stats-grid">
      <div v-for="(s, i) in stats" :key="i" class="stat-card" :style="{ animationDelay: i * 0.1 + 's' }">
        <div class="stat-icon" :style="{ background: s.bg }">{{ s.icon }}</div>
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-change" :style="{ color: s.changeColor }">{{ s.change }}</div>
      </div>
    </div>

    <div v-if="auth.isAdmin" class="dashboard-grid">
      <div class="card chart-card">
        <h3>📈 Ingresos Mensuales</h3>
        <div class="chart-container"><canvas ref="revenueChart"></canvas></div>
      </div>
      <div class="card chart-card">
        <h3>📊 Asistencia Semanal</h3>
        <div class="chart-container"><canvas ref="attendanceChart"></canvas></div>
      </div>
    </div>

    <div class="dashboard-grid" style="margin-top:20px">
      <div class="card">
        <h3 style="margin-bottom:16px">🕐 Actividad Reciente</h3>
        <div v-for="a in recentActivity" :key="a.id" class="activity-item">
          <span class="activity-icon">{{ a.icon }}</span>
          <div class="activity-info">
            <span class="activity-text">{{ a.text }}</span>
            <span class="activity-time">{{ a.time }}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:16px">⚠️ Alertas</h3>
        <div v-for="a in alerts" :key="a.id" class="alert-item" :class="'alert-' + a.type">
          <span>{{ a.icon }}</span>
          <span>{{ a.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useGymStore, isPospago, POSPAGO_VISITS } from '../stores/gym'
import { useAuthStore } from '../stores/auth'
Chart.register(...registerables)

const monthlyRevenue   = [3200, 3800, 4100, 3900, 4500, 5200, 4800, 5500, 5100, 5800, 6200, 6800]
const weeklyAttendance = [45, 62, 58, 70, 55, 40, 20]

const gym = useGymStore()
const auth = useAuthStore()
const revenueChart = ref(null)
const attendanceChart = ref(null)

const activeClients = computed(() => gym.clients.filter(c => c.status === 'active').length)
const today = new Date().toISOString().split('T')[0]
const todayAttendance = computed(() => gym.attendance.filter(a => (a.date || '').startsWith(today) && a.status !== 'cancelled').length)
const todaySales = computed(() => gym.sales.filter(s => (s.sale_date || s.created_at || '').startsWith(today)).reduce((sum, s) => sum + Number(s.total || 0), 0))
const todayClasses = computed(() => (gym.classes || []).filter(c => (c.schedule || c.date || '').startsWith(today)).length)

const adminStats = computed(() => [
  { icon: '👥', label: 'Clientes Activos', value: activeClients.value, change: 'Membresías vigentes', changeColor: '#10b981', bg: 'rgba(59,130,246,0.15)' },
  { icon: '💰', label: 'Cobros Membresías', value: '$' + gym.payments.reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(0), change: 'Historial de cobros', changeColor: '#10b981', bg: 'rgba(6,182,212,0.15)' },
  { icon: '💳', label: 'Membresías Inactivas', value: String(gym.clients.filter(c => c.status !== 'active').length), change: 'Vencidas / congeladas', changeColor: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { icon: '🛍️', label: 'Ventas Tienda', value: '$' + gym.sales.reduce((s, p) => s + Number(p.total || 0), 0).toFixed(0), change: 'Total histórico', changeColor: '#10b981', bg: 'rgba(139,92,246,0.15)' },
])

const empleadoStats = computed(() => [
  { icon: '👥', label: 'Clientes presentes', value: todayAttendance.value, change: 'Asistencias de hoy', changeColor: '#10b981', bg: 'rgba(59,130,246,0.15)' },
  { icon: '🕐', label: 'Asistencias hoy', value: todayAttendance.value, change: 'Registradas hoy', changeColor: '#10b981', bg: 'rgba(6,182,212,0.15)' },
  { icon: '📅', label: 'Clases de hoy', value: todayClasses.value, change: 'Programadas', changeColor: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  { icon: '🛒', label: 'Ventas del día', value: '$' + todaySales.value.toFixed(2), change: 'Total del día', changeColor: '#10b981', bg: 'rgba(245,158,11,0.15)' },
])

const stats = computed(() => auth.isAdmin ? adminStats.value : empleadoStats.value)

const recentActivity = [
  { id: 1, icon: '✅', text: 'Carlos Mendoza registró asistencia', time: 'Hace 10 min' },
  { id: 2, icon: '🛒', text: 'María López compró Proteína Pura', time: 'Hace 25 min' },
  { id: 3, icon: '💳', text: 'Diego Herrera renovó Pospago por Tarjeta', time: 'Hace 1 hora' },
  { id: 4, icon: '👤', text: 'Nuevo cliente: Luciana Medina', time: 'Hace 2 horas' },
  { id: 5, icon: '📅', text: 'Clase CrossFit completada (12 asist.)', time: 'Hace 3 horas' },
]

const alerts = computed(() => {
  const low = gym.products.filter(p => p.stock < 20)
  return [
    { id: 1, type: 'warning', icon: '⚠️', text: `${gym.clients.filter(c => c.status === 'expired').length} membresías vencidas` },
    { id: 2, type: 'danger', icon: '📦', text: low.length ? `Stock bajo: ${low[0].name} (${low[0].stock} uds)` : 'Inventario de productos OK' },
    { id: 3, type: 'info', icon: '🚪', text: gym.accessControlEnabled ? 'Control de acceso activo' : 'Control de acceso desactivado' },
    { id: 4, type: 'warning', icon: '💳', text: (() => {
      const low = gym.clients.filter(c => isPospago(c.plan) && c.status === 'active' && Number(c.visits_remaining ?? POSPAGO_VISITS) <= 5)
      return low.length ? `Pospago: ${low.length} cliente(s) con 5 o menos asistencias` : 'Pospago: sin clientes por agotar asistencias'
    })() },
  ]
})

onMounted(() => {
  nextTick(() => {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(59,130,246,0.06)' }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(59,130,246,0.06)' }, ticks: { color: '#64748b' } } } }

    try {
      if (revenueChart.value) {
        new Chart(revenueChart.value, {
          type: 'line',
          data: {
            labels: months,
            datasets: [{ label: 'Ingresos', data: monthlyRevenue, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#3b82f6', borderWidth: 2 }]
          },
          options: chartOpts
        })
      }
      if (attendanceChart.value) {
        const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
        new Chart(attendanceChart.value, {
          type: 'bar',
          data: {
            labels: days,
            datasets: [{ label: 'Asistencias', data: weeklyAttendance, backgroundColor: ['#3b82f6','#06b6d4','#8b5cf6','#3b82f6','#06b6d4','#8b5cf6','#64748b'], borderRadius: 8 }]
          },
          options: chartOpts
        })
      }
    } catch (err) {
      console.error('Dashboard charts:', err)
    }
  })
})
</script>

<style scoped>
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.chart-card h3 { margin-bottom: 16px; font-size: 1rem; }
.activity-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-color); }
.activity-item:last-child { border: none; }
.activity-icon { font-size: 1.1rem; }
.activity-info { display: flex; flex-direction: column; }
.activity-text { font-size: 0.85rem; }
.activity-time { font-size: 0.75rem; color: var(--text-muted); }
.alert-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 8px; font-size: 0.85rem; }
.alert-warning { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); }
.alert-danger { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); }
.alert-info { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); }
.stat-card { animation: slideUp 0.4s ease both; }
@media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } }
</style>
