/**
 * PROYECTO: CONTROL DE ACCESO ALTO RANGO SAAS — Versión ESP8266 (NodeMCU / Wemos D1 mini)
 *
 * Cómo se abre la puerta (dos vías, la que llegue primero):
 *  1. MQTT (principal, instantánea): el frontend publica "abrir" en MQTT_TOPIC
 *     (ver src/stores/gym.js -> sendMqttOpen). Mismo canal que docs/puertagym.ino (ESP32).
 *  2. Polling HTTP (respaldo): Laravel marca access_control_state.pending_open = 1
 *     en POST /attendance/check-access y /attendance/direct-open. Cada POLL_MS se consulta
 *     GET /attendance/check-door -> {"open": true|false}.
 *  Tras cualquier apertura se llama a GET /attendance/door-opened para poner pending_open = 0,
 *  así la vía de respaldo no vuelve a abrir la puerta por la misma orden.
 *
 * Librerías (Gestor de librerías del Arduino IDE):
 *  - WiFiManager (tzapu)
 *  - PubSubClient (Nick O'Leary)
 *  Placa: "NodeMCU 1.0 (ESP-12E Module)" del paquete esp8266 de la comunidad.
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <WiFiManager.h>
#include <PubSubClient.h>

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
// API de Laravel (misma URL base que VITE_API_URL en el frontend)
const char* API_BASE = "https://altorangogym.com/api";

// MQTT — debe coincidir con src/stores/gym.js
const char* MQTT_SERVER = "broker.emqx.io";
const int   MQTT_PORT   = 1883;
const char* MQTT_TOPIC  = "altorango/gym/puerta/comando_secreto_777";

// Portal WiFiManager (si no hay WiFi guardado)
const char* AP_NAME = "Gym_Puerta_Setup";
const char* AP_PASS = "admin1234";

// ============================================================================
// PINES Y TIEMPOS
// ============================================================================
const int  RELAY_PIN      = 5;      // D1 (GPIO5) en NodeMCU
const bool RELAY_ACTIVO_LOW = true; // true si el relé se activa con LOW (módulos más comunes)
const int  LED_PIN        = LED_BUILTIN; // GPIO2, se enciende con LOW

const unsigned long PUERTA_ABIERTA_MS   = 3000;  // tiempo que la cerradura queda liberada
const unsigned long POLL_MS             = 3000;  // cada cuánto se consulta check-door
const unsigned long MQTT_REINTENTO_MS   = 5000;  // espera entre reintentos MQTT
const unsigned long TIMEOUT_PORTAL_S    = 180;   // portal WiFi: segundos antes de reiniciar
const uint16_t      HTTP_TIMEOUT_MS     = 5000;

// ============================================================================
// ESTADO
// ============================================================================
WiFiClient   mqttNet;
PubSubClient mqtt(mqttNet);

bool          puertaAbierta   = false;
bool          ackPendiente    = false;  // hay que avisar a Laravel que ya abrimos
unsigned long msApertura      = 0;
unsigned long msUltimoPoll    = 0;
unsigned long msUltimoIntento = 0;

// ============================================================================
// RELÉ
// ============================================================================
void escribirRele(bool activo) {
  digitalWrite(RELAY_PIN, (activo == RELAY_ACTIVO_LOW) ? LOW : HIGH);
  digitalWrite(LED_PIN, activo ? LOW : HIGH);
}

void abrirPuerta(const char* origen) {
  ackPendiente = true;          // en cualquier caso, limpiar pending_open en el servidor
  if (puertaAbierta) {
    msApertura = millis();      // ya estaba abierta: solo extender el tiempo
    return;
  }
  Serial.print(F("🔓 PUERTA ABIERTA ("));
  Serial.print(origen);
  Serial.println(F(")"));
  escribirRele(true);
  puertaAbierta = true;
  msApertura = millis();
}

void revisarCierre() {
  if (puertaAbierta && millis() - msApertura >= PUERTA_ABIERTA_MS) {
    escribirRele(false);
    puertaAbierta = false;
    Serial.println(F("🔒 Cerradura bloqueada."));
  }
}

// ============================================================================
// HTTP (Laravel)
// ============================================================================
// Devuelve el código HTTP (o negativo si falla) y deja el cuerpo en `cuerpo`.
int httpGet(const String& ruta, String& cuerpo) {
  std::unique_ptr<BearSSL::WiFiClientSecure> cliente(new BearSSL::WiFiClientSecure);
  // Sin verificación de certificado: más simple para un ESP8266, pero acepta cualquier
  // servidor. Para mayor seguridad usa cliente->setFingerprint("AA BB ...") del certificado.
  cliente->setInsecure();
  cliente->setBufferSizes(1024, 512); // reduce RAM del handshake TLS

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(*cliente, String(API_BASE) + ruta)) {
    return -1;
  }
  http.addHeader("Accept", "application/json");
  int codigo = http.GET();
  if (codigo > 0) {
    cuerpo = http.getString();
  }
  http.end();
  return codigo;
}

// Le dice a Laravel que la puerta ya se abrió (pending_open = 0).
void enviarAck() {
  String cuerpo;
  int codigo = httpGet("/attendance/door-opened", cuerpo);
  if (codigo == 200) {
    ackPendiente = false;
  } else {
    Serial.print(F("⚠️ door-opened falló, código "));
    Serial.println(codigo);
  }
}

// Respaldo: consulta si hay una apertura pendiente.
void pollPuerta() {
  String cuerpo;
  int codigo = httpGet("/attendance/check-door", cuerpo);
  if (codigo != 200) {
    Serial.print(F("⚠️ check-door falló, código "));
    Serial.println(codigo);
    return;
  }
  // Respuesta esperada: {"open":true} o {"open":false}
  cuerpo.replace(" ", "");
  if (cuerpo.indexOf("\"open\":true") >= 0) {
    abrirPuerta("HTTP");
  }
}

// ============================================================================
// MQTT
// ============================================================================
void alRecibirMqtt(char* topic, byte* payload, unsigned int length) {
  String mensaje;
  mensaje.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    mensaje += (char)payload[i];
  }
  Serial.print(F("Mensaje MQTT: "));
  Serial.println(mensaje);
  if (mensaje == "abrir") {
    abrirPuerta("MQTT");
  }
}

// Un solo intento, sin bloquear el loop.
void intentarMqtt() {
  String clientId = "ESP8266-AltoRango-" + String(ESP.getChipId(), HEX);
  Serial.print(F("Conectando MQTT... "));
  if (mqtt.connect(clientId.c_str())) {
    mqtt.subscribe(MQTT_TOPIC);
    Serial.println(F("conectado y suscrito."));
  } else {
    Serial.print(F("falló, rc="));
    Serial.println(mqtt.state());
  }
}

// ============================================================================
// SETUP / LOOP
// ============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println();

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  escribirRele(false); // cerradura bloqueada al arrancar

  WiFiManager wm;
  // wm.resetSettings(); // descomenta para borrar el WiFi guardado
  wm.setConfigPortalTimeout(TIMEOUT_PORTAL_S);
  Serial.println(F("Conectando a WiFi..."));
  if (!wm.autoConnect(AP_NAME, AP_PASS)) {
    Serial.println(F("❌ Timeout WiFi. Reiniciando en 3s..."));
    delay(3000);
    ESP.restart();
  }
  WiFi.setAutoReconnect(true);
  Serial.print(F("✅ WiFi conectado. IP: "));
  Serial.println(WiFi.localIP());

  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(alRecibirMqtt);

  // Una orden antigua pendiente en la BD no debe abrir la puerta al encender.
  enviarAck();
}

void loop() {
  unsigned long ahora = millis();

  revisarCierre();

  if (WiFi.status() != WL_CONNECTED) {
    return; // WiFi.setAutoReconnect se encarga; el relé sigue cerrándose a tiempo
  }

  // MQTT (vía principal)
  if (!mqtt.connected()) {
    if (ahora - msUltimoIntento >= MQTT_REINTENTO_MS) {
      msUltimoIntento = ahora;
      intentarMqtt();
    }
  } else {
    mqtt.loop();
  }

  // HTTP cada POLL_MS: primero confirmar aperturas, luego consultar el respaldo.
  // (Si se abrió por MQTT y el poll llega antes del ack, solo extiende el tiempo abierto.)
  if (ahora - msUltimoPoll >= POLL_MS) {
    msUltimoPoll = ahora;
    if (ackPendiente) {
      enviarAck();
    }
    pollPuerta();
  }

  revisarCierre();
}
