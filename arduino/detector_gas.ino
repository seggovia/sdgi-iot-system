#include <WiFiS3.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <Servo.h>

// ============================================
// CONFIGURACIÓN WIFI Y FIREBASE
// ============================================
#define WIFI_SSID "TU_NOMBRE_WIFI"        // ⚠️ CAMBIAR
#define WIFI_PASSWORD "TU_PASSWORD_WIFI"  // ⚠️ CAMBIAR

#define API_KEY "AIzaSyCzj116N3yttGaBGFCKAClWWxzmwFAyLL8"
#define FIREBASE_PROJECT_ID "sdgi-detector-gas"
#define USER_EMAIL "tu_email@gmail.com"     // ⚠️ CAMBIAR
#define USER_PASSWORD "tu_password_seguro"  // ⚠️ CAMBIAR

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

Servo miServo;
const int SERVO_PIN = 6;

// --- Pines (ACTUALIZADOS) ---
const int MQ2_PIN = A0;         // Sensor MQ-2 principal (Piso 1)
const int MQ2_PIN2 = A3;        // Sensor MQ-2 secundario (Piso 2) - CAMBIADO A A3
const int BUZZER_A0 = 5;        // Buzzer para sensor A0 (Piso 1)
const int BUZZER_A3 = 3;        // Buzzer para sensor A3 (Piso 2) - NUEVO
const int LED_PIN = 7;          // LED de alarma general
const int LED2_PIN = 1;         // LED para sensor A0 (Piso 1)
const int LED3_PIN = 2;         // LED para sensor A3 (Piso 2)

// --- Parámetros (ACTUALIZADOS) ---
const unsigned long CALIBRACION_MS_1 = 10000UL;
const unsigned long CALIBRACION_MS_2 = 20000UL;
int UMBRAL_DELTA = 30;          // MÁS SENSIBLE (antes 60)
const float ALPHA = 0.5;        // RESPUESTA MÁS RÁPIDA (antes 0.2)
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
const unsigned long FIREBASE_UPDATE_INTERVAL = 2000;
unsigned long lastConfigCheck = 0;
const unsigned long CONFIG_CHECK_INTERVAL = 5000;

// Configuración desde Firebase
bool buzzerPiso1Activo = true;
bool buzzerPiso2Activo = true;
int buzzerVolumen = 255;
bool ledPiso1Activo = true;
bool ledPiso2Activo = true;
bool servoControlRemoto = false;
bool modoSimulacion = false;

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

  // Configurar Firebase
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("🔥 Conectando a Firebase...");
  
  intentos = 0;
  while (!Firebase.ready() && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (Firebase.ready()) {
    Serial.println("\n✅ Firebase conectado!");
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

  // --- CALIBRACIÓN ---
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

  // --- CONTROL DE ACTUADORES INDEPENDIENTES ---
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
// FUNCIONES FIREBASE
// ============================================

void enviarDatosFirebase(int sensor1, int sensor2) {
  if (!Firebase.ready()) return;

  FirebaseJson content;
  String documentPath = "lecturas";
  
  content.set("fields/valorSensor1/integerValue", String(sensor1));
  content.set("fields/valorSensor2/integerValue", String(sensor2));
  content.set("fields/sensor1Alerta/booleanValue", alarmaPiso1);
  content.set("fields/sensor2Alerta/booleanValue", alarmaPiso2);
  content.set("fields/dispositivo/stringValue", "arduino_001");
  content.set("fields/timestamp/timestampValue", "now");

  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), content.raw())) {
    Serial.println("📤 Datos enviados a Firebase");
  } else {
    Serial.print("❌ Error Firebase: ");
    Serial.println(fbdo.errorReason());
  }
}

void leerConfiguracionFirebase() {
  if (!Firebase.ready()) return;

  String docPath = "configuracion/sistema";
  
  if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", docPath.c_str())) {
    FirebaseJson json;
    json.setJsonData(fbdo.payload());
    
    FirebaseJsonData result;
    
    if (json.get(result, "fields/umbralGas/integerValue")) {
      UMBRAL_DELTA = result.to<int>();
    }
    
    if (json.get(result, "fields/buzzerPiso1Activo/booleanValue")) {
      buzzerPiso1Activo = result.to<bool>();
    }
    
    if (json.get(result, "fields/buzzerPiso2Activo/booleanValue")) {
      buzzerPiso2Activo = result.to<bool>();
    }
    
    if (json.get(result, "fields/ledPiso1Activo/booleanValue")) {
      ledPiso1Activo = result.to<bool>();
    }
    
    if (json.get(result, "fields/ledPiso2Activo/booleanValue")) {
      ledPiso2Activo = result.to<bool>();
    }
    
    if (json.get(result, "fields/servoAbierto/booleanValue")) {
      bool nuevoEstado = result.to<bool>();
      if (nuevoEstado != servoControlRemoto) {
        servoControlRemoto = nuevoEstado;
        miServo.write(servoControlRemoto ? 90 : 0);
        Serial.println(servoControlRemoto ? "🚪 Puerta ABIERTA (remoto)" : "🚪 Puerta CERRADA (remoto)");
      }
    }
    
    Serial.println("⚙️ Configuración actualizada desde Firebase");
  }
}

void enviarNotificacion(String tipo, String mensaje) {
  if (!Firebase.ready()) return;

  FirebaseJson content;
  String documentPath = "notificaciones";
  
  content.set("fields/tipo/stringValue", tipo);
  content.set("fields/mensaje/stringValue", mensaje);
  content.set("fields/timestamp/timestampValue", "now");
  content.set("fields/leido/booleanValue", false);

  if (tipo == "alerta") {
    if (alarmaPiso1) content.set("fields/piso/stringValue", "Piso 1");
    if (alarmaPiso2) content.set("fields/piso/stringValue", "Piso 2");
    content.set("fields/valorGas/integerValue", String((int)(alarmaPiso1 ? ema : ema2)));
  }

  Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), content.raw());
}

void actualizarEstadisticas() {
  if (!Firebase.ready()) return;

  FirebaseJson content;
  String docPath = "estadisticas/general";
  
  content.set("fields/totalAlertas/integerValue", String(totalAlertas));
  content.set("fields/alertasPiso1/integerValue", String(alertasPiso1));
  content.set("fields/alertasPiso2/integerValue", String(alertasPiso2));
  content.set("fields/ultimaActualizacion/timestampValue", "now");

  Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", docPath.c_str(), content.raw(), "totalAlertas,alertasPiso1,alertasPiso2,ultimaActualizacion");
}

void actualizarEstadoDispositivo(String estado) {
  if (!Firebase.ready()) return;

  FirebaseJson content;
  String docPath = "dispositivos/arduino_001";
  
  content.set("fields/estado/stringValue", estado);
  content.set("fields/ultimaConexion/timestampValue", "now");

  Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", docPath.c_str(), content.raw(), "estado,ultimaConexion");
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

  // Servo automático en alarma
  if ((cond1 || cond2) && !servoAbierto && !servoControlRemoto) {
    miServo.write(90);
    servoAbierto = true;
    Serial.println("🚪 Puerta abierta automáticamente");
  }
}