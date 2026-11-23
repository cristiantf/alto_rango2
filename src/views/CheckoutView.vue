<template>
  <div>
    <div class="page-header"><div><h1>💳 Checkout</h1><p class="page-subtitle">Completa tu compra</p></div></div>

    <div class="checkout-steps">
      <div class="checkout-step" :class="{ active: step === 1, done: step > 1 }">{{ step > 1 ? '✓' : '1' }} Datos</div>
      <div class="checkout-step" :class="{ active: step === 2, done: step > 2 }">{{ step > 2 ? '✓' : '2' }} Pago</div>
      <div class="checkout-step" :class="{ active: step === 3 }">3 Confirmación</div>
    </div>

    <!-- Step 1: Datos del cliente -->
    <div v-if="step === 1" class="checkout-content card" style="max-width:640px;margin:0 auto">
      <h3 style="margin-bottom:20px">Datos del Comprador</h3>
      <form @submit.prevent="step = 2">
        <div class="form-row">
          <div class="form-group"><label>Nombre Completo</label><input v-model="form.name" required /></div>
          <div class="form-group"><label>Cédula / ID</label><input v-model="form.cedula" required /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Email</label><input v-model="form.email" type="email" required /></div>
          <div class="form-group"><label>Teléfono</label><input v-model="form.phone" required /></div>
        </div>
        <div class="form-group"><label>Notas (opcional)</label><textarea v-model="form.notes" rows="2" placeholder="Instrucciones especiales..."></textarea></div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%">Continuar al Pago →</button>
      </form>
    </div>

    <!-- Step 2: Método de pago -->
    <div v-if="step === 2" class="checkout-content" style="max-width:720px;margin:0 auto">
      <div class="payment-grid">
        <div class="card payment-methods">
          <h3 style="margin-bottom:20px">Método de Pago</h3>
          <div v-for="m in paymentMethods" :key="m.id" class="payment-option" :class="{ active: selectedMethod === m.id }" @click="selectedMethod = m.id">
            <span style="font-size:1.5rem">{{ m.icon }}</span>
            <div><strong>{{ m.name }}</strong><p style="font-size:0.8rem;color:var(--text-muted)">{{ m.desc }}</p></div>
          </div>

          <!-- Datos de transferencia bancaria -->
          <div v-if="selectedMethod === 'transfer'" class="transfer-info card" style="margin-top:16px;background:rgba(59,130,246,0.06)">
            <h4 style="margin-bottom:12px;color:var(--accent-light)">🏦 Datos para Transferencia</h4>
            <div class="bank-detail"><span>Banco:</span><strong>Banco Pichincha</strong></div>
            <div class="bank-detail"><span>Tipo de Cuenta:</span><strong>Corriente</strong></div>
            <div class="bank-detail"><span>Número:</span><strong>2200123456</strong></div>
            <div class="bank-detail"><span>Titular:</span><strong>Alto Rango Gym S.A.</strong></div>
            <div class="bank-detail"><span>RUC:</span><strong>1791234567001</strong></div>
            <div class="bank-detail"><span>Email:</span><strong>pagos@altorango.com</strong></div>
            <div class="form-group" style="margin-top:16px">
              <label>Número de Comprobante</label>
              <input v-model="transferRef" placeholder="Ej: 00012345678" required />
            </div>
            <div class="form-group">
              <label>Adjuntar Comprobante (simulado)</label>
              <input type="file" accept="image/*,.pdf" style="padding:8px" />
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:16px">Resumen</h3>
          <div v-for="item in cart.items" :key="item.id" style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.85rem;border-bottom:1px solid var(--border-color)">
            <span>{{ item.emoji }} {{ item.name }} x{{ item.qty }}</span>
            <span>${{ (item.price * item.qty).toFixed(2) }}</span>
          </div>
          <div class="summary-row" style="margin-top:12px"><span>Subtotal</span><span>${{ cart.subtotal.toFixed(2) }}</span></div>
          <div class="summary-row"><span>IVA (12%)</span><span>${{ cart.tax.toFixed(2) }}</span></div>
          <div class="summary-row total"><span>Total a Pagar</span><span>${{ cart.total.toFixed(2) }}</span></div>
          <button class="btn btn-primary btn-lg" style="width:100%;margin-top:16px" @click="completePurchase" :disabled="selectedMethod === 'transfer' && !transferRef">Confirmar Compra ✓</button>
          <button class="btn btn-secondary" style="width:100%;margin-top:8px" @click="step = 1">← Volver</button>
        </div>
      </div>
    </div>

    <!-- Step 3: Confirmación -->
    <div v-if="step === 3" class="checkout-content card" style="max-width:560px;margin:0 auto;text-align:center">
      <div style="font-size:4rem;margin-bottom:16px">🎉</div>
      <h2 style="margin-bottom:8px;color:var(--success)">¡Compra Realizada!</h2>
      <p style="color:var(--text-secondary);margin-bottom:24px">Tu pedido ha sido procesado exitosamente</p>

      <div class="receipt card" style="text-align:left;background:rgba(59,130,246,0.04)">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:2rem">💪</div>
          <strong style="font-size:1.1rem">Alto Rango Gym</strong>
          <p style="font-size:0.8rem;color:var(--text-muted)">Comprobante de Venta</p>
        </div>
        <div class="receipt-row"><span>Pedido #</span><strong>{{ orderNumber }}</strong></div>
        <div class="receipt-row"><span>Fecha</span><strong>{{ orderDate }}</strong></div>
        <div class="receipt-row"><span>Cliente</span><strong>{{ form.name }}</strong></div>
        <div class="receipt-row"><span>Método</span><strong>{{ paymentMethods.find(m => m.id === selectedMethod)?.name }}</strong></div>
        <hr style="border-color:var(--border-color);margin:12px 0" />
        <div v-for="item in receiptItems" :key="item.id" class="receipt-row">
          <span>{{ item.emoji }} {{ item.name }} x{{ item.qty }}</span>
          <strong>${{ (item.price * item.qty).toFixed(2) }}</strong>
        </div>
        <hr style="border-color:var(--border-color);margin:12px 0" />
        <div class="receipt-row"><span>Subtotal</span><strong>${{ receiptSubtotal.toFixed(2) }}</strong></div>
        <div class="receipt-row"><span>IVA 12%</span><strong>${{ receiptTax.toFixed(2) }}</strong></div>
        <div class="receipt-row" style="font-size:1.1rem;color:var(--cyan-light)"><span>TOTAL</span><strong>${{ receiptTotal.toFixed(2) }}</strong></div>
        <div v-if="selectedMethod === 'transfer'" class="receipt-row" style="margin-top:8px"><span>Comprobante</span><strong>{{ transferRef }}</strong></div>
      </div>

      <div style="display:flex;gap:12px;margin-top:24px;justify-content:center">
        <router-link to="/tienda" class="btn btn-primary">Seguir Comprando</router-link>
        <router-link to="/" class="btn btn-secondary">Ir al Dashboard</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'
