<template>
  <div>
    <div class="page-header">
      <div><h1>📦 Inventario</h1><p class="page-subtitle">Productos de tienda y equipos del gimnasio</p></div>
      <button class="btn btn-primary" @click="openCreate">➕ {{ tab === 'productos' ? 'Nuevo Producto' : 'Nuevo Equipo' }}</button>
    </div>

    <div class="filter-bar" style="margin-bottom:20px">
      <button class="filter-chip" :class="{ active: tab === 'productos' }" @click="tab = 'productos'">🛍️ Productos</button>
      <button class="filter-chip" :class="{ active: tab === 'equipos' }" @click="tab = 'equipos'">🏋️ Equipos / Pesas</button>
    </div>

    <!-- Products -->
    <template v-if="tab === 'productos'">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:rgba(59,130,246,0.15)">📦</div><div class="stat-value">{{ gym.products.length }}</div><div class="stat-label">Total Productos</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.15)">⚠️</div><div class="stat-value">{{ lowStock }}</div><div class="stat-label">Stock Bajo (&lt;20)</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,0.15)">💰</div><div class="stat-value">${{ totalValue.toFixed(0) }}</div><div class="stat-label">Valor del Inventario</div></div>
      </div>
      <div class="filter-bar">
        <div class="search-bar" style="flex:1;max-width:360px"><span>🔍</span><input v-model="search" placeholder="Buscar producto..." /></div>
        <button v-for="c in ['Todos','Bebidas','Suplementos','Snacks']" :key="c" class="filter-chip" :class="{ active: cat === c }" @click="cat = c">{{ c }}</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Vendidos</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id">
              <td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.3rem">{{ p.emoji }}</span><strong>{{ p.name }}</strong></div></td>
              <td>{{ p.category }}</td>
              <td class="price">${{ p.price.toFixed(2) }}</td>
              <td>{{ p.stock }}</td>
              <td>{{ p.sold }}</td>
              <td><span class="badge" :class="p.stock < 15 ? 'badge-danger' : p.stock < 25 ? 'badge-warning' : 'badge-success'">{{ p.stock < 15 ? 'Bajo' : p.stock < 25 ? 'Medio' : 'OK' }}</span></td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-secondary btn-sm" @click="editProduct(p)">✏️</button>
                  <button class="btn btn-success btn-sm" @click="addStock(p)">📥+10</button>
                  <button class="btn btn-danger btn-sm" @click="removeProduct(p.id)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Equipment RF-016 -->
    <template v-else>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:rgba(59,130,246,0.15)">🏋️</div><div class="stat-value">{{ gym.equipment.length }}</div><div class="stat-label">Ítems de equipo</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.15)">✅</div><div class="stat-value">{{ operativo }}</div><div class="stat-label">Operativos</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.15)">🔧</div><div class="stat-value">{{ mantenimiento }}</div><div class="stat-label">En mantenimiento / baja</div></div>
      </div>
      <div class="filter-bar">
        <div class="search-bar" style="flex:1;max-width:360px"><span>🔍</span><input v-model="eqSearch" placeholder="Buscar equipo..." /></div>
        <button v-for="c in ['Todos','Máquina','Pesas']" :key="c" class="filter-chip" :class="{ active: eqType === c }" @click="eqType = c">{{ c }}</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Equipo</th><th>Tipo</th><th>Cantidad</th><th>Ubicación</th><th>Estado</th><th>Notas</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="e in filteredEquipment" :key="e.id">
              <td><strong>{{ e.name }}</strong></td>
              <td>{{ e.type }}</td>
              <td>{{ e.quantity }}</td>
              <td>{{ e.location }}</td>
              <td><span class="badge" :class="eqBadge(e.status)">{{ e.status }}</span></td>
              <td>{{ e.notes || '—' }}</td>
              <td style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" @click="editEquipment(e)">✏️</button>
                <button class="btn btn-danger btn-sm" @click="removeEquipment(e.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>{{ modalTitle }}</h2><button class="modal-close-btn" @click="showModal = false">✕</button></div>
        <form v-if="tab === 'productos'" @submit.prevent="saveProduct">
          <div class="form-group"><label>Nombre</label><input v-model="productForm.name" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Categoría</label><select v-model="productForm.category"><option>Bebidas</option><option>Suplementos</option><option>Snacks</option></select></div>
            <div class="form-group"><label>Precio ($)</label><input v-model.number="productForm.price" type="number" step="0.01" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Stock</label><input v-model.number="productForm.stock" type="number" required /></div>
            <div class="form-group"><label>Emoji</label><input v-model="productForm.emoji" /></div>
          </div>
          <div class="form-group"><label>Descripción</label><textarea v-model="productForm.desc" rows="2"></textarea></div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">Guardar</button>
        </form>
        <form v-else @submit.prevent="saveEquipment">
          <div class="form-group"><label>Nombre</label><input v-model="eqForm.name" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Tipo</label><select v-model="eqForm.type"><option>Máquina</option><option>Pesas</option></select></div>
            <div class="form-group"><label>Cantidad</label><input v-model.number="eqForm.quantity" type="number" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Ubicación</label><input v-model="eqForm.location" /></div>
            <div class="form-group">
              <label>Estado</label>
              <select v-model="eqForm.status"><option>operativo</option><option>mantenimiento</option><option>baja</option></select>
            </div>
          </div>
          <div class="form-group"><label>Notas</label><textarea v-model="eqForm.notes" rows="2"></textarea></div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">Guardar</button>
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

