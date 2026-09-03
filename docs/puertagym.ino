/**
 * PROYECTO: CONTROL DE ACCESO ALTO RANGO SAAS (MQTT Version)
 * HARDWARE: ESP32 DevKit V1 (30 pines)
 * 
 * CARACTERÍSTICAS:
 *  - WiFiManager con Timeout (Evita cuelgues tras apagones)
 *  - Conexión MQTT (broker.emqx.io) en vez de HTTP Polling
 *  - Apertura instantánea, sin bloqueos de firewall
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h> // LIBRERIA REQUERIDA (Instalar desde el gestor de librerías)

// ============================================================================
// CONFIGURACIÓN MQTT
// ============================================================================
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;

// ⚠️ Este "topic" debe ser el mismo que uses en el Frontend de Vue.js
const char* mqtt_topic_puerta = "altorango/gym/puerta/comando_secreto_777"; 

// ============================================================================
// PINES Y TIEMPOS
// ============================================================================
const int RELAY_PIN = 26;           // D26 — Relé de cerradura eléctrica
const int LED_PIN   = 2;            // LED integrado del ESP32
const unsigned long PUERTA_ABIERTA_MS = 3000;  
const unsigned long TIMEOUT_WIFI_MS   = 180;   

// ============================================================================
// VARIABLES DE ESTADO
// ============================================================================
unsigned long msRelay = 0;
bool puertaAbierta    = false;

WiFiClient espClient;
PubSubClient client(espClient);

// ============================================================================
// FUNCIONES DE CONTROL
// ============================================================================

void abrirPuerta() {
  if (!puertaAbierta) {
    Serial.println(F("🔓 PUERTA ABIERTA"));
    digitalWrite(RELAY_PIN, LOW); // Activa el relé
    digitalWrite(LED_PIN, HIGH);  // Enciende el LED indicador
    puertaAbierta = true;
    msRelay = millis(); 
  }
}

// Se ejecuta cada vez que recibimos un mensaje MQTT en el topic suscrito
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Mensaje recibido [");
  Serial.print(topic);
  Serial.print("]: ");
  
  String mensaje = "";
  for (int i = 0; i < length; i++) {
    mensaje += (char)payload[i];
  }
  Serial.println(mensaje);

  // Si el mensaje es "abrir", abrimos la puerta
  if (mensaje == "abrir") {
    abrirPuerta();
  }
}

void reconnect() {
  // Bucle hasta que estemos reconectados al broker MQTT
  while (!client.connected()) {
    Serial.print(F("Intentando conexión MQTT..."));
    
    // Crear un ID de cliente aleatorio para evitar colisiones
    String clientId = "ESP32-AltoRango-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println(F("conectado!"));
      // Nos suscribimos al canal (topic)
      client.subscribe(mqtt_topic_puerta);
      Serial.println(F("Suscrito al canal de apertura. Esperando ordenes..."));
    } else {
      Serial.print(F("falló, rc="));
      Serial.print(client.state());
      Serial.println(F(" intentando de nuevo en 5 segundos"));
      delay(5000);
    }
  }
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Relé apagado (NC)
  digitalWrite(LED_PIN, LOW);    
  
  // WiFiManager
  WiFiManager wm;
  wm.setConfigPortalTimeout(TIMEOUT_WIFI_MS);
  
  Serial.println(F("Conectando a WiFi..."));
  if (!wm.autoConnect("Gimnasio_AltoRango", "admin1234")) {
    Serial.println(F("❌ Timeout WiFi. Reiniciando en 3s..."));
    delay(3000);
    ESP.restart();
  }

  WiFi.setAutoReconnect(true);
  Serial.println(F("\n✅ WiFi conectado."));
  Serial.print(F("IP Local: "));
  Serial.println(WiFi.localIP());

  // Configurar MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================
void loop() {
  unsigned long now = millis();

  // Temporizador de cierre
  if (puertaAbierta && (now - msRelay >= PUERTA_ABIERTA_MS)) {
    digitalWrite(RELAY_PIN, HIGH); 
    digitalWrite(LED_PIN, LOW);    
    puertaAbierta = false;
    Serial.println(F("🔒 Cerradura bloqueada."));
  }

  // Mantener conexión MQTT viva
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      reconnect();
    }
    client.loop(); // Escucha mensajes entrantes (Mágico y silencioso)
  }
}
