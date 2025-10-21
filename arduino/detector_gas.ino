#include <Servo.h>
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

// --- Configuración WiFi y Firebase ---
#define WIFI_SSID "OPTI-EE2EC5"
#define WIFI_PASSWORD "Milo2025"
#define FIREBASE_HOST "sdgi-detector-gas-default-rtdb.firebaseio.com"

WiFiSSLClient wifi;
HttpClient client = HttpClient(wifi, FIREBASE_HOST, 443);

// 🔥 MEJORADO: Intervalos más frecuentes + nuevos watchdogs
unsigned long ultimoEnvio = 0;
unsigned long ultimoChequeoConfig = 0;
unsigned long ultimoHeartbeat = 0;
unsigned long ultimoChequeoWiFi = 0;
const unsigned long INTERVALO_ENVIO = 1000;
const unsigned long INTERVALO_CONFIG = 3000;
const unsigned long INTERVALO_HEARTBEAT = 2000;
const unsigned long INTERVALO_CHEQUEO_WIFI = 5000;

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

// --- Parámetros CONFIGURABLES desde Firebase ---
int UMBRAL_DELTA = 30;
int BUZZER_VOLUMEN = 255;
bool BUZZER_PISO1_ACTIVO = true;
bool BUZZER_PISO2_ACTIVO = true;
bool LED_PISO1_ACTIVO = true;
bool LED_PISO2_ACTIVO = true;
bool SERVO_DEBE_ABRIR = false;
int INTERVALO_LECTURA = 100;

// --- Parámetros fijos ---
const unsigned long CALIBRACION_MS_1 = 10000UL;
const unsigned long CALIBRACION_MS_2 = 20000UL;
const float ALPHA = 0.5;
const int HISTERESIS = 12;
const unsigned long CONFIRM_ON_MS = 1000UL;

// Estado de alarma
bool alarma = false;
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
bool servoAbiertoManualmente = false;
int calib_min_1 = 1024, calib_max_1 = 0;
int calib_min_2 = 1024, calib_max_2 = 0;

// Variables para timestamp Unix real
unsigned long tiempoUnixBase = 0;
unsigned long millisInicioUnix = 0;
bool timestampSincronizado = false;

// FUNCION: Obtener timestamp Unix actual
unsigned long getTimestampUnix() {
  // Timestamp en MILISEGUNDOS (formato JavaScript/Firebase)
  // 1 enero 2025 00:00:00 UTC = 1735689600000
  unsigned long long base = 1735689600000ULL;
  return base + millis();
}

// FUNCION: Sincronizar tiempo con Firebase
void sincronizarTiempo() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("Sincronizando tiempo con Firebase...");
  
  client.beginRequest();
  client.get("/lecturas.json?orderBy=\"$key\"&limitToLast=1");
  client.endRequest();
  
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  
  if (statusCode == 200 && response.length() > 10) {
    int idx = response.indexOf(":{");
    if (idx > 5) {
      String timestampStr = response.substring(2, idx);
      unsigned long timestamp = timestampStr.toInt();
      
      if (timestamp > 1000000000UL) {
        tiempoUnixBase = timestamp;
        millisInicioUnix = millis();
        timestampSincronizado = true;
        Serial.println("Tiempo sincronizado correctamente");
        return;
      }
    }
  }
  
  tiempoUnixBase = 1735689600000UL;
  millisInicioUnix = millis();
  timestampSincronizado = true;
  Serial.println("Usando tiempo estimado");
}

// NUEVA FUNCION: Watchdog WiFi con reconexion automatica
void verificarConexionWiFi() {
  unsigned long ahora = millis();
  if (ahora - ultimoChequeoWiFi < INTERVALO_CHEQUEO_WIFI) return;
  
  ultimoChequeoWiFi = ahora;
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado. Reconectando...");
    
    // Parpadear LED para indicar reconexion
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int intentos = 0;
    while (WiFi.status() != WL_CONNECTED && intentos < 10) {
      Serial.print(".");
      delay(500);
      intentos++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nWiFi reconectado");
      Serial.print("IP: ");
      Serial.println(WiFi.localIP());
      sincronizarTiempo();
    } else {
      Serial.println("\nFallo reconexion WiFi");
    }
  }
}

