<template>
  <div class="login-page">
    <div class="login-bg"></div>
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <img src="/logo.jpeg" alt="Alto Rango" style="display: block; height: 80px; margin: 0 auto 12px; object-fit: contain; border-radius: 8px;" />
          <h1>Alto Rango</h1>
          <p>Gym &amp; Suplementos · www.altorango.com</p>
        </div>
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label>Correo electrónico</label>
            <input id="login-email" v-model="email" type="email" placeholder="admin@altorango.com" required />
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input id="login-password" v-model="password" type="password" placeholder="••••••••" required />
          </div>
          <button id="login-submit" type="submit" class="btn btn-primary btn-lg" style="width:100%">
            Iniciar Sesión
          </button>
          
          <div style="text-align: center; margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" @click="router.push('/public-store')" style="background: transparent; border-color: var(--border-color);">
              🛒 Ver Tienda Online
            </button>
          </div>

          <div class="login-hint">
            <p><strong>Demo:</strong></p>
            <p>Admin: admin_norte@altorango.com / 123456</p>
            <p>Empleado: empleado_norte@altorango.com / 123456</p>
            <p>Usuario: usuario_norte@altorango.com / 123456</p>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Registro de Usuario (RF-021, RF-020) -->
    <div v-if="showRegisterModal" class="modal-overlay" @click.self="showRegisterModal = false">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2>Registro de Cliente</h2>
          <button class="modal-close-btn" @click="showRegisterModal = false">✕</button>
        </div>
        <form @submit.prevent="handleRegister" class="login-form" style="margin-top: 16px;">
          <div class="form-group">
            <label>Nombre Completo</label>
            <input v-model="regName" type="text" placeholder="Ej: Juan Pérez" required />
          </div>
          <div class="form-group">
            <label>Correo electrónico</label>
            <input v-model="regEmail" type="email" placeholder="tuemail@ejemplo.com" required />
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input v-model="regPassword" type="password" placeholder="••••••••" required />
          </div>
          <div class="form-group">
            <label>Sede (Gimnasio)</label>
            <select v-model="regTenantId">
              <option value="1">Alto Rango Norte</option>
              <option value="2">Alto Rango Sur</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%; margin-top: 16px;" :disabled="loadingReg">
            {{ loadingReg ? 'Registrando...' : 'Completar Registro' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const email = ref('admin_norte@altorango.com')
const password = ref('123456')
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const showRegisterModal = ref(false)
const regName = ref('')
const regEmail = ref('')
const regPassword = ref('')
const regTenantId = ref('1')
const loadingReg = ref(false)

async function handleLogin() {
  const ok = await auth.login(email.value, password.value)
  if (ok) {
    toast.success(`¡Bienvenido a Alto Rango! (${auth.userRoleLabel})`)
    router.push(auth.isUsuario ? '/asistencia' : '/')
  } else {
    toast.error('Credenciales incorrectas o usuario inactivo')
  }
}

async function handleRegister() {
  loadingReg.value = true
  try {
    const res = await fetch('http://localhost:8000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: Number(regTenantId.value),
        name: regName.value,
        email: regEmail.value,
        password: regPassword.value
      })
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Registro exitoso. Ahora puedes iniciar sesión.')
      showRegisterModal.value = false
      email.value = regEmail.value
      password.value = regPassword.value
      regName.value = ''
      regEmail.value = ''
      regPassword.value = ''
    } else {
      toast.error(data.error || 'Error al registrarse')
    }
  } catch (e) {
    toast.error('Error de conexión con el servidor')
  } finally {
    loadingReg.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}
.login-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(6,182,212,0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 60%);
}
.login-container { position: relative; z-index: 1; width: 100%; max-width: 440px; padding: 20px; }
.login-card {
  background: rgba(12,20,37,0.9);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 48px 40px;
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-lg), 0 0 60px rgba(59,130,246,0.1);
}
.login-header { text-align: center; margin-bottom: 36px; }
.login-header h1 {
  font-family: var(--font-display); font-size: 2.2rem; font-weight: 800;
  background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.login-header p { color: var(--text-muted); font-size: 0.9rem; margin-top: 4px; }
.login-form { display: flex; flex-direction: column; gap: 4px; }
.login-hint {
  text-align: center; font-size: 0.78rem; color: var(--text-muted); margin-top: 16px;
  line-height: 1.5;
}
.login-hint strong { color: var(--text-secondary); }
</style>
