# Guía Definitiva: Despliegue en cPanel y Creación de APK (Capacitor)

Esta guía detalla los pasos para llevar tu proyecto "Alto Rango" a producción: hospedar el sistema web en cPanel y generar la aplicación móvil Android usando Capacitor.

---

## PARTE 1: Despliegue en cPanel (Web y API)

Dado que tenemos una arquitectura separada (Backend en Laravel y Frontend en Vue), debemos alojarlos de manera segura.

### 1.1 Preparar y subir el Backend (Laravel)
1. **Comprimir Backend:** En tu computadora, ve a la carpeta `backend/` y crea un archivo ZIP de todo su contenido (excluye las carpetas `vendor` y `node_modules` para que pese menos).
2. **Subir a cPanel:**
   - Abre el **Administrador de Archivos** en cPanel.
   - Crea una carpeta *fuera* de `public_html` llamada `backend_altorango` (Ej: `/home/tuusuario/backend_altorango`). Esto es crucial por seguridad.
   - Sube el ZIP allí y extráelo.
3. **Instalar dependencias (Terminal cPanel):**
   - Abre la herramienta **Terminal** en cPanel.
   - Ejecuta: `cd backend_altorango`
   - Ejecuta: `composer install --no-dev --optimize-autoloader`
4. **Base de Datos:**
   - En cPanel, ve a **Bases de Datos MySQL** y crea una base de datos, un usuario y asígnales todos los privilegios.
   - Ve a **phpMyAdmin**, selecciona la base de datos y pulsa **Importar** para subir tu archivo SQL de la base de datos (con todas las tablas corregidas).
5. **Configurar `.env`:**
   - En tu carpeta `backend_altorango`, edita el archivo `.env`.
   - Cambia `APP_ENV=production` y `APP_DEBUG=false`.
   - Actualiza los datos de la base de datos (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).
   - Actualiza `APP_URL=https://altorangogym.com/api`.
6. **Enlazar el public de Laravel con cPanel:**
   - Mueve todo el contenido de la carpeta `/home/tuusuario/backend_altorango/public/` hacia una nueva carpeta dentro de tu dominio, por ejemplo `/home/tuusuario/public_html/api/`.
   - Edita el archivo `index.php` que moviste a `public_html/api/` y cambia las rutas para que apunten a la carpeta oculta:
     ```php
     require __DIR__.'/../../backend_altorango/vendor/autoload.php';
     $app = require_once __DIR__.'/../../backend_altorango/bootstrap/app.php';
     ```

### 1.2 Preparar y subir el Frontend (Vue)
1. **Actualizar Rutas:** En tu computadora, abre tu proyecto Vue y asegúrate de que tus archivos apunten a la API de producción. (Ej: en `gym.js` u otros lugares, la URL debe ser `https://altorangogym.com/api`).
2. **Construir el código (Build):**
   - En la terminal de VSCode (en la raíz del proyecto Vue), ejecuta:
     ```bash
     npm run build
     ```
   - Esto creará una carpeta llamada `dist/` con archivos HTML, CSS y JS optimizados.
3. **Subir a cPanel:**
   - Sube el *contenido* de la carpeta `dist/` a tu carpeta `public_html/` en cPanel (en la raíz del dominio).
   - ¡Listo! Si entras a `https://altorangogym.com` deberías ver tu panel y debería poder iniciar sesión conectándose a Laravel.

---

## PARTE 2: Crear la App Móvil con Capacitor y Android Studio

Capacitor tomará el código web que construimos con Vue y lo convertirá en una aplicación nativa para Android.

### 2.1 Requisitos Previos
- Tener instalado **Android Studio**.
- Tener instalados los SDKs de Android desde Android Studio.

### 2.2 Instalar Capacitor en tu proyecto Vue
Abre tu terminal en VSCode, en la carpeta raíz del proyecto frontend (donde está `package.json`) y ejecuta:

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
```

### 2.3 Inicializar Capacitor
```bash
npx cap init
```
- **Name:** Alto Rango (El nombre de tu app)
- **App ID:** com.altorango.gym (El identificador único, estilo dominio inverso)
- **Web asset directory:** `dist` (Muy importante: aquí Capacitor buscará tu código compilado).

### 2.4 Agregar Plataforma Android
```bash
npm install @capacitor/android
npx cap add android
```

### 2.5 Sincronizar el Código
Cada vez que hagas un cambio en Vue o cambies algún color/funcionalidad, debes seguir estos dos pasos para actualizar el código en el móvil:
```bash
npm run build
npx cap sync
```

*(Esto copia tu carpeta `dist/` recién horneada hacia la carpeta nativa de Android).*

### 2.6 Compilar el APK en Android Studio
1. Para abrir tu proyecto directamente en Android Studio desde la consola, ejecuta:
   ```bash
   npx cap open android
   ```
2. Android Studio se abrirá y comenzará a indexar el proyecto (esto puede tardar unos minutos la primera vez, deja que termine la barra de carga en la parte inferior derecha).
3. **Generar el APK:**
   - En el menú superior de Android Studio, ve a **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Android Studio empezará a compilar. Cuando termine, aparecerá un mensaje flotante abajo a la derecha diciendo "APK(s) generated successfully".
   - Haz clic en **locate** en ese mensaje.
   - ¡Te abrirá una carpeta que contiene tu archivo `app-debug.apk`! 

Ese archivo `.apk` ya puedes pasarlo a tu celular Android, instalarlo, y usar el sistema de Alto Rango como una aplicación móvil real.
