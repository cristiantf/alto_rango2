import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import mqtt from 'mqtt'
import { api } from '../services/api'

const mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt')

mqttClient.on('connect', () => {
  console.log('✅ Conectado al broker MQTT vía WebSockets')
})

function sendMqttOpen() {
  if (mqttClient.connected) {
    mqttClient.publish('altorango/gym/puerta/comando_secreto_777', 'abrir')
    console.log('🚀 Mensaje MQTT enviado: abrir')
  } else {
    console.warn('⚠️ MQTT no está conectado, intentando reconectar...')
    mqttClient.reconnect()
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function nowTime() {
  return new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// ─── Reglas de planes ─────────────────────────────────────
// Asistencias que incluye un plan pospago al activarse/renovarse
export const POSPAGO_VISITS = 30

// Un plan es pospago si su nombre lo indica ("Pospago Tarjeta", "Pospago por Tarjeta"…).
// Antes se comparaba con el texto exacto 'Pospago por Tarjeta', que no coincide con la BD.
export function isPospago(planName) {
  return /pospago/i.test(String(planName || ''))
}

// Estado real del cliente: un plan por tiempo con fecha vencida pasa a "expired"
// aunque en la BD siga como "active". Pospago depende de asistencias, no de la fecha.
function effectiveStatus(client) {
  if (client.status === 'active' && !isPospago(client.plan) && client.plan_end && client.plan_end < todayStr()) {
    return 'expired'
  }
  return client.status
}

function normalizeClient(c) {
  return { ...c, status: effectiveStatus(c) }
}

function normalizePlan(p) {
  // La API devuelve duration_days; las vistas usan duration
  return { ...p, price: num(p.price), duration: num(p.duration_days ?? p.duration) }
}

// La BD guarda discount_percentage / discount_amount / is_active / start_date / end_date;
// las vistas y el cálculo de descuentos usan type / value / active / startDate / endDate.
function normalizePromotion(p) {
  const percent = num(p.discount_percentage)
  const amount = num(p.discount_amount)
  return {
    ...p,
    active: !!Number(p.is_active),
    type: percent > 0 ? 'percent' : 'fixed',
    value: percent > 0 ? percent : amount,
    startDate: p.start_date || null,
    endDate: p.end_date || null,
    applies_to: p.applies_to || 'membresias',
  }
}

function promotionBody(p) {
  return {
    name: p.name,
    discount_percentage: p.type === 'percent' ? num(p.value) : 0,
    discount_amount: p.type === 'fixed' ? num(p.value) : 0,
    start_date: p.startDate || null,
    end_date: p.endDate || null,
    is_active: !!p.active,
  }
}

function productBody(p) {
  return {
    name: p.name,
    category: p.category,
    price: num(p.price),
    stock: num(p.stock),
    is_public: p.is_public ?? true,
  }
}

export const useGymStore = defineStore('gym', () => {
  const clients = ref([])
  const plans = ref([])
  const products = ref([])
  const equipment = ref([])
  const payments = ref([])
  const promotions = ref([])
  const attendance = ref([])
  const routines = ref([])
  const sales = ref([])
  const notifications = ref([])
  const accessControlEnabled = ref(true)
  const loading = ref(false)
  const error = ref(null)

  // ─── Cargar todos los datos desde la API ───────────────
  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      const [c, pl, pr, eq, pay, prom, att, rot, sal] = await Promise.all([
        api('/clients'),
        api('/plans'),
        api('/products'),
        api('/equipment'),
        api('/payments'),
        api('/promotions'),
        api('/attendance'),
        api('/routines'),
        api('/sales'),
      ])
      clients.value = (c || []).map(normalizeClient)
      plans.value = (pl || []).map(normalizePlan)
      products.value = (pr || []).map(p => ({ ...p, price: num(p.price), stock: num(p.stock), sold: num(p.sold) }))
      equipment.value = eq
      payments.value = (pay || []).map(p => ({ ...p, amount: num(p.amount), discount: num(p.discount) }))
      promotions.value = (prom || []).map(normalizePromotion)
      attendance.value = (att || []).map(r => ({ ...r, client: r.client || r.client_name }))
      routines.value = rot
      sales.value = (sal || []).map(s => ({ ...s, total: num(s.total) }))
    } catch (err) {
      console.error('loadAll error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // ─── Computeds ─────────────────────────────────────────
  const activePromo = computed(() => {
    const today = todayStr()
    return promotions.value.find(p => {
      if (!p.active || p.applies_to !== 'membresias') return false
      if (p.startDate && p.startDate > today) return false
      if (p.endDate && p.endDate < today) return false
      return true
    }) || null
  })
  const unreadNotifications = computed(() => notifications.value.filter(n => !n.read).length)

  // ─── Descuentos y planes ───────────────────────────────
  function applyMembershipDiscount(amount) {
    const promo = activePromo.value
    if (!promo) return { final: amount, discount: 0, promoName: null }
    const discount = promo.type === 'percent'
      ? +(amount * promo.value / 100).toFixed(2)
      : Math.min(promo.value, amount)
    return { final: +(amount - discount).toFixed(2), discount, promoName: promo.name }
  }

  function getPlanByName(name) {
    return plans.value.find(p => p.name === name)
  }

  async function addPlan(form) {
    const body = { name: form.name, price: num(form.price), duration_days: num(form.duration) || 30, features: form.features || [] }
    const created = await api('/plans', { method: 'POST', body })
    plans.value.push(normalizePlan({ ...created, ...body }))
  }

  async function updatePlan(id, form) {
    const body = { name: form.name, price: num(form.price), duration_days: num(form.duration) || 30, features: form.features || [] }
    await api(`/plans/${id}`, { method: 'PUT', body })
    const p = plans.value.find(x => x.id === id)
    if (p) Object.assign(p, normalizePlan({ ...p, ...form, ...body }))
  }

  // ─── Control de acceso ─────────────────────────────────
  function canOpenDoor(client) {
    if (!accessControlEnabled.value) return { ok: false, reason: 'Control de acceso desactivado' }
    if (!client) return { ok: false, reason: 'Cliente no encontrado' }
    if (client.direct_access) return { ok: true, reason: 'Acceso VIP/Libre' }
    if (client.status === 'frozen') return { ok: false, reason: 'Membresía congelada' }
    if (client.status === 'expired' || client.status === 'completed') return { ok: false, reason: 'Membresía vencida o cumplida' }
    if (client.status !== 'active') return { ok: false, reason: 'Membresía inactiva' }
    if (isPospago(client.plan)) {
      const visits = client.visits_remaining != null ? client.visits_remaining : POSPAGO_VISITS
      if (visits <= 0) return { ok: false, reason: 'Plan pospago cumplido (0 asistencias)' }
    } else if (client.plan_end && client.plan_end < todayStr()) {
      return { ok: false, reason: 'Membresía vencida por fecha' }
    }
    return { ok: true, reason: '' }
  }

  async function registerCheckin(clientId) {
    const client = clients.value.find(c => c.id === clientId)
    const gate = canOpenDoor(client)
    if (!gate.ok) return { success: false, doorOpen: false, message: gate.reason }

    try {
      // Actualizar visitas en BD
      const updates = { visits: Number(client.visits || 0) + 1 }
      const pospago = isPospago(client.plan)
      if (pospago) {
        const currentVisits = client.visits_remaining != null ? client.visits_remaining : POSPAGO_VISITS
        updates.visits_remaining = Math.max(0, currentVisits - 1)
        if (updates.visits_remaining === 0) updates.status = 'completed'
      }
      await api(`/clients/${clientId}`, { method: 'PUT', body: updates })
      Object.assign(client, updates)

      // Registrar asistencia
      const record = await api('/attendance', {
        method: 'POST',
        body: { client_id: clientId, client_name: client.name, date: todayStr(), checkin: nowTime() }
      })
      attendance.value.unshift({ ...record, client: record.client_name })

      // 🚪 Enviar orden MQTT al ESP32 para abrir la puerta
      sendMqttOpen()

      const msg = pospago
        ? `Entrada OK. Quedan ${updates.visits_remaining} asistencias`
        : `Entrada registrada: ${client.name}`

      addNotification({
        type: 'checkin',
        title: 'Nuevo Ingreso',
        message: msg,
        detail: `Cliente: ${client.name} | Hora: ${nowTime()}`
      })

      return {
        success: true,
        doorOpen: true,
        message: msg,
        remaining: updates.visits_remaining,
      }
    } catch (err) {
      return { success: false, doorOpen: false, message: err.message }
    }
  }

  async function verifyAttendance(id) {
    await api(`/attendance/${id}`, { method: 'PUT', body: { status: 'verified' } })
    const r = attendance.value.find(a => a.id === id)
    if (r) r.status = 'verified'
  }

  async function toggleVerification(id) {
    const r = attendance.value.find(a => a.id === id)
    if (!r) return
    const newStatus = r.status === 'verified' ? 'pending' : 'verified'
    await api(`/attendance/${id}`, { method: 'PUT', body: { status: newStatus } })
    r.status = newStatus
  }

  async function cancelAttendance(id) {
    const r = attendance.value.find(a => a.id === id)
    if (!r || r.status === 'cancelled') return
    await api(`/attendance/${id}`, { method: 'PUT', body: { status: 'cancelled' } })
    r.status = 'cancelled'
    // Revertir visitas pospago
    const client = clients.value.find(c => c.id === r.client_id)
    if (client && isPospago(client.plan)) {
      const updates = {
        visits_remaining: Number(client.visits_remaining || 0) + 1,
        visits: Math.max(0, Number(client.visits || 0) - 1),
        status: 'active',
      }
      await api(`/clients/${client.id}`, { method: 'PUT', body: updates })
      Object.assign(client, updates)
    }
  }

  function setAccessControl(enabled) {
    accessControlEnabled.value = enabled
  }

  async function openDoorDirectly(adminId = 1) {
    try {
      const res = await api('/attendance/direct-open', { method: 'POST', body: { admin_id: adminId } })

      // 🚪 Enviar orden MQTT al ESP32
      sendMqttOpen()

      addNotification({
        type: 'checkin',
        title: 'Apertura Manual',
        message: 'Puerta abierta remotamente',
        detail: `Hora: ${nowTime()}`
      })

      return { success: true, message: res.message || 'Puerta abierta manualmente' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  // ─── Pagos ─────────────────────────────────────────────
  async function addPayment({ clientId, concept, amount, method }) {
    const client = clients.value.find(c => c.id === clientId)
    const priced = applyMembershipDiscount(amount)
    const payment = await api('/payments', {
      method: 'POST',
      body: {
        client_id: clientId,
        client_name: client?.name || 'Cliente',
        concept,
        amount: priced.final,
        method,
        discount: priced.discount,
        promo: priced.promoName,
      }
    })
    payments.value.unshift({ ...payment, client: payment.client_name, amount: num(payment.amount), discount: num(payment.discount) })

    addNotification({
      type: 'payment',
      title: 'Pago Recibido',
      message: `${client?.name || 'Cliente'} - $${priced.final.toFixed(2)}`,
      detail: `Concepto: ${concept} | Método: ${method}`
    })

    return payment
  }

  async function changeClientPlan(clientId, planName, { registerPayment = true, method = 'Efectivo' } = {}) {
    const client = clients.value.find(c => c.id === clientId)
    const plan = getPlanByName(planName)
    if (!client || !plan) return null

    const days = plan.duration === 999 ? 365 : (plan.duration || 30)
    const end = new Date()
    end.setDate(end.getDate() + days)
    const updates = {
      plan: plan.name,
      plan_end: end.toISOString().split('T')[0],
      status: 'active',
      visits_remaining: isPospago(plan.name) ? POSPAGO_VISITS : null,
    }
    await api(`/clients/${clientId}`, { method: 'PUT', body: updates })
    Object.assign(client, updates)

    if (registerPayment) {
      await addPayment({ clientId, concept: `Cambio/renovación: ${plan.name}`, amount: plan.price, method })
    }
    return client
  }

  async function renewMembership(clientId) {
    const client = clients.value.find(c => c.id === clientId)
    if (client) await changeClientPlan(clientId, client.plan, { registerPayment: true })
  }

  async function freezeMembership(clientId) {
    await api(`/clients/${clientId}`, { method: 'PUT', body: { status: 'frozen' } })
    const client = clients.value.find(c => c.id === clientId)
    if (client) client.status = 'frozen'
  }

  async function unfreezeMembership(clientId) {
    await api(`/clients/${clientId}`, { method: 'PUT', body: { status: 'active' } })
    const client = clients.value.find(c => c.id === clientId)
    if (client) Object.assign(client, normalizeClient({ ...client, status: 'active' }))
  }

  // ─── Promociones ───────────────────────────────────────
  async function togglePromotion(id) {
    const p = promotions.value.find(x => x.id === id)
    if (!p) return
    const newActive = !p.active
    // Solo una promoción activa por tipo: desactivar las demás también en la BD
    if (newActive) {
      const others = promotions.value.filter(x => x.id !== id && x.active && x.applies_to === p.applies_to)
      for (const o of others) {
        await api(`/promotions/${o.id}`, { method: 'PUT', body: promotionBody({ ...o, active: false }) })
        Object.assign(o, { active: false, is_active: 0 })
      }
    }
    await api(`/promotions/${id}`, { method: 'PUT', body: promotionBody({ ...p, active: newActive }) })
    Object.assign(p, { active: newActive, is_active: newActive ? 1 : 0 })
  }

  async function addPromotion(data) {
    const body = promotionBody(data)
    const created = await api('/promotions', { method: 'POST', body })
    promotions.value.push(normalizePromotion({ ...body, ...created, description: data.description }))
  }

  async function deletePromotion(id) {
    await api(`/promotions/${id}`, { method: 'DELETE' })
    promotions.value = promotions.value.filter(p => p.id !== id)
  }

  // ─── Notificaciones (locales) ──────────────────────────
  function addNotification(notification) {
    notifications.value.unshift({ id: Date.now(), read: false, createdAt: new Date().toISOString(), ...notification })
  }

  function markNotificationsRead() {
    notifications.value.forEach(n => { n.read = true })
  }

  // ─── Ventas ────────────────────────────────────────────
  async function recordSale(sale) {
    const items = sale.items.map(i => ({ ...i, inventory_id: i.inventory_id ?? i.id }))
    const created = await api('/sales', { method: 'POST', body: { ...sale, items } })
    const clientName = sale.client_name || sale.client || 'Cliente'
    sales.value.unshift({ ...sale, items, client_name: clientName, id: created.id, total: num(sale.total) })
    addNotification({
      type: 'sale',
      title: 'Nueva venta registrada',
      message: `${clientName} · $${num(sale.total).toFixed(2)} · ${sale.method}`,
      detail: items.map(i => `${i.name} x${i.qty}`).join(', '),
    })
    // Reflejar el stock localmente (la API ya lo descontó en BD)
    items.forEach(item => {
      const p = products.value.find(p => p.id === item.inventory_id) || products.value.find(p => p.name === item.name)
      if (p) { p.stock = Math.max(0, p.stock - item.qty); p.sold = (p.sold || 0) + item.qty }
    })
  }

  // ─── Productos y equipos ───────────────────────────────
  async function addProduct(data) {
    const body = productBody(data)
    const created = await api('/products', { method: 'POST', body })
    products.value.push({ ...data, ...body, id: created.id, sold: 0 })
  }

  async function updateProduct(id, data) {
    const p = products.value.find(x => x.id === id)
    const body = productBody({ ...p, ...data })
    await api(`/products/${id}`, { method: 'PUT', body })
    if (p) Object.assign(p, data, body)
  }

  async function deleteProduct(id) {
    await api(`/products/${id}`, { method: 'DELETE' })
    products.value = products.value.filter(p => p.id !== id)
  }

  async function addEquipment(data) {
    const created = await api('/equipment', { method: 'POST', body: data })
    equipment.value.push(created)
  }

  async function updateEquipment(id, data) {
    const { id: _id, tenant_id, created_at, updated_at, ...body } = data
    await api(`/equipment/${id}`, { method: 'PUT', body })
    const e = equipment.value.find(x => x.id === id)
    if (e) Object.assign(e, body)
  }

  async function deleteEquipmentItem(id) {
    await api(`/equipment/${id}`, { method: 'DELETE' })
    equipment.value = equipment.value.filter(e => e.id !== id)
  }

  // ─── Rutinas ───────────────────────────────────────────
  async function addRoutine(data) {
    const created = await api('/routines', { method: 'POST', body: data })
    routines.value.push({ ...data, id: created.id })
  }

  // ─── Clientes y planes ─────────────────────────────────
  async function addClient(clientData) {
    const created = await api('/clients', { method: 'POST', body: clientData })
    clients.value.unshift(normalizeClient(created))

    addNotification({
      type: 'client',
      title: 'Nuevo Cliente Registrado',
      message: clientData.name,
      detail: `Plan: ${clientData.plan || 'Sin plan'} | Cédula: ${clientData.cedula || 'N/A'}`
    })

    return created
  }

  async function updateClient(id, updates) {
    await api(`/clients/${id}`, { method: 'PUT', body: updates })
    const c = clients.value.find(x => x.id === id)
    if (c) Object.assign(c, normalizeClient({ ...c, ...updates }))
  }

  async function deletePlan(id) {
    await api(`/plans/${id}`, { method: 'DELETE' })
    plans.value = plans.value.filter(p => p.id !== id)
  }

  async function deleteClient(id) {
    await api(`/clients/${id}`, { method: 'DELETE' })
    clients.value = clients.value.filter(c => c.id !== id)
  }

  return {
    clients, plans, products, equipment, payments, promotions, attendance,
    routines, sales, notifications, accessControlEnabled, loading, error,
    activePromo, unreadNotifications,
    loadAll,
    applyMembershipDiscount, getPlanByName, addPlan, updatePlan, canOpenDoor, registerCheckin,
    verifyAttendance, toggleVerification, cancelAttendance, setAccessControl, openDoorDirectly,
    addPayment, changeClientPlan, renewMembership, freezeMembership, unfreezeMembership,
    togglePromotion, addPromotion, deletePromotion,
    addNotification, markNotificationsRead, recordSale,
    addProduct, updateProduct, deleteProduct, addEquipment, updateEquipment, deleteEquipmentItem,
    addRoutine,
    addClient, updateClient, deletePlan, deleteClient,
  }
})
