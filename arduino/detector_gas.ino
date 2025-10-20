// Codigo de 20 octubre version 3.0
#include <WiFiS3.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <Servo.h>

// ============================================
// CONFIGURACIÓN WIFI Y FIREBASE
// ============================================
#define WIFI_SSID "OPTI-EE2EC5"
#define WIFI_PASSWORD "Milo2025"

#define API_KEY "AIzaSyCzj116N3yttGaBGFCKAClWWxzmwFAyLL8"
#define DATABASE_URL "https://sdgi-detector-gas-default-rtdb.firebaseio.com/" // ⚠️ NUEVO

// ⚠️ OPCIONAL: Autenticación (más seguro)
// #define USER_EMAIL "tu_email@gmail.com"
// #define USER_PASSWORD "tu_password"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

Servo miServo;
const int SERVO_PIN = 6;

// --- Pines ---
const int MQ2_PIN = A0;
const int MQ2_PIN2 = A3;
const int BUZZER_A0 = 5;
const int BUZZER_A3 = 3;
const int LED_PIN = 7;
const int LED2_PIN = 1;
const int LED3_PIN = 2;

// --- Parámetros ---
const unsigned long CALIBRACION_MS_1 = 10000UL;
const unsigned long CALIBRACION_MS_2 = 20000UL;
int UMBRAL_DELTA = 30;
const float ALPHA = 0.5;
const int HISTERESIS = 12;
const unsigned long CONFIRM_ON_MS = 1000UL;

// Estado de alarma
bool alarma = false;
bool alarmaPiso1 = false;
bool alarmaPiso2 = false;
float baseline = 0.0;
float ema = 0.0;
int muestrasCal = 0;

// Sensor2 variables
float baseline2 = 0.0;
float ema2 = 0.0;
int muestrasCal2 = 0;
bool sensor2_fault = false;

unsigned long inicioCal = 0;
unsigned long posibleEncendidoInicio = 0;
bool servoAbierto = false;

int calib_min_1 = 1024, calib_max_1 = 0;
int calib_min_2 = 1024, calib_max_2 = 0;

// Variables Firebase
unsigned long lastFirebaseUpdate = 0;
const unsigned long FIREBASE_UPDATE_INTERVAL = 5000;
unsigned long lastConfigCheck = 0;
const unsigned long CONFIG_CHECK_INTERVAL = 5000;

// Configuración desde Firebase
bool buzzerPiso1Activo = true;
bool buzzerPiso2Activo = true;
int buzzerVolumen = 255;
bool ledPiso1Activo = true;
bool ledPiso2Activo = true;
bool servoControlRemoto = false;

