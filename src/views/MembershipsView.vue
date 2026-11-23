<template>
  <div>
    <div class="page-header">
      <div><h1>Membresías y Planes</h1><p class="page-subtitle">Planes, cobros, promociones y cambios de plan</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" @click="showPayModal = true">💵 Registrar Cobro</button>
        <button class="btn btn-primary" @click="openPlanModal()">➕ Nuevo Plan</button>
      </div>
    </div>

    <h3 style="margin-bottom:16px">📋 Planes Disponibles</h3>
    <div class="plans-grid">
      <div v-for="p in gym.plans" :key="p.id" class="plan-card" :style="{ borderColor: p.color + '40' }">
        <div class="plan-badge" :style="{ background: p.color }">{{ p.name }}</div>
        <div class="plan-price">
          <span class="plan-amount">${{ p.price }}</span>
          <span class="plan-period">/ {{ p.limit ? p.limit + ' asist.' : p.duration + ' días' }}</span>
        </div>
        <ul class="plan-features"><li v-for="f in p.features" :key="f">✓ {{ f }}</li></ul>
        <div style="display:flex;gap:8px;margin-top:auto">
          <button class="btn btn-secondary btn-sm" style="flex:1" @click="openPlanModal(p)">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" @click="deletePlan(p.id)">🗑️</button>
        </div>
      </div>
    </div>

    <h3 style="margin:32px 0 16px">🏷️ Promociones</h3>
    <div class="promo-bar">
      <button class="btn btn-secondary btn-sm" @click="showPromoModal = true">➕ Nueva promoción</button>
      <span v-if="gym.activePromo" class="badge badge-success">Activa: {{ gym.activePromo.name }}</span>
    </div>
    <div class="table-container" style="margin-top:12px">
      <table>
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Aplica a</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr v-for="pr in gym.promotions" :key="pr.id">
            <td><strong>{{ pr.name }}</strong><br><small style="color:var(--text-muted)">{{ pr.description }}</small></td>
            <td>{{ pr.type === 'percent' ? 'Porcentaje' : 'Monto fijo' }}</td>
            <td>{{ pr.type === 'percent' ? pr.value + '%' : '$' + pr.value }}</td>
            <td>{{ formatAppliesTo(pr) }}</td>
            <td style="font-size: 0.85rem;">{{ formatVigencia(pr) }}</td>
            <td><span class="badge" :class="pr.active ? 'badge-success' : 'badge-warning'">{{ pr.active ? 'Activa' : 'Inactiva' }}</span></td>
            <td style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm" @click="gym.togglePromotion(pr.id)">{{ pr.active ? 'Desactivar' : 'Activar' }}</button>
              <button class="btn btn-danger btn-sm" @click="gym.deletePromotion(pr.id); toast.success('Promoción eliminada')">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 style="margin:32px 0 16px">👥 Membresías</h3>
    <div class="table-container">
      <table>
        <thead><tr><th>Cliente</th><th>Plan</th><th>Vence</th><th>Asist.</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr v-for="c in gym.clients" :key="c.id">
            <td><strong>{{ c.name }}</strong></td>
            <td>{{ c.plan }}</td>
            <td>{{ c.plan_end || '—' }}</td>
            <td>{{ c.visits_remaining != null ? c.visits_remaining + ' rest.' : '—' }}</td>
            <td><span class="badge" :class="statusBadge(c.status)">{{ statusLabel(c.status) }}</span></td>
            <td>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm" @click="openChangePlan(c)">🔄 Cambiar plan</button>
                <button v-if="c.status !== 'active'" class="btn btn-success btn-sm" @click="renew(c)">Renovar</button>
                <button v-if="c.status === 'active'" class="btn btn-secondary btn-sm" @click="freeze(c)">❄️ Congelar</button>
                <button v-if="c.status === 'frozen'" class="btn btn-success btn-sm" @click="unfreeze(c)">Descongelar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 style="margin:32px 0 16px">💵 Historial de Cobros</h3>
    <div class="table-container">
      <table>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Concepto</th><th>Monto</th><th>Descuento</th><th>Método</th></tr></thead>
        <tbody>
          <tr v-for="p in gym.payments" :key="p.id">
            <td>{{ p.date }}</td>
            <td>{{ p.client }}</td>
            <td>{{ p.concept }}</td>
            <td class="price">${{ Number(p.amount || 0).toFixed(2) }}</td>
            <td>{{ p.discount ? `$${Number(p.discount).toFixed(2)} (${p.promo})` : '—' }}</td>
            <td>{{ p.method }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Plan modal -->
    <div v-if="showPlanModal" class="modal-overlay" @click.self="showPlanModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>{{ editingPlan ? 'Editar' : 'Nuevo' }} Plan</h2><button class="modal-close-btn" @click="showPlanModal = false">✕</button></div>
        <form @submit.prevent="savePlan">
          <div class="form-group"><label>Nombre</label><input v-model="planForm.name" required /></div>
          <div class="form-group">
            <label>Tipo</label>
            <select v-model="planForm.type">
              <option value="diario">Diario</option>
              <option value="normal">Normal</option>
              <option value="mensual">Mensual</option>
              <option value="personalizado">Personalizado</option>
              <option value="nutricional">Nutricional</option>
              <option value="pospago">Pospago por tarjeta</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Precio ($)</label><input v-model.number="planForm.price" type="number" required /></div>
            <div class="form-group"><label>Duración (días)</label><input v-model.number="planForm.duration" type="number" required /></div>
            <div class="form-group"><label>Límite asistencias</label><input v-model.number="planForm.limit" type="number" placeholder="Ilimitado" /></div>
          </div>
          <div class="form-group"><label>Color</label><input v-model="planForm.color" type="color" style="height:40px;padding:4px" /></div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">Guardar</button>
        </form>
      </div>
    </div>

    <!-- Change plan modal -->
    <div v-if="showChangeModal" class="modal-overlay" @click.self="showChangeModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>Cambiar plan — {{ changeClient?.name }}</h2><button class="modal-close-btn" @click="showChangeModal = false">✕</button></div>
        <form @submit.prevent="saveChangePlan">
          <div class="form-group">
            <label>Nuevo plan</label>
            <select v-model="changePlanName" required>
              <option v-for="p in gym.plans" :key="p.id" :value="p.name">{{ p.name }} — ${{ p.price }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Método de cobro</label>
            <select v-model="changeMethod"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select>
          </div>
          <p v-if="previewPrice" style="font-size:0.9rem;color:var(--text-muted);margin-bottom:12px">
            Total a cobrar: <strong>${{ previewPrice.final.toFixed(2) }}</strong>
            <span v-if="previewPrice.discount"> (descuento {{ previewPrice.promoName }}: -${{ previewPrice.discount.toFixed(2) }})</span>
          </p>
          <button type="submit" class="btn btn-primary" style="width:100%">Confirmar cambio</button>
        </form>
      </div>
    </div>

    <!-- Payment modal -->
    <div v-if="showPayModal" class="modal-overlay" @click.self="showPayModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>Registrar Cobro</h2><button class="modal-close-btn" @click="showPayModal = false">✕</button></div>
        <form @submit.prevent="savePayment">
          <div class="form-group">
            <label>Cliente</label>
            <select v-model.number="payForm.clientId" required>
              <option disabled :value="null">Seleccionar...</option>
              <option v-for="c in gym.clients" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group"><label>Concepto</label><input v-model="payForm.concept" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Monto ($)</label><input v-model.number="payForm.amount" type="number" step="0.01" required /></div>
            <div class="form-group">
              <label>Método</label>
              <select v-model="payForm.method"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%">Registrar</button>
        </form>
      </div>
    </div>

    <!-- Promo modal -->
    <div v-if="showPromoModal" class="modal-overlay" @click.self="showPromoModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>Nueva promoción</h2><button class="modal-close-btn" @click="showPromoModal = false">✕</button></div>
        <form @submit.prevent="savePromo">
          <div class="form-group"><label>Nombre</label><input v-model="promoForm.name" required /></div>
          <div class="form-group"><label>Descripción</label><input v-model="promoForm.description" /></div>
          <div class="form-row">
            <div class="form-group">
              <label>Tipo</label>
              <select v-model="promoForm.type"><option value="percent">Porcentaje</option><option value="fixed">Monto fijo</option></select>
            </div>
            <div class="form-group"><label>Valor</label><input v-model.number="promoForm.value" type="number" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Aplica a</label>
              <select v-model="promoForm.appliesTo" @change="promoForm.targetId = null">
                <option value="membresias">Membresías</option>
                <option value="tienda">Tienda</option>
              </select>
            </div>
            <div class="form-group" v-if="promoForm.appliesTo === 'membresias'">
              <label>Plan Específico</label>
              <select v-model="promoForm.targetId">
                <option :value="null">Todos los planes</option>
                <option v-for="p in gym.plans" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-group" v-if="promoForm.appliesTo === 'tienda'">
              <label>Producto Específico</label>
              <select v-model="promoForm.targetId">
                <option :value="null">Toda la tienda</option>
                <option v-for="i in gym.inventory" :key="i.id" :value="i.id">{{ i.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Fecha de Inicio (Opcional)</label><input v-model="promoForm.startDate" type="date" /></div>
            <div class="form-group"><label>Fecha de Fin (Opcional)</label><input v-model="promoForm.endDate" type="date" /></div>
          </div>
          <label style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
            <input type="checkbox" v-model="promoForm.active" /> Activar al crear
          </label>
          <button type="submit" class="btn btn-primary" style="width:100%">Guardar</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGymStore } from '../stores/gym'
import { useToastStore } from '../stores/toast'

const gym = useGymStore()
const toast = useToastStore()

const showPlanModal = ref(false)
const editingPlan = ref(null)
const planForm = ref({ name: '', type: 'mensual', price: 0, duration: 30, color: '#3b82f6', limit: null, features: ['Acceso a máquinas'] })

const showChangeModal = ref(false)
const changeClient = ref(null)
const changePlanName = ref('')
const changeMethod = ref('Efectivo')

const showPayModal = ref(false)
const payForm = ref({ clientId: null, concept: 'Cobro de membresía', amount: 0, method: 'Efectivo' })

const showPromoModal = ref(false)
const promoForm = ref({ name: '', description: '', type: 'percent', value: 10, appliesTo: 'membresias', targetId: null, active: true, startDate: '', endDate: '' })

const previewPrice = computed(() => {
  const plan = gym.getPlanByName(changePlanName.value)
  if (!plan) return null
  return gym.applyMembershipDiscount(plan.price)
})

function statusLabel(s) {
  return { active: 'Activa', expired: 'Vencida', frozen: 'Congelada', completed: 'Cumplida' }[s] || s
}
function statusBadge(s) {
  return { active: 'badge-success', expired: 'badge-danger', frozen: 'badge-warning', completed: 'badge-warning' }[s] || 'badge-warning'
}

function formatAppliesTo(pr) {
  if (pr.appliesTo === 'membresias') {
    if (!pr.targetId) return 'Todas las Membresías'
    const p = gym.plans.find(x => x.id === pr.targetId)
    return p ? `Membresía: ${p.name}` : 'Membresía Específica'
  }
  if (pr.appliesTo === 'tienda') {
    if (!pr.targetId) return 'Toda la Tienda'
    const i = gym.inventory.find(x => x.id === pr.targetId)
    return i ? `Producto: ${i.name}` : 'Producto Específico'
  }
  return pr.appliesTo
}

function formatVigencia(pr) {
  if (!pr.startDate && !pr.endDate) return 'Permanente'
  const start = pr.startDate ? new Date(pr.startDate + 'T00:00:00').toLocaleDateString('es-EC') : 'Siempre'
  const end = pr.endDate ? new Date(pr.endDate + 'T00:00:00').toLocaleDateString('es-EC') : 'Siempre'
  return `${start} a ${end}`
}

function openPlanModal(p = null) {
  editingPlan.value = p?.id || null
  planForm.value = p
    ? { ...p }
    : { name: '', type: 'mensual', price: 0, duration: 30, color: '#3b82f6', limit: null, features: ['Acceso a máquinas'] }
  showPlanModal.value = true
}

function deletePlan(id) {
  gym.deletePlan(id)
  toast.success('Plan eliminado')
}

async function savePlan() {
  try {
    if (editingPlan.value) {
      await gym.updatePlan(editingPlan.value, planForm.value)
      toast.success('Plan actualizado')
    } else {
      await gym.addPlan({ ...planForm.value, features: planForm.value.features || ['Acceso a máquinas'] })
      toast.success('Plan creado')
    }
    showPlanModal.value = false
  } catch (err) {
    toast.error('No se pudo guardar el plan: ' + err.message)
  }
}

function openChangePlan(c) {
  changeClient.value = c
  changePlanName.value = c.plan
  showChangeModal.value = true
}

function saveChangePlan() {
  gym.changeClientPlan(changeClient.value.id, changePlanName.value, { method: changeMethod.value })
  toast.success(`Plan actualizado a ${changePlanName.value}`)
  showChangeModal.value = false
}

function renew(c) {
  gym.renewMembership(c.id)
  toast.success(`Membresía renovada: ${c.name}`)
}

function freeze(c) {
  gym.freezeMembership(c.id)
  toast.info(`Membresía congelada: ${c.name}`)
}

function unfreeze(c) {
  gym.unfreezeMembership(c.id)
  toast.success(`Membresía reactivada: ${c.name}`)
}

function savePayment() {
  gym.addPayment(payForm.value)
  toast.success('Cobro registrado')
  showPayModal.value = false
  payForm.value = { clientId: null, concept: 'Cobro de membresía', amount: 0, method: 'Efectivo' }
}

function savePromo() {
  gym.addPromotion({ ...promoForm.value })
  toast.success('Promoción creada')
  showPromoModal.value = false
  promoForm.value = { name: '', description: '', type: 'percent', value: 10, appliesTo: 'membresias', targetId: null, active: true, startDate: '', endDate: '' }
}
</script>

<style scoped>
.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
.plan-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
  transition: var(--transition);
}
.plan-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-glow); }
.plan-badge { padding: 4px 14px; border-radius: 50px; font-size: 0.8rem; font-weight: 700; color: white; align-self: flex-start; }
.plan-price { display: flex; align-items: baseline; gap: 4px; }
.plan-amount { font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; }
.plan-period { color: var(--text-muted); font-size: 0.85rem; }
.plan-features { list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: var(--text-secondary); }
.promo-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.price { font-weight: 700; color: var(--cyan-light); }
</style>
