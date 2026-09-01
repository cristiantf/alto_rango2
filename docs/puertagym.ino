/**
 * PROYECTO: CONTROL DE ACCESO ALTO RANGO SAAS
 * HARDWARE: ESP32 DevKit V1 (30 pines)
 * 
 * CARACTERÍSTICAS:
 *  - WiFiManager con Timeout (Evita cuelgues tras apagones)
 *  - Reconexión automática si el router demora
 *  - Polling HTTPS seguro y no bloqueante a cPanel
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>

// ============================================================================
// CONFIGURACIÓN 
// ============================================================================
const char* HOST_URL = "https://altorangogym.com";

// PINES
const int RELAY_PIN = 26;           // D26 — Relé de cerradura eléctrica
const int LED_PIN   = 2;            // LED integrado del ESP32

// TIEMPOS (milisegundos)
const unsigned long PUERTA_ABIERTA_MS = 3000;  // Tiempo con puerta abierta
const unsigned long POLLING_MS        = 2000;  // Intervalo de consulta a la nube
const unsigned long TIMEOUT_WIFI_MS   = 180;   // Segundos antes de reiniciar si no hay WiFi

// VARIABLES DE ESTADO
unsigned long msRelay  = 0;
unsigned long msPoll   = 0;
bool puertaAbierta     = false;

// Cliente seguro para cPanel (HTTPS)
WiFiClientSecure clientSecure;

// ============================================================================
// SETUP — Inicialización del sistema
// ============================================================================
void setup() {
  Serial.begin(115200);
  
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Relé apagado (Normalmente Cerrado)
  digitalWrite(LED_PIN, LOW);    // LED apagado
  
  // 1. Configuración de WiFiManager
  WiFiManager wm;
  
  // Si en 3 minutos (180s) no se configura o no encuentra el WiFi conocido, 
  // el ESP32 se reinicia automáticamente (ideal para apagones).
  wm.setConfigPortalTimeout(TIMEOUT_WIFI_MS);
  
  Serial.println(F("Conectando a WiFi..."));
  
  if (!wm.autoConnect("Gimnasio_AltoRango", "admin1234")) {
    Serial.println(F("❌ Timeout WiFi. El router aún no arranca. Reiniciando en 3s..."));
    delay(3000);
    ESP.restart(); // Al reiniciar, volverá a intentar la conexión
  }

  // Si llega aquí, es porque ya se conectó
  WiFi.setAutoReconnect(true);

  Serial.println(F("\n✅ WiFi conectado exitosamente."));
  Serial.print(F("IP Local: "));
  Serial.println(WiFi.localIP());

  // Ignorar validación de certificado SSL estricta (útil para cPanel)
  clientSecure.setInsecure(); 
}

// ============================================================================
// LOOP PRINCIPAL — Ciclo no bloqueante
// ============================================================================
void loop() {
  unsigned long now = millis();

  // --- 1. Temporizador de cierre de puerta ---
  if (puertaAbierta && (now - msRelay >= PUERTA_ABIERTA_MS)) {
    digitalWrite(RELAY_PIN, HIGH); // Apaga el relé
    digitalWrite(LED_PIN, LOW);    // Apaga el LED
    puertaAbierta = false;
    Serial.println(F("🔒 Cerradura bloqueada."));
  }

  // --- 2. Tareas de nube (solo con WiFi) ---
  if (WiFi.status() == WL_CONNECTED) {
    
    // Polling a cPanel (cada 2 segundos)
    if (now - msPoll >= POLLING_MS) {
      consultarPuertaNube();
      msPoll = now;
    }
    
  } else {
    // Opcional: Parpadear LED si se pierde WiFi
  }
}

// ============================================================================
// COMUNICACIÓN CON CPANEL (HTTPS POLLING)
// ============================================================================

void consultarPuertaNube() {
  HTTPClient http;
  String url = String(HOST_URL) + "/api/attendance/check-door";
  
  http.begin(clientSecure, url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String resp = http.getString();
    
    // Validamos si la nube nos manda a abrir
    if (resp.indexOf("\"open\":true") > 0 || resp.indexOf("\"open\": true") > 0) {
       Serial.println(F("☁️ Comando de apertura recibido de cPanel."));
       abrirPuerta();
       confirmarAperturaNube();
    }
  } else if (httpCode > 0) {
    Serial.printf("⚠️ Respuesta HTTP inusual: %d\n", httpCode);
  } else {
    Serial.printf("❌ Error de conexión: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void confirmarAperturaNube() {
  HTTPClient http;
  String url = String(HOST_URL) + "/api/attendance/door-opened";
  
  http.begin(clientSecure, url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    Serial.println(F("✅ Confirmación enviada a cPanel exitosamente."));
  }
  http.end();
}

// ============================================================================
// ACCIÓN DE HARDWARE
// ============================================================================

void abrirPuerta() {
  if (!puertaAbierta) {
    Serial.println(F("🔓 PUERTA ABIERTA"));
    digitalWrite(RELAY_PIN, LOW); // Activa el relé
    digitalWrite(LED_PIN, HIGH);  // Enciende el LED indicador
    puertaAbierta = true;
    msRelay = millis(); // Reinicia el contador de cierre
  }
}
