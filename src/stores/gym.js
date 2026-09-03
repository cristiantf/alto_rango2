import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import mqtt from 'mqtt'

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

const API = import.meta.env.VITE_API_URL || 'https://altorangogym.com/api'

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
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
      clients.value = c
      plans.value = (pl || []).map(p => ({ ...p, price: num(p.price), duration: num(p.duration) }))
      products.value = (pr || []).map(p => ({ ...p, price: num(p.price), stock: num(p.stock), sold: num(p.sold) }))
      equipment.value = eq
      payments.value = (pay || []).map(p => ({ ...p, amount: num(p.amount), discount: num(p.discount) }))
      promotions.value = (prom || []).map(p => ({ ...p, value: num(p.value) }))
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

  // ─── Control de acceso ─────────────────────────────────
  function canOpenDoor(client) {
    if (!accessControlEnabled.value) return { ok: false, reason: 'Control de acceso desactivado' }
    if (!client) return { ok: false, reason: 'Cliente no encontrado' }
    if (client.direct_access) return { ok: true, reason: 'Acceso VIP/Libre' }
    if (client.status === 'frozen') return { ok: false, reason: 'Membresía congelada' }
    if (client.status === 'expired' || client.status === 'completed') return { ok: false, reason: 'Membresía vencida o cumplida' }
    if (client.status !== 'active') return { ok: false, reason: 'Membresía inactiva' }
    if (client.plan_end && client.plan_end < todayStr() && client.plan !== 'Pospago por Tarjeta') {
      return { ok: false, reason: 'Membresía vencida por fecha' }
    }
    if (client.plan === 'Pospago por Tarjeta') {
      const visits = client.visits_remaining != null ? client.visits_remaining : 30
      if (visits <= 0)
        return { ok: false, reason: 'Plan pospago cumplido (0 asistencias)' }
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
      if (client.plan === 'Pospago por Tarjeta') {
        const currentVisits = client.visits_remaining != null ? client.visits_remaining : 30
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
      attendance.value.unshift(record)

      // 🚪 Enviar orden MQTT al ESP32 para abrir la puerta
      sendMqttOpen()

      const msg = client.plan === 'Pospago por Tarjeta'
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
    if (client?.plan === 'Pospago por Tarjeta') {
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
    payments.value.unshift(payment)

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

    const end = new Date()
    end.setDate(end.getDate() + (plan.duration === 999 ? 365 : plan.duration))
    const updates = {
      plan: plan.name,
      plan_end: end.toISOString().split('T')[0],
      status: 'active',
      visits_remaining: plan.name.includes('Pospago') ? 30 : null,
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
    if (client) client.status = 'active'
  }

  // ─── Promociones ───────────────────────────────────────
  async function togglePromotion(id) {
    const p = promotions.value.find(x => x.id === id)
    if (!p) return
    const newActive = !p.active
    if (newActive) promotions.value.forEach(x => { if (x.applies_to === p.applies_to) x.active = false })
    p.active = newActive
    await api(`/promotions/${id}`, { method: 'PUT', body: { ...p, active: newActive } })
  }

  async function addPromotion(data) {
    const created = await api('/promotions', { method: 'POST', body: { ...data } })
    promotions.value.push({ ...data, ...created })
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
    const created = await api('/sales', { method: 'POST', body: sale })
    sales.value.unshift({ ...sale, id: created.id })
    addNotification({
      type: 'sale',
      title: 'Nueva venta registrada',
      message: `${sale.client_name} · $${num(sale.total).toFixed(2)} · ${sale.method}`,
      detail: sale.items.map(i => `${i.name} x${i.qty}`).join(', '),
    })
    // Actualizar stock localmente (la API ya lo hizo en BD)
    sale.items.forEach(item => {
      const p = products.value.find(p => p.name === item.name)
      if (p) { p.stock = Math.max(0, p.stock - item.qty); p.sold = (p.sold || 0) + item.qty }
    })
  }

  // ─── CRUD simples ──────────────────────────────────────
  async function addClient(clientData) {
    const created = await api('/clients', { method: 'POST', body: clientData })
    clients.value.unshift(created)

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
    if (c) Object.assign(c, updates)
  }

  async function deletePlan(id) {
    await api(`/plans/${id}`, { method: 'DELETE' })
    plans.value = plans.value.filter(p => p.id !== id)
  }

  async function deleteClient(id) {
    await api(`/clients/${id}`, { method: 'DELETE' })
    clients.value = clients.value.filter(c => c.id !== id)
  }

  async function deleteProduct(id) {
    await api(`/products/${id}`, { method: 'DELETE' })
    products.value = products.value.filter(p => p.id !== id)
  }

  async function deleteEquipmentItem(id) {
    await api(`/equipment/${id}`, { method: 'DELETE' })
    equipment.value = equipment.value.filter(e => e.id !== id)
  }

  // Guardar clientes y productos (para compatibilidad con vistas que llaman save*)
  async function saveClients() { /* No-op: las mutaciones ya persisten via API */ }
  async function savePlans() { /* No-op */ }
  async function saveProducts() { /* No-op */ }
  async function saveEquipment() { /* No-op */ }
  async function savePayments() { /* No-op */ }
  async function savePromotions() { /* No-op */ }
  async function saveAttendance() { /* No-op */ }
  async function saveRoutines() { /* No-op */ }
  async function saveSales() { /* No-op */ }

  return {
    clients, plans, products, equipment, payments, promotions, attendance,
    routines, sales, notifications, accessControlEnabled, loading, error,
    activePromo, unreadNotifications,
    loadAll,
    saveClients, savePlans, saveProducts, saveEquipment, savePayments,
    savePromotions, saveAttendance, saveRoutines, saveSales,
    applyMembershipDiscount, getPlanByName, canOpenDoor, registerCheckin,
    verifyAttendance, toggleVerification, cancelAttendance, setAccessControl, openDoorDirectly,
    addPayment, changeClientPlan, renewMembership, freezeMembership, unfreezeMembership,
    togglePromotion, addPromotion, deletePromotion,
    addNotification, markNotificationsRead, recordSale,
    addClient, updateClient, deletePlan, deleteClient, deleteProduct, deleteEquipmentItem,
  }
})
