<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>🏷️ Promociones y Descuentos</h1>
        <p class="page-subtitle">Administra los descuentos activos (RF-005)</p>
      </div>
      <button class="btn btn-primary" @click="showModal = true">➕ Nueva Promoción</button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descuento (%)</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in gym.promotions" :key="p.id">
            <td><strong>{{ p.name }}</strong></td>
            <td>{{ p.discount_percentage }}%</td>
            <td>{{ p.start_date ? new Date(p.start_date + 'T00:00:00').toLocaleDateString('es-EC') : 'N/A' }}</td>
            <td>{{ p.end_date ? new Date(p.end_date + 'T00:00:00').toLocaleDateString('es-EC') : 'N/A' }}</td>
            <td>
              <span class="badge" :class="p.is_active ? 'badge-success' : 'badge-danger'">
                {{ p.is_active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Nueva Promoción</h2>
          <button class="modal-close-btn" @click="showModal = false">✕</button>
        </div>
        <div style="padding:20px;text-align:center">Formulario en construcción</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useGymStore } from '../stores/gym'
const gym = useGymStore()
const showModal = ref(false)
</script>