// NUEVA FUNCION: Enviar datos durante calibracion
void enviarDatosCalibracion() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  unsigned long timestampUnix = getTimestampUnix();
  
  String json = "{";
  json += "\"dispositivo\":\"arduino_001\",";
  json += "\"timestamp\":" + String(timestampUnix) + ",";
  json += "\"valorSensor1\":" + String(analogRead(MQ2_PIN)) + ",";
  json += "\"valorSensor2\":" + String(analogRead(MQ2_PIN2)) + ",";
  json += "\"sensor1Alerta\":false,";
  json += "\"sensor2Alerta\":false,";
  json += "\"alarmaGeneral\":false,";
  json += "\"calibrando\":true,";
  json += "\"progresoCalibracion\":" + String((muestrasCal2 * 100) / 200) + ",";
  json += "\"baseline1\":" + String((int)baseline) + ",";
  json += "\"baseline2\":" + String((int)baseline2) + ",";
  json += "\"buzzer1Estado\":false,";
  json += "\"buzzer2Estado\":false,";
  json += "\"led1Estado\":false,";
  json += "\"led2Estado\":false,";
  json += "\"ledGeneralEstado\":false,";
  json += "\"servoAbierto\":false,";
  json += "\"servoAngulo\":0,";
  json += "\"umbralActivo\":" + String(UMBRAL_DELTA) + ",";
  json += "\"sensor2Fault\":false";
  json += "}";
  
  String path = "/lecturas/" + String(timestampUnix) + ".json";
  
  client.beginRequest();
  client.put(path.c_str());
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("Content-Length", json.length());
  client.beginBody();
  client.print(json);
  client.endRequest();
  
  int statusCode = client.responseStatusCode();
  client.responseBody();
  
  if (statusCode == 200) {
    Serial.println("Calibracion: Datos enviados");
  }
}

// NUEVA FUNCION: Heartbeat (senal de vida cada 2 segundos)
void enviarHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  unsigned long ahora = millis();
  if (ahora - ultimoHeartbeat < INTERVALO_HEARTBEAT) return;
  
  ultimoHeartbeat = ahora;
  
  String path = "/dispositivos/arduino_001.json";
  String json = "{";
  json += "\"estado\":\"online\",";
  json += "\"ultimaConexion\":" + String(getTimestampUnix()) + ",";
  json += "\"rssi\":" + String(WiFi.RSSI());
  json += "}";
  
  client.beginRequest();
  client.patch(path.c_str());
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("Content-Length", json.length());
  client.beginBody();
  client.print(json);
  client.endRequest();
  
  client.responseStatusCode();
  client.responseBody();
}

// Leer configuracion desde Firebase
void leerConfiguracionFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  unsigned long ahora = millis();
  if (ahora - ultimoChequeoConfig < INTERVALO_CONFIG) return;
  
  ultimoChequeoConfig = ahora;
  
  client.beginRequest();
  client.get("/configuracion/sistema.json");
  client.endRequest();
  
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  
  if (statusCode == 200 && response.length() > 10) {
    Serial.println("Leyendo configuracion de Firebase...");
    
    // Parsear umbralGas
    int idx = response.indexOf("\"umbralGas\":");
    if (idx > 0) {
      int valorInicio = idx + 12;
      int valorFin = response.indexOf(",", valorInicio);
      if (valorFin < 0) valorFin = response.indexOf("}", valorInicio);
      String valorStr = response.substring(valorInicio, valorFin);
      int nuevoUmbral = valorStr.toInt();
      if (nuevoUmbral > 0 && nuevoUmbral != UMBRAL_DELTA) {
        UMBRAL_DELTA = nuevoUmbral;
        Serial.print("  Umbral actualizado: ");
        Serial.println(UMBRAL_DELTA);
      }
    }
    
    // Parsear buzzerPiso1Activo
    idx = response.indexOf("\"buzzerPiso1Activo\":");
    if (idx > 0) {
      bool nuevo = response.substring(idx + 20, idx + 24) == "true";
      if (nuevo != BUZZER_PISO1_ACTIVO) {
        BUZZER_PISO1_ACTIVO = nuevo;
        Serial.print("  Buzzer Piso 1: ");
        Serial.println(BUZZER_PISO1_ACTIVO ? "ON" : "OFF");
      }
    }
    
    // Parsear buzzerPiso2Activo
    idx = response.indexOf("\"buzzerPiso2Activo\":");
    if (idx > 0) {
      bool nuevo = response.substring(idx + 20, idx + 24) == "true";
      if (nuevo != BUZZER_PISO2_ACTIVO) {
        BUZZER_PISO2_ACTIVO = nuevo;
        Serial.print("  Buzzer Piso 2: ");
        Serial.println(BUZZER_PISO2_ACTIVO ? "ON" : "OFF");
      }
    }
    
    // Parsear ledPiso1Activo
    idx = response.indexOf("\"ledPiso1Activo\":");
    if (idx > 0) {
      bool nuevo = response.substring(idx + 17, idx + 21) == "true";
      if (nuevo != LED_PISO1_ACTIVO) {
        LED_PISO1_ACTIVO = nuevo;
        Serial.print("  LED Piso 1: ");
        Serial.println(LED_PISO1_ACTIVO ? "ON" : "OFF");
      }
    }
    
    // Parsear ledPiso2Activo
    idx = response.indexOf("\"ledPiso2Activo\":");
    if (idx > 0) {
      bool nuevo = response.substring(idx + 17, idx + 21) == "true";
      if (nuevo != LED_PISO2_ACTIVO) {
        LED_PISO2_ACTIVO = nuevo;
        Serial.print("  LED Piso 2: ");
        Serial.println(LED_PISO2_ACTIVO ? "ON" : "OFF");
      }
    }
    
    // Parsear servoAbierto
    idx = response.indexOf("\"servoAbierto\":");
    if (idx > 0) {
      bool nuevo = response.substring(idx + 15, idx + 19) == "true";
      if (nuevo != SERVO_DEBE_ABRIR) {
        SERVO_DEBE_ABRIR = nuevo;
        Serial.print("  Servo: ");
        Serial.println(SERVO_DEBE_ABRIR ? "ABRIR" : "CERRAR");
      }
    }
    
    // Parsear buzzerVolumen
    idx = response.indexOf("\"buzzerVolumen\":");
    if (idx > 0) {
      int valorInicio = idx + 16;
      int valorFin = response.indexOf(",", valorInicio);
      if (valorFin < 0) valorFin = response.indexOf("}", valorInicio);
      String valorStr = response.substring(valorInicio, valorFin);
      int nuevo = valorStr.toInt();
      if (nuevo >= 0 && nuevo <= 255 && nuevo != BUZZER_VOLUMEN) {
        BUZZER_VOLUMEN = nuevo;
        Serial.print("  Volumen: ");
        Serial.println(BUZZER_VOLUMEN);
      }
    }
  }
}

