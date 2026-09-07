# Alto Rango — Gym & Suplementos

Sistema web integral (SaaS) diseñado para la administración operativa, financiera y comercial de centros fitness. El sistema centraliza la gestión de **Alto Rango Gym** (membresías, control de acceso, asistencia) y la tienda **Alto Rango Suplementos** (punto de venta e inventario).

## 🚀 Estado de Despliegue (Producción)

El sistema se encuentra **desplegado y en producción** en: **[https://altorangogym.com](https://altorangogym.com)**

El backend (API REST) y el frontend (SPA) están alojados en un servidor cPanel, con soporte para control de acceso mediante hardware físico (ESP32) configurado por *HTTP Polling*. Adicionalmente, el frontend está configurado con Capacitor para su empaquetado y distribución como aplicación móvil Android (APK).

## Arquitectura del Proyecto

El proyecto se divide en dos capas principales:

### Tech Stack Frontend (App Web & Móvil)
- **Framework Core**: Vue.js 3 (Composition API)
- **Build Tool**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **App Móvil**: Capacitor (para empaquetado APK)

### Tech Stack Backend & API
- **Framework REST API**: Laravel 12
- **Base de Datos**: MySQL (cPanel)
- **Integración Hardware**: ESP32 DevKit V1 (Control de chapa eléctrica vía HTTP Polling)
- **Reconocimiento Facial**: Kiosco web impulsado por IA (`face-api.js`) procesado del lado del cliente.

## Requisitos del Sistema y Entorno Local

- **Node.js**: v18.0.0 o superior recomendado.
- **Gestor de paquetes**: npm o yarn.

### Instalación y Ejecución

1. **Clonar el repositorio** e ingresar al directorio:
   ```bash
   git clone <repo-url>
   cd alto-rango
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   *El servidor se expondrá por defecto en `http://localhost:5173/`.*

4. **Construcción para Producción**:
   ```bash
   npm run build
   ```
   *Los artefactos minificados y optimizados se generarán en el directorio `/dist` y estarán listos para ser desplegados en servicios como Vercel, Netlify o un bucket S3.*

## Módulos del Sistema (Requisitos Funcionales)

El sistema está segmentado en módulos clave que responden directamente a la matriz de requerimientos funcionales (RF):

- **Módulo de Usuarios y Seguridad (RF-001, RF-002)**: Creación y eliminación de usuarios (administradores, empleados, clientes).
- **Control de Acceso y Asistencia (RF-007, RF-008, RF-009)**: Validación de membresías activas en puerta, registro de ingreso y anulación de entradas. Integración planeada para acceso por QR o biometría.
- **Gestión de Membresías y Planes (RF-003, RF-006, RF-010)**: Administración de planes (diario, normal, mensual, personalizado, nutricional), soporte para modalidad pospago por tarjeta (hasta 30 asistencias) y transiciones de membresía.
- **Módulo Financiero y POS (RF-004, RF-005, RF-011)**: Punto de venta integrado para membresías y suplementos, historial de cobros, y aplicación de descuentos y promociones.
- **Inventario y Catálogo (RF-013, RF-014, RF-016)**: Control de stock para la tienda interna y pública (suplementos, bebidas, ropa deportiva) y gestión de activos fijos del gimnasio (máquinas, pesas).
- **Entrenamiento y Rutinas (RF-017)**: Asignación y seguimiento de rutinas de entrenamiento físico (fuerza, hipertrofia, cardio) personalizadas por cliente.
- **Notificaciones (RF-012)**: Alertas push y campana de notificaciones in-app sobre ventas y vencimientos.

## Sistema de Roles y Autenticación (RBAC Demo)

El sistema implementa Control de Acceso Basado en Roles (RBAC). Las siguientes credenciales están preconfiguradas para pruebas funcionales en el prototipo actual:

| Rol | Usuario | Contraseña | Nivel de Acceso |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@altorango.com` | `admin123` | Root. Acceso total a configuración, finanzas, creación de planes, reportes y configuración general del gimnasio. |
| **Empleado/Staff** | `empleado@altorango.com` | `empleado123` | Operativo. Control de acceso, asistencia, módulo de POS (ventas), e inventario. |
| **Cliente/Usuario** | `usuario@altorango.com` | `usuario123` | Restringido. Dashboard personal, historial de asistencia, membresía activa y rutinas asignadas. |

*Nota: La tienda pública no requiere autenticación y se encuentra en la ruta `/#/public-store`.*

## Estructura de Directorios Recomendada

```text
alto-rango/
├── public/                 # Archivos estáticos
├── src/
│   ├── assets/             # Imágenes, estilos globales (CSS/SCSS)
│   ├── components/         # Componentes Vue reutilizables (Botones, Tarjetas, Modales)
│   ├── layouts/            # Plantillas de diseño (AdminLayout, ClientLayout, PublicLayout)
│   ├── pages/              # Vistas principales de la aplicación
│   ├── router/             # Configuración de Vue Router
│   ├── store/              # Módulos de Pinia (Auth, Cart, Users, etc.)
│   └── utils/              # Helpers, formateadores y configuración general
├── vite.config.js          # Configuración del empaquetador
└── package.json            # Dependencias y scripts
```

## Pruebas y Calidad de Código (QA)

Actualmente en el pipeline se tiene proyectado:
- **Linting & Formatting**: Uso de ESLint y Prettier para garantizar la consistencia en el estilo de código.
- **Testing**: Integración futura de Vitest para pruebas unitarias de componentes y Pinia stores, y Cypress para End-to-End (E2E) testing enfocado en flujos críticos como el de ventas (POS) y control de accesos.