// Estadísticas
int totalAlertas = 0;
int alertasPiso1 = 0;
int alertasPiso2 = 0;

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  
  pinMode(BUZZER_A0, OUTPUT);
  pinMode(BUZZER_A3, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);

  miServo.attach(SERVO_PIN);
  miServo.write(0);

  digitalWrite(BUZZER_A0, LOW);
  noTone(BUZZER_A3);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  // PRUEBA INICIAL BUZZER PIN 3
  Serial.println("=== PRUEBA: Buzzer pin 3 (2 segundos) ===");
  tone(BUZZER_A3, 2000);
  delay(2000);
  noTone(BUZZER_A3);
  Serial.println("=== FIN PRUEBA ===");

  // Conectar a WiFi
  Serial.println("\n🌐 Conectando a WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado!");
    Serial.print("📡 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ Error al conectar WiFi");
  }

  // Configurar Firebase Realtime Database
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL; // ⚠️ NUEVO
  
  // Autenticación anónima (sin email/password)
  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("🔥 Conectando a Firebase Realtime DB...");
  
  intentos = 0;
  while (!Firebase.ready() && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (Firebase.ready()) {
    Serial.println("\n✅ Firebase Realtime DB conectado!");
    actualizarEstadoDispositivo("online");
    leerConfiguracionFirebase();
  } else {
    Serial.println("\n❌ Error al conectar Firebase");
  }

  // Iniciar calibración
  inicioCal = millis();
  Serial.println("\n🎯 Comenzando calibracion de sensores...");
  Serial.println("Sensor A0 (Piso 1): 10s | Sensor A3 (Piso 2): 20s");
}
// ============================================
// LOOP PRINCIPAL
// ============================================
void loop() {
  int valorGas = analogRead(MQ2_PIN);
  int valorGas2 = analogRead(MQ2_PIN2);
  unsigned long ahora = millis();

  // --- CALIBRACIÓN (igual que antes) ---
  if (ahora - inicioCal < CALIBRACION_MS_2) {
    if (ahora - inicioCal < CALIBRACION_MS_1) {
      baseline = (baseline * muestrasCal + valorGas) / (muestrasCal + 1.0);
      muestrasCal++;
      if (muestrasCal == 1) ema = valorGas;
      if (valorGas < calib_min_1) calib_min_1 = valorGas;
      if (valorGas > calib_max_1) calib_max_1 = valorGas;
    }
    
    baseline2 = (baseline2 * muestrasCal2 + valorGas2) / (muestrasCal2 + 1.0);
    muestrasCal2++;
    if (muestrasCal2 == 1) ema2 = valorGas2;
    if (valorGas2 < calib_min_2) calib_min_2 = valorGas2;
    if (valorGas2 > calib_max_2) calib_max_2 = valorGas2;

    if ((muestrasCal % 10 == 0 && ahora - inicioCal < CALIBRACION_MS_1) || (muestrasCal2 % 20 == 0)) {
      Serial.print("Calibrando... A0: "); Serial.print(baseline);
      Serial.print(" | A3: "); Serial.println(baseline2);
    }

    miServo.write(0);
    delay(200);
    return;
  }

  // --- POST-CALIBRACIÓN ---
  static bool postCalChecked = false;
  if (!postCalChecked) {
    Serial.println("\n✅ Calibración completada!");
    Serial.print("📊 A0 baseline: "); Serial.print(baseline);
    Serial.print(" (rango: "); Serial.print(calib_min_1); 
    Serial.print("-"); Serial.print(calib_max_1); Serial.println(")");
    
    Serial.print("📊 A3 baseline: "); Serial.print(baseline2);
    Serial.print(" (rango: "); Serial.print(calib_min_2); 
    Serial.print("-"); Serial.print(calib_max_2); Serial.println(")");

    int rango2 = calib_max_2 - calib_min_2;
    if (rango2 < 6) {
      sensor2_fault = true;
      Serial.println("⚠️ Sensor A3 defectuoso - será ignorado");
      enviarNotificacion("alerta", "Sensor Piso 2 (A3) defectuoso - verificar conexión");
    } else {
      Serial.println("✅ Ambos sensores OK");
    }
    postCalChecked = true;
  }

  // --- EMA ---
  ema = ALPHA * valorGas + (1 - ALPHA) * ema;
  ema2 = ALPHA * valorGas2 + (1 - ALPHA) * ema2;

  // --- UMBRALES ---
  float umbralOn = baseline + UMBRAL_DELTA;
  float umbralOff = baseline + UMBRAL_DELTA - HISTERESIS;
  float umbralOn2 = baseline2 + UMBRAL_DELTA;
  float umbralOff2 = baseline2 + UMBRAL_DELTA - HISTERESIS;

  // --- CONDICIONES DE DETECCIÓN ---
  bool cond1 = (ema > umbralOn);
  bool cond2 = (!sensor2_fault) && (ema2 > umbralOn2);

  // --- DETECTAR NUEVA ALARMA ---
  bool alarmaAnterior = alarma;
  bool alarmaPiso1Anterior = alarmaPiso1;
  bool alarmaPiso2Anterior = alarmaPiso2;

  alarmaPiso1 = cond1;
  alarmaPiso2 = cond2;
  alarma = alarmaPiso1 || alarmaPiso2;

  // Detectar nueva alarma
  if (alarma && !alarmaAnterior) {
    Serial.println("\n🚨 ¡ALARMA ACTIVADA!");
    totalAlertas++;
    
    if (alarmaPiso1 && !alarmaPiso1Anterior) {
      alertasPiso1++;
      Serial.println("📍 PISO 1 - Gas detectado");
      enviarNotificacion("alerta", "Gas detectado en Piso 1 - Nivel: " + String((int)ema));
    }
    
    if (alarmaPiso2 && !alarmaPiso2Anterior) {
      alertasPiso2++;
      Serial.println("📍 PISO 2 - Gas detectado");
      enviarNotificacion("alerta", "Gas detectado en Piso 2 - Nivel: " + String((int)ema2));
    }
    
    actualizarEstadisticas();
  }

  // Apagar alarma
  if (!alarma && alarmaAnterior) {
    Serial.println("\n✅ Alarma detenida - niveles normales");
  }

  // --- CONTROL DE ACTUADORES ---
  controlarActuadores(cond1, cond2);

  // --- LEER CONFIGURACIÓN DE FIREBASE ---
  if (ahora - lastConfigCheck > CONFIG_CHECK_INTERVAL) {
    leerConfiguracionFirebase();
    lastConfigCheck = ahora;
  }

  // --- ENVIAR DATOS A FIREBASE ---
  if (ahora - lastFirebaseUpdate > FIREBASE_UPDATE_INTERVAL) {
    enviarDatosFirebase(valorGas, valorGas2);
    lastFirebaseUpdate = ahora;
  }

  // --- DEBUG SERIAL ---
  static unsigned long ultimoSerial = 0;
  if (ahora - ultimoSerial > 1000) {
    Serial.print("A0: "); Serial.print(valorGas);
    Serial.print(" ("); Serial.print(cond1 ? "🔴" : "🟢"); Serial.print(")");
    Serial.print(" | A3: "); Serial.print(valorGas2);
    Serial.print(" ("); Serial.print(cond2 ? "🔴" : "🟢"); Serial.print(")");
    Serial.print(" | WiFi: "); Serial.println(WiFi.status() == WL_CONNECTED ? "✓" : "✗");
    ultimoSerial = ahora;
  }

  delay(100);
}
// ============================================
// FUNCIONES FIREBASE REALTIME DATABASE
// ============================================

