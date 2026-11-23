<template>
  <div class="routines-view">
    <div class="page-header">
      <div>
        <h1>🏋️ Rutinas de Entrenamiento</h1>
        <p class="page-subtitle">Gestiona y consulta las rutinas disponibles</p>
      </div>
      <button class="btn btn-primary" @click="showModal = true" v-if="auth.isAdmin">
        + Nueva Rutina
      </button>
    </div>

    <div class="routines-grid">
      <div v-for="routine in gym.routines" :key="routine.id" class="card routine-card">
        <h3>{{ routine.name }}</h3>
        <span class="badge badge-info">{{ routine.level }}</span>
        <p class="routine-desc">{{ routine.description }}</p>
        <div class="routine-ex">
          <strong>Ejercicios:</strong>
          <ul>
            <li v-for="(ex, i) in routine.exercises" :key="i">{{ ex }}</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="!gym.routines.length" class="empty-state">
      <div class="empty-icon">🏋️</div>
      <p>No hay rutinas registradas aún.</p>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Crear Nueva Rutina</h2>
          <button class="modal-close-btn" @click="showModal = false">✕</button>
        </div>
        <div class="form-group">
          <label>Nombre de la Rutina</label>
          <input v-model="newRoutine.name" placeholder="Ej: Full Body Principiantes">
        </div>
        <div class="form-group">
          <label>Nivel</label>
          <select v-model="newRoutine.level">
            <option>Principiante</option>
            <option>Intermedio</option>
            <option>Avanzado</option>
          </select>
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <textarea v-model="newRoutine.description" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>Ejercicios (uno por línea)</label>
          <textarea v-model="newRoutine.exercisesText" rows="4" placeholder="Sentadillas 4x12..."></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveRoutine">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useGymStore } from '../stores/gym'
import { useToastStore } from '../stores/toast'

const auth = useAuthStore()
const gym = useGymStore()
const toast = useToastStore()

const showModal = ref(false)
const newRoutine = ref({
  name: '',
  level: 'Principiante',
  description: '',
  exercisesText: '',
})

async function saveRoutine() {
  if (!newRoutine.value.name) return
  try {
    await gym.addRoutine({
      name: newRoutine.value.name,
      level: newRoutine.value.level,
      description: newRoutine.value.description,
      exercises: newRoutine.value.exercisesText.split('\n').filter(e => e.trim()),
    })
  } catch (err) {
    toast.error('No se pudo crear la rutina: ' + err.message)
    return
  }
  showModal.value = false
  newRoutine.value = { name: '', level: 'Principiante', description: '', exercisesText: '' }
  toast.success('Rutina creada')
}
</script>

<style scoped>
.routines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.routine-card h3 { margin-bottom: 8px; }
.routine-desc { margin-top: 12px; color: var(--text-muted); font-size: 0.9rem; }
.routine-ex { margin-top: 16px; font-size: 0.9rem; }
.routine-ex ul { padding-left: 20px; margin-top: 8px; color: var(--text-secondary); }
</style>
