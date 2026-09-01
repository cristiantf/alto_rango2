# Guía de Instalación: ESP32 en Arduino IDE

Esta guía te ayudará a configurar tu entorno de Arduino IDE para compilar y subir el código `puertagym.ino` a tu placa **ESP32 DevKit V1 de 30 pines**.

---

## 🛠️ Paso 1: Instalar la Placa ESP32 en Arduino IDE

Por defecto, Arduino IDE no reconoce las placas ESP32. Debemos agregar el soporte oficial de Espressif.

1. Abre **Arduino IDE**.
2. Ve a la barra de menú superior: **Archivo (File) > Preferencias (Preferences)**.
3. En la ventana que se abre, busca el campo llamado **"Gestor de URLs Adicionales de Tarjetas"** (Additional Boards Manager URLs).
4. Copia y pega el siguiente enlace exacto en ese campo:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
   *(Si ya tenías otro enlace, pon una coma `,` al final del existente y pega este a continuación).*
5. Haz clic en **OK** para cerrar las preferencias.

---

## 🗂️ Paso 2: Descargar el paquete de la Placa

1. Ve al menú de la izquierda (en Arduino IDE v2) y haz clic en el ícono del **Gestor de Tarjetas (Boards Manager)**, o en la barra superior ve a **Herramientas > Placa > Gestor de Tarjetas**.
2. En la barra de búsqueda, escribe: `esp32`
3. Aparecerá un paquete llamado **"esp32 by Espressif Systems"**.
4. Haz clic en el botón **Instalar** (Install). *(Nota: Pesa alrededor de 300MB, así que tomará un par de minutos dependiendo de tu internet).*

---

## 🔌 Paso 3: Seleccionar tu Placa y Puerto

Una vez instalado el paquete, debes decirle a Arduino qué placa específica tienes conectada.

1. Conecta tu ESP32 por cable USB a la computadora.
2. Ve a **Herramientas (Tools) > Placa (Board) > esp32**.
3. En la larga lista que aparece, busca y selecciona:
   **DOIT ESP32 DEVKIT V1** *(Si no funciona, intenta con "ESP32 Dev Module")*.
4. Ve a **Herramientas > Puerto (Port)** y selecciona el puerto COM que haya aparecido (Ej: `COM3`, `COM5`). Si no te aparece ninguno, es posible que necesites instalar el driver USB "CP2102" o "CH340" (dependiendo de tu ESP32).

---

## 📚 Paso 4: Instalar las Librerías Necesarias

Nuestro código utiliza la librería `WiFiManager` para levantar el portal cautivo cuando se pierde la conexión a internet.

1. Abre el **Gestor de Librerías (Library Manager)** haciendo clic en el ícono de los libros a la izquierda (o en *Programa > Incluir Librería > Administrar Bibliotecas*).
2. En la barra de búsqueda escribe: `WiFiManager`
3. Busca la librería que se llame **WiFiManager** cuyo autor sea **tzapu**.
4. Haz clic en **Instalar**.

*(Las demás librerías como `WiFi.h`, `HTTPClient.h` y `WiFiClientSecure.h` ya vienen preinstaladas con el paquete del ESP32 que bajaste en el Paso 2).*

---

## 🚀 Paso 5: Compilar y Subir el Código

1. Abre tu archivo `puertagym.ino` en Arduino IDE.
2. Presiona el botón circular con la flecha hacia la derecha (▶️) en la parte superior izquierda de la pantalla para **Subir (Upload)**.
3. El programa compilará.
4. **IMPORTANTE:** Cuando veas que en la consola inferior dice `Connecting... _ _ _`, **mantén presionado el botón físico llamado "BOOT" en tu placa ESP32** durante 2 segundos hasta que veas que empieza a subir un porcentaje. *(Algunos cables/placas no requieren esto, pero si te da error de conexión, es la solución).*
5. Una vez que diga "Done uploading", ¡listo! Tu ESP32 ya tiene el sistema de Alto Rango instalado.