import { useGymStore } from '../stores/gym'

const cart = useCartStore()
const toast = useToastStore()
const gym = useGymStore()
const step = ref(1)
const selectedMethod = ref('transfer')
const transferRef = ref('')

const form = ref({ name: 'Carlos Mendoza', cedula: '1712345678', email: 'carlos@email.com', phone: '0991234567', notes: '' })

const paymentMethods = [
  { id: 'transfer', icon: '🏦', name: 'Transferencia Bancaria', desc: 'Realiza una transferencia y adjunta el comprobante' },
  { id: 'cash', icon: '💵', name: 'Efectivo', desc: 'Paga en la recepción del gimnasio' },
  { id: 'card', icon: '💳', name: 'Tarjeta de Crédito/Débito', desc: 'Pago seguro con tarjeta (simulado)' },
]

const receiptItems = ref([])
const receiptSubtotal = ref(0)
const receiptTax = ref(0)
const receiptTotal = ref(0)
const orderNumber = ref('')
const orderDate = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

async function completePurchase() {
  receiptItems.value = [...cart.items]
  receiptSubtotal.value = cart.subtotal
  receiptTax.value = cart.tax
  receiptTotal.value = cart.total
  orderNumber.value = 'ORD-' + Date.now().toString().slice(-6)
  const methodName = paymentMethods.find(m => m.id === selectedMethod.value)?.name || selectedMethod.value
  try {
    // recordSale guarda la venta, la API descuenta el stock y el store lo refleja localmente
    await gym.recordSale({
      date: new Date().toISOString().split('T')[0],
      client_name: form.value.name,
      items: receiptItems.value.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      total: receiptTotal.value,
      method: methodName,
    })
  } catch (err) {
    toast.error('No se pudo registrar la compra: ' + err.message)
    return
  }
  cart.clear()
  step.value = 3
  toast.success('¡Compra realizada exitosamente!')
  setTimeout(() => toast.success('Notificación enviada al encargado'), 800)
}
</script>

<style scoped>
.payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.payment-option {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); cursor: pointer;
  transition: var(--transition); margin-bottom: 8px;
}
.payment-option:hover { border-color: var(--accent); }
.payment-option.active { border-color: var(--accent); background: rgba(59,130,246,0.08); box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
.bank-detail { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.85rem; border-bottom: 1px solid rgba(59,130,246,0.1); }
.summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.9rem; color: var(--text-secondary); }
.summary-row.total { border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 8px; font-size: 1.15rem; font-weight: 700; color: var(--cyan-light); }
.receipt-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem; }
@media (max-width: 768px) { .payment-grid { grid-template-columns: 1fr; } }
</style>