void enviarDatosFirebase(int sensor1, int sensor2) {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  String path = "/lecturas/" + String(millis());
  
  json.set("valorSensor1", sensor1);
  json.set("valorSensor2", sensor2);
  json.set("sensor1Alerta", alarmaPiso1);
  json.set("sensor2Alerta", alarmaPiso2);
  json.set("dispositivo", "arduino_001");
  json.set("timestamp", (int)millis());

  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.println("📤 Datos enviados a Realtime DB");
  } else {
    Serial.print("❌ Error Firebase: ");
    Serial.println(fbdo.errorReason());
  }
}

void leerConfiguracionFirebase() {
  if (!Firebase.ready()) return;

  // Leer umbral de gas
  if (Firebase.RTDB.getInt(&fbdo, "/configuracion/sistema/umbralGas")) {
    if (fbdo.dataType() == "int") {
      int nuevoUmbral = fbdo.intData();
      if (nuevoUmbral != UMBRAL_DELTA) {
        UMBRAL_DELTA = nuevoUmbral;
        Serial.print("⚙️ Umbral actualizado: ");
        Serial.println(UMBRAL_DELTA);
      }
    }
  }

  // Leer buzzer Piso 1
  if (Firebase.RTDB.getBool(&fbdo, "/configuracion/sistema/buzzerPiso1Activo")) {
    if (fbdo.dataType() == "boolean") {
      buzzerPiso1Activo = fbdo.boolData();
    }
  }

  // Leer buzzer Piso 2
  if (Firebase.RTDB.getBool(&fbdo, "/configuracion/sistema/buzzerPiso2Activo")) {
    if (fbdo.dataType() == "boolean") {
      buzzerPiso2Activo = fbdo.boolData();
    }
  }

  // Leer LED Piso 1
  if (Firebase.RTDB.getBool(&fbdo, "/configuracion/sistema/ledPiso1Activo")) {
    if (fbdo.dataType() == "boolean") {
      ledPiso1Activo = fbdo.boolData();
    }
  }

  // Leer LED Piso 2
  if (Firebase.RTDB.getBool(&fbdo, "/configuracion/sistema/ledPiso2Activo")) {
    if (fbdo.dataType() == "boolean") {
      ledPiso2Activo = fbdo.boolData();
    }
  }

  // Leer estado del servo (control remoto)
  if (Firebase.RTDB.getBool(&fbdo, "/configuracion/sistema/servoAbierto")) {
    if (fbdo.dataType() == "boolean") {
      bool nuevoEstado = fbdo.boolData();
      if (nuevoEstado != servoControlRemoto) {
        servoControlRemoto = nuevoEstado;
        miServo.write(servoControlRemoto ? 90 : 0);
        Serial.println(servoControlRemoto ? "🚪 Puerta ABIERTA (remoto)" : "🚪 Puerta CERRADA (remoto)");
      }
    }
  }

  // Leer volumen del buzzer
  if (Firebase.RTDB.getInt(&fbdo, "/configuracion/sistema/buzzerVolumen")) {
    if (fbdo.dataType() == "int") {
      buzzerVolumen = fbdo.intData();
    }
  }
}