const tab = ref('productos')
const search = ref('')
const cat = ref('Todos')
const eqSearch = ref('')
const eqType = ref('Todos')
const showModal = ref(false)
const editing = ref(null)

const productForm = ref({ name: '', category: 'Bebidas', price: 0, stock: 0, emoji: '📦', desc: '' })
const eqForm = ref({ name: '', type: 'Máquina', quantity: 1, status: 'operativo', location: '', notes: '' })

const lowStock = computed(() => gym.products.filter(p => p.stock < 20).length)
const totalValue = computed(() => gym.products.reduce((s, p) => s + p.price * p.stock, 0))
const operativo = computed(() => gym.equipment.filter(e => e.status === 'operativo').length)
const mantenimiento = computed(() => gym.equipment.filter(e => e.status !== 'operativo').length)

const filteredProducts = computed(() => {
  let l = gym.products
  if (cat.value !== 'Todos') l = l.filter(p => p.category === cat.value)
  if (search.value) { const s = search.value.toLowerCase(); l = l.filter(p => p.name.toLowerCase().includes(s)) }
  return l
})

const filteredEquipment = computed(() => {
  let l = gym.equipment
  if (eqType.value !== 'Todos') l = l.filter(e => e.type === eqType.value)
  if (eqSearch.value) { const s = eqSearch.value.toLowerCase(); l = l.filter(e => e.name.toLowerCase().includes(s)) }
  return l
})

const modalTitle = computed(() => {
  if (tab.value === 'productos') return (editing.value ? 'Editar' : 'Nuevo') + ' Producto'
  return (editing.value ? 'Editar' : 'Nuevo') + ' Equipo'
})

function eqBadge(s) {
  return s === 'operativo' ? 'badge-success' : s === 'mantenimiento' ? 'badge-warning' : 'badge-danger'
}

function openCreate() {
  editing.value = null
  if (tab.value === 'productos') productForm.value = { name: '', category: 'Bebidas', price: 0, stock: 0, emoji: '📦', desc: '' }
  else eqForm.value = { name: '', type: 'Máquina', quantity: 1, status: 'operativo', location: '', notes: '' }
  showModal.value = true
}

function editProduct(p) { editing.value = p.id; productForm.value = { ...p }; showModal.value = true }
function editEquipment(e) { editing.value = e.id; eqForm.value = { ...e }; showModal.value = true }

function removeProduct(id) {
  gym.deleteProduct(id)
  toast.success('Producto eliminado')
}
function removeEquipment(id) {
  gym.deleteEquipmentItem(id)
  toast.success('Equipo dado de baja')
}
async function addStock(p) {
  try {
    await gym.updateProduct(p.id, { stock: p.stock + 10 })
    toast.success(`+10 unidades: ${p.name}`)
  } catch (err) {
    toast.error('No se pudo actualizar el stock: ' + err.message)
  }
}

async function saveProduct() {
  try {
    if (editing.value) {
      await gym.updateProduct(editing.value, productForm.value)
      toast.success('Producto actualizado')
    } else {
      await gym.addProduct(productForm.value)
      toast.success('Producto agregado')
    }
    showModal.value = false
  } catch (err) {
    toast.error('No se pudo guardar el producto: ' + err.message)
  }
}

async function saveEquipment() {
  try {
    if (editing.value) {
      await gym.updateEquipment(editing.value, eqForm.value)
      toast.success('Equipo actualizado')
    } else {
      await gym.addEquipment(eqForm.value)
      toast.success('Equipo registrado')
    }
    showModal.value = false
  } catch (err) {
    toast.error('No se pudo guardar el equipo: ' + err.message)
  }
}
</script>

<style scoped>
.price { font-weight: 700; color: var(--cyan-light); }
</style>