// Enviar TODO el estado a Firebase
void enviarDatosFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  unsigned long ahora = millis();
  if (ahora - ultimoEnvio < INTERVALO_ENVIO) return;
  
  ultimoEnvio = ahora;
  
  // Determinar estados actuales
  bool cond1 = (ema > baseline + UMBRAL_DELTA);
  bool cond2 = (!sensor2_fault) && (ema2 > baseline2 + UMBRAL_DELTA);
  
  bool buzzer1Activo = BUZZER_PISO1_ACTIVO && cond1;
  bool buzzer2Activo = BUZZER_PISO2_ACTIVO && cond2;
  bool led1Activo = LED_PISO1_ACTIVO && cond1;
  bool led2Activo = LED_PISO2_ACTIVO && cond2;
  
  unsigned long timestampUnix = getTimestampUnix();

  String json = "{";
  json += "\"dispositivo\":\"arduino_001\",";
  json += "\"timestamp\":" + String(timestampUnix) + ",";
  
  // Valores de sensores
  json += "\"valorSensor1\":" + String((int)ema) + ",";
  json += "\"valorSensor2\":" + String((int)ema2) + ",";
  json += "\"valorRawSensor1\":" + String(analogRead(MQ2_PIN)) + ",";
  json += "\"valorRawSensor2\":" + String(analogRead(MQ2_PIN2)) + ",";
  
  // Estados de alerta
  json += "\"sensor1Alerta\":" + String(cond1 ? "true" : "false") + ",";
  json += "\"sensor2Alerta\":" + String(cond2 ? "true" : "false") + ",";
  json += "\"alarmaGeneral\":" + String(alarma ? "true" : "false") + ",";
  
  // Estados de actuadores
  json += "\"buzzer1Estado\":" + String(buzzer1Activo ? "true" : "false") + ",";
  json += "\"buzzer2Estado\":" + String(buzzer2Activo ? "true" : "false") + ",";
  json += "\"led1Estado\":" + String(led1Activo ? "true" : "false") + ",";
  json += "\"led2Estado\":" + String(led2Activo ? "true" : "false") + ",";
  json += "\"ledGeneralEstado\":" + String(alarma ? "true" : "false") + ",";
  json += "\"servoAbierto\":" + String(servoAbierto ? "true" : "false") + ",";
  json += "\"servoAngulo\":" + String(servoAbierto ? 90 : 0) + ",";
  
  // Configuracion activa
  json += "\"umbralActivo\":" + String(UMBRAL_DELTA) + ",";
  json += "\"baseline1\":" + String((int)baseline) + ",";
  json += "\"baseline2\":" + String((int)baseline2) + ",";
  json += "\"sensor2Fault\":" + String(sensor2_fault ? "true" : "false");
  
  json += "}";
  
  String path = "/lecturas/" + String(timestampUnix) + ".json";
  
  client.beginRequest();
  client.put(path.c_str());
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("Content-Length", json.length());
  client.beginBody();
  client.print(json);
  client.endRequest();
  
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  
 if (statusCode == 200) {
  Serial.println("✅ Firebase: Datos enviados OK");
  Serial.print("   Timestamp: "); Serial.println(timestampUnix);
  Serial.print("   S1: "); Serial.print((int)ema);
  Serial.print(" | S2: "); Serial.println((int)ema2);
} else if (statusCode == 401) {
  Serial.println("❌ Firebase: Error 401 - Necesita autenticación");
  Serial.println("   Solución: Cambia reglas de Firebase a público");
} else if (statusCode == 404) {
  Serial.println("❌ Firebase: Error 404 - Ruta incorrecta");
} else {
  Serial.print("❌ Firebase: Error ");
  Serial.println(statusCode);
  Serial.print("   Respuesta: ");
  Serial.println(response);

}}
void setup() {
  Serial.begin(9600);
  pinMode(BUZZER_A0, OUTPUT);
  pinMode(BUZZER_A3, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);

  miServo.attach(SERVO_PIN);
  miServo.write(0);

  digitalWrite(BUZZER_A0, LOW);
  digitalWrite(BUZZER_A3, LOW);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  Serial.println("Conectando a WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    Serial.print(".");
    delay(500);
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi conectado.");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Senal WiFi (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.println();
    sincronizarTiempo();
  } else {
    Serial.println("\nError al conectar WiFi (continuando sin conexion)");
  }

  Serial.println("=== PRUEBA: Buzzer pin 3 deberia sonar 2 segundos ===");
  tone(BUZZER_A3, 2000);
  delay(2000);
  noTone(BUZZER_A3);
  Serial.println("=== FIN PRUEBA ===");

  inicioCal = millis();
  Serial.println("Comenzando calibracion de MQ-2s...");
  Serial.println("Sensor A0: calibracion 10s | Sensor A3: calibracion 20s");
}