void enviarNotificacion(String tipo, String mensaje) {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  String path = "/notificaciones/" + String(millis());
  
  json.set("tipo", tipo);
  json.set("mensaje", mensaje);
  json.set("timestamp", (int)millis());
  json.set("leido", false);

  if (tipo == "alerta") {
    if (alarmaPiso1) json.set("piso", "Piso 1");
    if (alarmaPiso2) json.set("piso", "Piso 2");
    json.set("valorGas", (int)(alarmaPiso1 ? ema : ema2));
  }

  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.println("📬 Notificación enviada");
  }
}

void actualizarEstadisticas() {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  String path = "/estadisticas/general";
  
  json.set("totalAlertas", totalAlertas);
  json.set("alertasPiso1", alertasPiso1);
  json.set("alertasPiso2", alertasPiso2);
  json.set("ultimaActualizacion", (int)millis());

  if (Firebase.RTDB.updateNode(&fbdo, path.c_str(), &json)) {
    Serial.println("📊 Estadísticas actualizadas");
  }
}

void actualizarEstadoDispositivo(String estado) {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  String path = "/dispositivos/arduino_001";
  
  json.set("estado", estado);
  json.set("ultimaConexion", (int)millis());

  Firebase.RTDB.updateNode(&fbdo, path.c_str(), &json);
}

void controlarActuadores(bool cond1, bool cond2) {
  // Control de buzzer Piso 1 (Pin 5 - digitalWrite)
  if (cond1 && buzzerPiso1Activo) {
    digitalWrite(BUZZER_A0, HIGH);
  } else {
    digitalWrite(BUZZER_A0, LOW);
  }

  // Control de buzzer Piso 2 (Pin 3 - tone)
  if (cond2 && buzzerPiso2Activo) {
    tone(BUZZER_A3, 2000);
  } else {
    noTone(BUZZER_A3);
  }

  // Control de LEDs
  digitalWrite(LED_PIN, alarma ? HIGH : LOW);  // LED general
  digitalWrite(LED2_PIN, (cond1 && ledPiso1Activo) ? HIGH : LOW);  // LED Piso 1
  digitalWrite(LED3_PIN, (cond2 && ledPiso2Activo) ? HIGH : LOW);  // LED Piso 2

  // Servo automático en alarma (solo si no está controlado remotamente)
  if ((cond1 || cond2) && !servoAbierto && !servoControlRemoto) {
    miServo.write(90);
    servoAbierto = true;
    Serial.println("🚪 Puerta abierta automáticamente");
  }
}