void loop() {
  int valorGas = analogRead(MQ2_PIN);
  int valorGas2 = analogRead(MQ2_PIN2);

  unsigned long ahora = millis();

  // NUEVO: Verificar WiFi constantemente
  verificarConexionWiFi();

  // NUEVO: Enviar heartbeat cada 2 segundos
  enviarHeartbeat();

  // MODIFICADO: Calibracion CON envio de datos
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

    if ((muestrasCal % 5 == 0 && ahora - inicioCal < CALIBRACION_MS_1) || (muestrasCal2 % 10 == 0)) {
      Serial.print("Calibrando... A0 baseline: "); Serial.print(baseline);
      Serial.print("  A3 baseline: "); Serial.println(baseline2);
    }

    miServo.write(0);
    
    // NUEVO: Enviar datos durante calibracion cada 2 segundos
    static unsigned long ultimoEnvioCalib = 0;
    if (ahora - ultimoEnvioCalib > 2000) {
      enviarDatosCalibracion();
      ultimoEnvioCalib = ahora;
      Serial.println("Enviando datos de calibracion...");
    }
    
    delay(200);
    return;
  }

  static bool postCalChecked = false;
  if (!postCalChecked) {
    Serial.println("--- Calibracion completada ---");
    Serial.print("A0 baseline: "); Serial.println(baseline);
    Serial.print("A0 rango calib (min..max): "); Serial.print(calib_min_1); Serial.print(" .. "); Serial.println(calib_max_1);
    Serial.print("A3 baseline: "); Serial.println(baseline2);
    Serial.print("A3 rango calib (min..max): "); Serial.print(calib_min_2); Serial.print(" .. "); Serial.println(calib_max_2);

    int rango2 = calib_max_2 - calib_min_2;
    if (rango2 < 6) {
      sensor2_fault = true;
      Serial.println("AVISO: Sensor en A3 parece estar pegado o defectuoso.");
    } else {
      Serial.println("Sensor A3 parece estable.");
    }
    postCalChecked = true;
    delay(200);
  }

  // Leer configuracion de Firebase
  leerConfiguracionFirebase();

  // EMA
  ema = ALPHA * valorGas + (1 - ALPHA) * ema;
  ema2 = ALPHA * valorGas2 + (1 - ALPHA) * ema2;

  // Histeresis
  float umbralOn = baseline + UMBRAL_DELTA;
  float umbralOff = baseline + UMBRAL_DELTA - HISTERESIS;
  float umbralOn2 = baseline2 + UMBRAL_DELTA;
  float umbralOff2 = baseline2 + UMBRAL_DELTA - HISTERESIS;

  // Condiciones de deteccion para cada sensor
  bool cond1 = (ema > umbralOn);
  bool cond2 = (!sensor2_fault) && (ema2 > umbralOn2);

  // Logica de activacion/desactivacion de alarma
  if (!alarma) {
    if (cond1 || cond2) {
      if (posibleEncendidoInicio == 0) posibleEncendidoInicio = ahora;
      else if (ahora - posibleEncendidoInicio >= CONFIRM_ON_MS) {
        alarma = true;
        posibleEncendidoInicio = 0;
        Serial.println("ALARMA ACTIVADA (confirmada) - por sensor");
      }
    } else {
      posibleEncendidoInicio = 0;
    }
  } else {
    if (sensor2_fault) {
      if (ema < umbralOff) alarma = false;
    } else {
      if (ema < umbralOff && ema2 < umbralOff2) alarma = false;
    }
  }

  // Control de buzzers respetando configuracion
  if (cond1 && BUZZER_PISO1_ACTIVO) {
    digitalWrite(BUZZER_A0, HIGH);
  } else {
    digitalWrite(BUZZER_A0, LOW);
  }

  if (cond2 && BUZZER_PISO2_ACTIVO) {
    tone(BUZZER_A3, 2000);
  } else {
    noTone(BUZZER_A3);
  }

  // Control de LEDs respetando configuracion
  digitalWrite(LED_PIN, alarma ? HIGH : LOW);
  digitalWrite(LED2_PIN, (cond1 && LED_PISO1_ACTIVO) ? HIGH : LOW);
  digitalWrite(LED3_PIN, (cond2 && LED_PISO2_ACTIVO) ? HIGH : LOW);

  // Control de servo - PERMANECE ABIERTO
  if (SERVO_DEBE_ABRIR && !servoAbierto) {
    miServo.write(90);
    servoAbierto = true;
    servoAbiertoManualmente = true;
    Serial.println("Puerta ABIERTA (comando remoto)");
  } else if (!SERVO_DEBE_ABRIR && servoAbiertoManualmente) {
    miServo.write(0);
    servoAbierto = false;
    servoAbiertoManualmente = false;
    Serial.println("Puerta CERRADA (comando remoto)");
  }
  
  if ((cond1 || cond2) && !servoAbierto) {
    miServo.write(90);
    servoAbierto = true;
    servoAbiertoManualmente = false;
    Serial.println("Puerta ABIERTA (automatico por sensor - PERMANECE ABIERTO)");
    
    if (WiFi.status() == WL_CONNECTED) {
      client.beginRequest();
      client.patch("/configuracion/sistema.json");
      client.sendHeader("Content-Type", "application/json");
      String updateJson = "{\"servoAbierto\":true}";
      client.sendHeader("Content-Length", updateJson.length());
      client.beginBody();
      client.print(updateJson);
      client.endRequest();
      client.responseStatusCode();
      client.responseBody();
    }
  }

  // Enviar estado completo a Firebase
  enviarDatosFirebase();

  // MODIFICADO: Mensajes de diagnostico cada 1 segundo
  static unsigned long ultimoSerial = 0;
  if (ahora - ultimoSerial > 1000) {
    Serial.print("A0 raw: "); Serial.print(valorGas);
    Serial.print("  ema1: "); Serial.print(ema,1);
    Serial.print("  baseline1: "); Serial.print(baseline);
    Serial.print("  umbralOn1: "); Serial.print(umbralOn);
    Serial.print("  umbralOff1: "); Serial.print(umbralOff);

    Serial.print("  ||  A3 raw: "); Serial.print(valorGas2);
    Serial.print("  ema2: "); Serial.print(ema2,1);
    Serial.print("  baseline2: "); Serial.print(baseline2);
    Serial.print("  umbralOn2: "); Serial.print(umbralOn2);
    Serial.print("  umbralOff2: "); Serial.print(umbralOff2);

    Serial.print("  ||  alarma: "); Serial.print(alarma ? "ON" : "OFF");
    Serial.print("  ||  servoAbierto: "); Serial.print(servoAbierto ? "SI" : "NO");
    Serial.print("  ||  WiFi: "); Serial.print(WiFi.RSSI()); Serial.print(" dBm");
    Serial.print("  ||  sensor2_fault: "); Serial.println(sensor2_fault ? "YES" : "NO");
    ultimoSerial = ahora;
  }

  delay(INTERVALO_LECTURA);
}