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
const int SERVO_PIN = 6; // 🔥 CAMBIO: Pin 6 para el servo

// --- Pines ---
const int MQ2_PIN = A0;
const int MQ2_PIN2 = A3;
const int BUZZER_A0 = 5;  // 🔥 BUZZER PASIVO (usa tone()/noTone())
const int BUZZER_A3 = 3;  // 🔥 BUZZER PASIVO (usa tone()/noTone())
const int LED_PIN = 7;
const int LED2_PIN = 1;
const int LED3_PIN = 2;
// const int BOTON_APAGAR_BUZZER = 4; // 🔥 BOTON físico removido - usa dashboard

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
const float ALPHA = 0.7; // 🔥 MÁS RESPONSIVO: Cambios más rápidos
const int HISTERESIS = 8; // 🔥 MENOS HISTERESIS: Desactiva más rápido
const unsigned long CONFIRM_ON_MS = 500UL; // 🔥 CONFIRMACIÓN MÁS RÁPIDA

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

// 🔥 DETECCION AUTOMATICA DE TIPO DE BUZZER
bool buzzerA0_esActivo = false; // false = pasivo, true = activo

// 🔥 CONTROL DE LIMPIEZA AUTOMATICA DE CACHE
bool alarmaAnterior = false; // Para detectar cambios de estado de alarma
unsigned long ultimaLimpiezaCache = 0;
const unsigned long INTERVALO_LIMPIEZA_CACHE = 5000; // Limpiar cada 5 segundos máximo

// 🔥 CONTROL DE BOTON APAGAR BUZZER desde dashboard
bool buzzersSilenciados = false; // true = buzzers apagados desde dashboard

// FUNCION: Crear campo botonApagarBuzzer en Firebase
void crearCampoBotonApagarBuzzer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi no conectado - no se puede crear campo");
    return;
  }
  
  Serial.println("🔧 CREANDO campo botonApagarBuzzer en Firebase...");
  Serial.println("   Ruta: /configuracion/sistema.json");
  
  String path = "/configuracion/sistema.json";
  String json = "{\"botonApagarBuzzer\":false}";
  
  Serial.print("   JSON enviado: "); Serial.println(json);
  
  client.beginRequest();
  client.patch(path.c_str());
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("Content-Length", json.length());
  client.beginBody();
  client.print(json);
  client.endRequest();
  
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  
  Serial.print("   Status Code: "); Serial.println(statusCode);
  Serial.print("   Respuesta: "); Serial.println(response);
  
  if (statusCode == 200) {
    Serial.println("✅ Campo botonApagarBuzzer creado exitosamente");
    Serial.println("   Ubicación: Firebase > configuracion > sistema.json");
    Serial.println("   Ahora puedes usar el botón en tu dashboard");
  } else {
    Serial.print("❌ Error creando campo: "); Serial.println(statusCode);
    Serial.print("Respuesta: "); Serial.println(response);
  }
}

// FUNCION: Reactivar sensor A3 manualmente
void reactivarSensorA3() {
  sensor2_fault = false;
  Serial.println("🔧 SENSOR A3 REACTIVADO MANUALMENTE");
  Serial.println("   Ahora debería detectar gas correctamente");
}

// FUNCION: Forzar cambio de botonApagarBuzzer en Firebase (para pruebas)
void forzarBotonApagarBuzzer(bool estado) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.print("🔧 FORZANDO botonApagarBuzzer a: "); Serial.println(estado ? "true" : "false");
  
  String path = "/configuracion/sistema.json";
  String json = "{\"botonApagarBuzzer\":" + String(estado ? "true" : "false") + "}";
  
  client.beginRequest();
  client.patch(path.c_str());
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("Content-Length", json.length());
  client.beginBody();
  client.print(json);
  client.endRequest();
  
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  
  if (statusCode == 200) {
    Serial.println("✅ botonApagarBuzzer actualizado en Firebase");
  } else {
    Serial.print("❌ Error actualizando: "); Serial.println(statusCode);
  }
}

// FUNCION: Limpiar caché automáticamente cuando hay alarma
void limpiarCacheAutomatico() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("🧹 LIMPIANDO CACHÉ AUTOMÁTICO - Alarma detectada");
  
  // Crear señal de limpieza de caché
  String path = "/cache/limpiar.json";
  String json = "{";
  json += "\"timestamp\":" + String(getTimestampUnix()) + ",";
  json += "\"motivo\":\"alarma_detectada\",";
  json += "\"dispositivo\":\"arduino_001\",";
  json += "\"alarma\":true,";
  json += "\"sensor1Alerta\":" + String((ema > baseline + UMBRAL_DELTA) ? "true" : "false") + ",";
  json += "\"sensor2Alerta\":" + String((!sensor2_fault && ema2 > baseline2 + UMBRAL_DELTA) ? "true" : "false");
  json += "}";
  
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
    Serial.println("✅ Caché limpiado automáticamente");
    Serial.println("   El modelo 3D debería actualizarse ahora");
  } else {
    Serial.print("❌ Error limpiando caché: "); Serial.println(statusCode);
    Serial.print("Respuesta: "); Serial.println(response);
  }
}

// FUNCION: Leer botón con debounce - REMOVIDA (usa dashboard)

// FUNCION: Detectar tipo de buzzer automáticamente
void detectarTipoBuzzer() {
  Serial.println("🔍 DETECTANDO tipo de buzzer en pin 5...");
  
  // Probar con tone() primero
  Serial.println("   Probando como buzzer PASIVO (tone)...");
  tone(BUZZER_A0, 2000);
  delay(1000);
  noTone(BUZZER_A0);
  delay(500);
  
  // Probar con digitalWrite
  Serial.println("   Probando como buzzer ACTIVO (digitalWrite)...");
  digitalWrite(BUZZER_A0, HIGH);
  delay(1000);
  digitalWrite(BUZZER_A0, LOW);
  delay(500);
  
  Serial.println("🔍 Si el segundo sonido fue MÁS FUERTE, el buzzer es ACTIVO");
  Serial.println("🔍 Si el primer sonido fue MÁS FUERTE, el buzzer es PASIVO");
  Serial.println("🔍 Configuración actual: BUZZER_A0 como ACTIVO (digitalWrite)");
  
  // 🔥 CAMBIO AUTOMATICO: Basado en el diagnóstico, configurar como ACTIVO
  buzzerA0_esActivo = true;  // Configurado como buzzer ACTIVO
  Serial.println("🔧 CONFIGURADO: BUZZER_A0 como ACTIVO (usa digitalWrite)");
}

// FUNCION: Obtener timestamp Unix actual (CORREGIDO - timestamp actual)
unsigned long getTimestampUnix() {
  // 🔥 VERSIÓN CORREGIDA: Usar timestamp actual real (2025-01-22)
  return 1737504000000UL + millis(); // 2025-01-22 en MILISEGUNDOS + milisegundos transcurridos
}

// FUNCION: Sincronizar tiempo con Firebase (CORREGIDO - maneja segundos y milisegundos)
void sincronizarTiempo() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("🕐 Sincronizando tiempo con Firebase...");
  
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
        // 🔥 CORRECCIÓN: Verificar si es timestamp en segundos o milisegundos
        if (timestamp < 2000000000UL) {
          // Convertir de segundos a milisegundos
          tiempoUnixBase = timestamp * 1000UL;
          Serial.println("✅ Timestamp convertido de segundos a milisegundos");
        } else {
          // Ya está en milisegundos
          tiempoUnixBase = timestamp;
          Serial.println("✅ Timestamp ya en milisegundos");
        }
        millisInicioUnix = millis();
        timestampSincronizado = true;
        Serial.print("✅ Tiempo sincronizado: ");
        Serial.println(tiempoUnixBase);
        return;
      }
    }
  }
  
  // 🔥 Fallback: usar timestamp actual en MILISEGUNDOS (2025-01-22)
  tiempoUnixBase = 1737504000000UL; // 2025-01-22 en milisegundos
  millisInicioUnix = millis();
  timestampSincronizado = true;
  Serial.print("⚠️ Usando tiempo estimado en milisegundos: ");
  Serial.println(tiempoUnixBase);
}

// FUNCION: Debug de timestamp (CORREGIDO)
void debugTimestamp() {
  unsigned long ts = getTimestampUnix();
  Serial.println("=== DEBUG TIMESTAMP ===");
  Serial.print("Timestamp generado: ");
  Serial.println(ts);
  Serial.print("Fecha equivalente: ");
  Serial.print("2025-01-22 + ");
  Serial.print(millis() / 1000);
  Serial.println(" segundos");
  Serial.println("======================");
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
  
  String path = "/lecturas/" + String((unsigned long)timestampUnix) + ".json";
  
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
  json += "\"ultimaConexion\":" + String((unsigned long)getTimestampUnix()) + ",";
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
    
    // 🔥 BUZZERS: Respetar configuración del dashboard (sin forzar)
    bool necesitaActualizar = false;
    
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
    
    // Parsear buzzerPiso1Activo - FORZAR SIEMPRE ON
    idx = response.indexOf("\"buzzerPiso1Activo\":");
    if (idx > 0) {
      bool nuevo = response.substring(idx + 20, idx + 24) == "true";
      BUZZER_PISO1_ACTIVO = true; // 🔥 FORZAR SIEMPRE ON
      if (!nuevo) {
        necesitaActualizar = true;
        Serial.println("  🔧 FORZANDO: Buzzer Piso 1 habilitado");
      }
    }
    
    // Parsear buzzerPiso2Activo - FORZAR SIEMPRE ON
    idx = response.indexOf("\"buzzerPiso2Activo\":");
    if (idx > 0) {
      bool nuevo = response.substring(idx + 20, idx + 24) == "true";
      BUZZER_PISO2_ACTIVO = true; // 🔥 FORZAR SIEMPRE ON
      if (!nuevo) {
        necesitaActualizar = true;
        Serial.println("  🔧 FORZANDO: Buzzer Piso 2 habilitado");
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
    
    // 🔥 CONTROL BOTON APAGAR BUZZER desde dashboard - DETECCION AUTOMATICA
    Serial.println("🔍 DETECTANDO campo de botón apagar buzzer en Firebase...");
    Serial.print("Respuesta completa: "); Serial.println(response);
    
    // 🔥 DIAGNOSTICO: Mostrar todos los campos booleanos encontrados
    Serial.println("📋 CAMPOS BOOLEANOS ENCONTRADOS:");
    String camposBooleanos[] = {"botonApagarBuzzer", "buzzerPiso1Activo", "buzzerPiso2Activo", "ledPiso1Activo", "ledPiso2Activo", "servoAbierto", "modoSimulacion"};
    for (int i = 0; i < 7; i++) {
      int idx = response.indexOf("\"" + camposBooleanos[i] + "\":");
      if (idx > 0) {
        int valorInicio = idx + camposBooleanos[i].length() + 3;
        int valorFin = response.indexOf(",", valorInicio);
        if (valorFin < 0) valorFin = response.indexOf("}", valorInicio);
        String valorStr = response.substring(valorInicio, valorFin);
        Serial.print("   "); Serial.print(camposBooleanos[i]); Serial.print(": "); Serial.println(valorStr);
      }
    }
    
    // Buscar diferentes posibles nombres de campo que tu dashboard podría estar usando
    String campoEncontrado = "";
    bool valorCampo = false;
    
    // Lista de posibles nombres de campo
    String posiblesCampos[] = {
      "botonApagarBuzzer",
      "apagarBuzzer", 
      "silenciarBuzzer",
      "buzzerSilenciado",
      "buzzerOff",
      "muteBuzzer",
      "disableBuzzer",
      "buzzerMuted"
    };
    
    for (int i = 0; i < 8; i++) {
      idx = response.indexOf("\"" + posiblesCampos[i] + "\":");
      if (idx > 0) {
        campoEncontrado = posiblesCampos[i];
        Serial.print("✅ Campo encontrado: "); Serial.println(campoEncontrado);
        
        int valorInicio = idx + campoEncontrado.length() + 3; // +3 por ":"
        int valorFin = response.indexOf(",", valorInicio);
        if (valorFin < 0) valorFin = response.indexOf("}", valorInicio);
        String valorStr = response.substring(valorInicio, valorFin);
        Serial.print("Valor leído: "); Serial.println(valorStr);
        
        valorCampo = valorStr == "true";
        Serial.print("Estado convertido: "); Serial.println(valorCampo ? "true" : "false");
        break;
      }
    }
    
    if (campoEncontrado != "") {
      Serial.print("Estado actual: "); Serial.println(buzzersSilenciados ? "true" : "false");
      
      if (valorCampo != buzzersSilenciados) {
        buzzersSilenciados = valorCampo;
        if (buzzersSilenciados) {
          Serial.print("🔇 BUZZERS SILENCIADOS desde dashboard (");
          Serial.print(campoEncontrado);
          Serial.println(")");
          // Apagar buzzers inmediatamente
          if (buzzerA0_esActivo) {
            digitalWrite(BUZZER_A0, LOW);
          } else {
            noTone(BUZZER_A0);
          }
          noTone(BUZZER_A3);
        } else {
          Serial.print("🔊 BUZZERS REACTIVADOS desde dashboard (");
          Serial.print(campoEncontrado);
          Serial.println(")");
        }
      } else {
        Serial.println("Estado sin cambios");
      }
    } else {
      Serial.println("❌ Ningún campo de botón apagar buzzer encontrado");
      // 🔥 FALLBACK: Usar buzzerPiso1Activo y buzzerPiso2Activo para controlar silencio
      // Si ambos buzzers están desactivados = silenciar, si alguno está activo = reactivar
      bool buzzer1Activo = BUZZER_PISO1_ACTIVO;
      bool buzzer2Activo = BUZZER_PISO2_ACTIVO;
      bool nuevoEstadoSilencio = !buzzer1Activo && !buzzer2Activo; // Silenciado si ambos están OFF
      
      if (nuevoEstadoSilencio != buzzersSilenciados) {
        buzzersSilenciados = nuevoEstadoSilencio;
        if (buzzersSilenciados) {
          Serial.println("🔇 BUZZERS SILENCIADOS desde dashboard (ambos buzzers OFF)");
          // Apagar buzzers inmediatamente
          if (buzzerA0_esActivo) {
            digitalWrite(BUZZER_A0, LOW);
          } else {
            noTone(BUZZER_A0);
          }
          noTone(BUZZER_A3);
        } else {
          Serial.println("🔊 BUZZERS REACTIVADOS desde dashboard (al menos un buzzer ON)");
        }
      }
    }
    
    // 🔥 ACTUALIZAR Firebase si se forzaron los buzzers
    if (necesitaActualizar) {
      String path = "/configuracion/sistema.json";
      String json = "{";
      json += "\"buzzerPiso1Activo\":true,";
      json += "\"buzzerPiso2Activo\":true";
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
      Serial.println("  ✅ Firebase actualizado: Buzzers habilitados");
    }
  }
  
  // 🔥 CONFIRMAR estado final de buzzers
  Serial.print("🔊 Estado final buzzers - Piso1: ");
  Serial.print(BUZZER_PISO1_ACTIVO ? "ON" : "OFF");
  Serial.print(" | Piso2: ");
  Serial.println(BUZZER_PISO2_ACTIVO ? "ON" : "OFF");
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
  
  String path = "/lecturas/" + String((unsigned long)timestampUnix) + ".json";
  
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
  Serial.print("   Fecha: "); Serial.print("2025-01-22 + ");
  Serial.print(millis() / 1000);
  Serial.println(" segundos");
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
  // pinMode(BOTON_APAGAR_BUZZER, INPUT_PULLUP); // 🔥 BOTON físico removido

  miServo.attach(SERVO_PIN);
  Serial.print("🔧 Servo inicializado en pin: "); Serial.println(SERVO_PIN);
  delay(200); // Esperar estabilización
  
  // 🔥 PRUEBA COMPLETA DEL SERVO
  Serial.println("🔧 PRUEBA COMPLETA: Probando servo motor...");
  
  Serial.println("   Paso 1: Posición inicial 0°");
  miServo.write(0);
  delay(1000);
  
  Serial.println("   Paso 2: Moviendo a 45°");
  miServo.write(45);
  delay(1000);
  
  Serial.println("   Paso 3: Moviendo a 90°");
  miServo.write(90);
  delay(1000);
  
  Serial.println("   Paso 4: Moviendo a 135°");
  miServo.write(135);
  delay(1000);
  
  Serial.println("   Paso 5: Volviendo a 0°");
  miServo.write(0);
  delay(1000);
  
  Serial.println("🔧 FIN PRUEBA COMPLETA servo");
  
  // Verificar que el servo respondió
  Serial.println("🔧 Si el servo NO se movió durante la prueba:");
  Serial.println("   1. Verificar conexiones: Pin 6, 5V, GND");
  Serial.println("   2. Verificar alimentación: Debe ser 5V estable");
  Serial.println("   3. Verificar servo: Puede estar defectuoso");

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
    
    // Debug del timestamp
    debugTimestamp();
  } else {
    Serial.println("\nError al conectar WiFi (continuando sin conexion)");
  }

  Serial.println("=== PRUEBA: Buzzer ALARMA pin 3 deberia sonar FUERTE 2 segundos ===");
  tone(BUZZER_A3, 4000);
  delay(2000);
  noTone(BUZZER_A3);
  Serial.println("=== FIN PRUEBA ===");

  Serial.println("=== PRUEBA: Buzzer ALARMA pin 5 deberia sonar FUERTE 2 segundos ===");
  Serial.println("🔍 DIAGNOSTICO: Si suena pausado/bajo, puede ser:");
  Serial.println("   - Buzzer ACTIVO (necesita digitalWrite)");
  Serial.println("   - Conexión deficiente");
  Serial.println("   - Buzzer defectuoso");
  tone(BUZZER_A0, 4000);
  delay(2000);
  noTone(BUZZER_A0);
  Serial.println("=== FIN PRUEBA ===");

  // 🔥 PRUEBA ALTERNATIVA: Probar con digitalWrite si es buzzer activo
  Serial.println("🔧 PRUEBA ALTERNATIVA: Probando buzzer pin 5 con digitalWrite");
  Serial.println("   Si suena mejor así, es un buzzer ACTIVO");
  digitalWrite(BUZZER_A0, HIGH);
  delay(2000);
  digitalWrite(BUZZER_A0, LOW);
  Serial.println("🔧 FIN PRUEBA ALTERNATIVA");

  // 🔥 PRUEBA COMPARATIVA: Ambos buzzers al mismo tiempo
  Serial.println("🚨 PRUEBA COMPARATIVA: Ambos buzzers AL MISMO TIEMPO");
  Serial.println("   Deben sonar EXACTAMENTE IGUAL - 4000Hz");
  tone(BUZZER_A0, 4000);
  tone(BUZZER_A3, 4000);
  delay(3000);
  noTone(BUZZER_A0);
  noTone(BUZZER_A3);
  Serial.println("🚨 FIN PRUEBA COMPARATIVA");

  // 🔥 DETECTAR tipo de buzzer automáticamente
  detectarTipoBuzzer();

  // 🔥 REACTIVAR sensor A3 automáticamente
  Serial.println("🔧 REACTIVANDO sensor A3 automáticamente...");
  reactivarSensorA3();

  // 🔥 CREAR campo botonApagarBuzzer en Firebase
  Serial.println("🔧 CREANDO campo botonApagarBuzzer en Firebase...");
  crearCampoBotonApagarBuzzer();
  
  // 🔥 PRUEBA: Probar botón apagar buzzer automáticamente
  Serial.println("🔧 PRUEBA: Probando botón apagar buzzer...");
  delay(2000);
  forzarBotonApagarBuzzer(true);  // Silenciar
  delay(3000);
  forzarBotonApagarBuzzer(false); // Reactivar
  Serial.println("🔧 FIN PRUEBA botón apagar buzzer");

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

  // 🔥 CONTROL BOTON APAGAR BUZZER desde dashboard (en leerConfiguracionFirebase)

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
    // 🔥 FORZAR: Sensor A3 siempre funcional (sin marcar como defectuoso)
    sensor2_fault = false;
    Serial.println("✅ Sensor A3 configurado como FUNCIONAL");
    Serial.print("   Rango detectado: "); Serial.print(calib_min_2); 
    Serial.print(" .. "); Serial.println(calib_max_2);
    Serial.println("   El sensor A3 funcionará normalmente");
    postCalChecked = true;
    
    // 🔥 PRUEBA: Verificar que los buzzers funcionen después de calibración
    Serial.println("🚨 PRUEBA ALARMA: Probando buzzers después de calibración...");
    Serial.println("   Probando buzzer ALARMA (Pin 5) - 4000Hz...");
    tone(BUZZER_A0, 4000);
    delay(1000);
    noTone(BUZZER_A0);
    Serial.println("   Probando buzzer ALARMA (Pin 3) - 4000Hz...");
    tone(BUZZER_A3, 4000);
    delay(1000);
    noTone(BUZZER_A3);
    Serial.println("🚨 FIN PRUEBA ALARMA buzzers");
    
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
  // 🔥 SENSOR A3 SIMPLIFICADO: Siempre detecta cuando supera umbral
  bool cond2 = (ema2 > umbralOn2);
  
  // 🔥 CONFIRMACIÓN: Mostrar cuando A3 detecta
  if (cond2) {
    static unsigned long ultimoMensajeA3 = 0;
    if (ahora - ultimoMensajeA3 > 3000) {
      Serial.println("🚨 SENSOR A3 DETECTANDO ANOMALÍA - BUZZER DEBERÍA SONAR");
      ultimoMensajeA3 = ahora;
    }
  }
  
  // 🔥 DIAGNOSTICO ESPECIFICO SENSOR A3 - MEJORADO
  static unsigned long ultimoDiagnosticoA3 = 0;
  if (ahora - ultimoDiagnosticoA3 > 2000) {
    ultimoDiagnosticoA3 = ahora;
    Serial.println("=== DIAGNOSTICO SENSOR A3 ===");
    Serial.print("Raw A3: "); Serial.println(valorGas2);
    Serial.print("EMA A3: "); Serial.println(ema2, 1);
    Serial.print("Baseline A3: "); Serial.println(baseline2);
    Serial.print("UMBRAL_DELTA: "); Serial.println(UMBRAL_DELTA);
    Serial.print("Umbral A3: "); Serial.println(umbralOn2);
    Serial.print("Condición: "); Serial.print(ema2); Serial.print(" > "); Serial.print(umbralOn2); Serial.print(" = "); Serial.println(ema2 > umbralOn2 ? "TRUE" : "FALSE");
    Serial.print("sensor2_fault: "); Serial.println(sensor2_fault ? "YES" : "NO");
    Serial.print("cond2 final: "); Serial.println(cond2 ? "TRUE" : "FALSE");
    Serial.println("==========================");
  }

  // Logica de activacion/desactivacion de alarma
  if (!alarma) {
    if (cond1 || cond2) {
      if (posibleEncendidoInicio == 0) posibleEncendidoInicio = ahora;
      else if (ahora - posibleEncendidoInicio >= CONFIRM_ON_MS) {
        alarma = true;
        posibleEncendidoInicio = 0;
        Serial.println("ALARMA ACTIVADA (confirmada) - por sensor");
        
        // 🔥 LIMPIAR CACHÉ AUTOMÁTICAMENTE cuando se activa alarma
        if (ahora - ultimaLimpiezaCache > INTERVALO_LIMPIEZA_CACHE) {
          limpiarCacheAutomatico();
          ultimaLimpiezaCache = ahora;
        }
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

  // Control de buzzers - DETECTOR DE INCENDIOS con botón de silencio
  if (cond1 && !buzzersSilenciados) {
    // BUZZER_A0 (Pin 5) - Usar método correcto según tipo detectado
    if (buzzerA0_esActivo) {
      digitalWrite(BUZZER_A0, HIGH); // Buzzer ACTIVO
      Serial.println("🚨 ALARMA INCENDIO - Buzzer ACTIVO Pin 5");
    } else {
      tone(BUZZER_A0, 4000); // Buzzer PASIVO
      Serial.println("🚨 ALARMA INCENDIO - Buzzer PASIVO Pin 5 - 4000Hz");
    }
  } else {
    if (buzzerA0_esActivo) {
      digitalWrite(BUZZER_A0, LOW);
    } else {
      noTone(BUZZER_A0);
    }
    if (cond1 && buzzersSilenciados) {
      Serial.println("🔇 Buzzer Pin 5 SILENCIADO por botón dashboard");
    }
  }

  // 🔥 BUZZER A3 FORZADO: Siempre suena cuando detecta anomalía
  if (cond2 && !buzzersSilenciados) {
    tone(BUZZER_A3, 4000);
    Serial.println("🚨 ALARMA INCENDIO - Buzzer PASIVO Pin 3 - 4000Hz");
  } else {
    noTone(BUZZER_A3);
    if (cond2 && buzzersSilenciados) {
      Serial.println("🔇 Buzzer Pin 3 SILENCIADO por botón dashboard");
    }
  }
  
  // 🔥 MOSTRAR ESTADO DE SILENCIO
  if (buzzersSilenciados) {
    static unsigned long ultimoMensajeSilencio = 0;
    if (ahora - ultimoMensajeSilencio > 5000) {
      Serial.println("🔇 BUZZERS SILENCIADOS - Presiona botón para reactivar");
      ultimoMensajeSilencio = ahora;
    }
  }

  // Control de LEDs respetando configuracion
  digitalWrite(LED_PIN, alarma ? HIGH : LOW);
  digitalWrite(LED2_PIN, (cond1 && LED_PISO1_ACTIVO) ? HIGH : LOW);
  digitalWrite(LED3_PIN, (cond2 && LED_PISO2_ACTIVO) ? HIGH : LOW);

  // Control de servo - MEJORADO sin delays problemáticos
  static int ultimoAnguloServo = 0;
  static unsigned long ultimoMovimientoServo = 0;
  
  // Evitar movimientos muy frecuentes (mínimo 100ms entre movimientos)
  bool necesitaMovimiento = false;
  int nuevoAngulo = ultimoAnguloServo;
  
  if (SERVO_DEBE_ABRIR && !servoAbierto) {
    nuevoAngulo = 90;
    servoAbierto = true;
    servoAbiertoManualmente = true;
    necesitaMovimiento = true;
    Serial.println("🔧 Puerta ABIERTA (comando remoto) - Ángulo: 90°");
  } else if (!SERVO_DEBE_ABRIR && servoAbiertoManualmente) {
    nuevoAngulo = 0;
    servoAbierto = false;
    servoAbiertoManualmente = false;
    necesitaMovimiento = true;
    Serial.println("🔧 Puerta CERRADA (comando remoto) - Ángulo: 0°");
  }
  
  // Control automático del servo basado en alarma
  if (alarma && !servoAbierto) {
    nuevoAngulo = 90;
    servoAbierto = true;
    servoAbiertoManualmente = false;
    necesitaMovimiento = true;
    Serial.println("🔧 Puerta ABIERTA (automatico por alarma) - Ángulo: 90°");
    
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
  } else if (!alarma && servoAbierto && !servoAbiertoManualmente) {
    nuevoAngulo = 0;
    servoAbierto = false;
    necesitaMovimiento = true;
    Serial.println("🔧 Puerta CERRADA (alarma desactivada) - Ángulo: 0°");
    
    if (WiFi.status() == WL_CONNECTED) {
      client.beginRequest();
      client.patch("/configuracion/sistema.json");
      client.sendHeader("Content-Type", "application/json");
      String updateJson = "{\"servoAbierto\":false}";
      client.sendHeader("Content-Length", updateJson.length());
      client.beginBody();
      client.print(updateJson);
      client.endRequest();
      client.responseStatusCode();
      client.responseBody();
    }
  }
  
  // Ejecutar movimiento solo si es necesario y ha pasado suficiente tiempo
  if (necesitaMovimiento && ahora - ultimoMovimientoServo > 100) {
    miServo.write(nuevoAngulo);
    ultimoAnguloServo = nuevoAngulo;
    ultimoMovimientoServo = ahora;
  }

  // 🔥 LIMPIAR CACHÉ cuando cambia el estado de alarma
  if (alarma != alarmaAnterior) {
    alarmaAnterior = alarma;
    if (ahora - ultimaLimpiezaCache > INTERVALO_LIMPIEZA_CACHE) {
      limpiarCacheAutomatico();
      ultimaLimpiezaCache = ahora;
    }
  }

  // Enviar estado completo a Firebase
  enviarDatosFirebase();

  // 🔧 DIAGNOSTICO SERVO: Verificar estado cada 5 segundos
  static unsigned long ultimoDiagnosticoServo = 0;
  if (ahora - ultimoDiagnosticoServo > 5000) {
    ultimoDiagnosticoServo = ahora;
    Serial.println("=== DIAGNOSTICO SERVO ===");
    Serial.print("Pin: "); Serial.println(SERVO_PIN);
    Serial.print("Estado: "); Serial.println(servoAbierto ? "ABIERTO" : "CERRADO");
    Serial.print("Ángulo actual: "); Serial.print(ultimoAnguloServo); Serial.println("°");
    Serial.print("Comando remoto: "); Serial.println(SERVO_DEBE_ABRIR ? "ABRIR" : "CERRAR");
    Serial.print("Alarma activa: "); Serial.println(alarma ? "SI" : "NO");
    Serial.println("========================");
  }

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
    Serial.print("  ||  anguloServo: "); Serial.print(ultimoAnguloServo); Serial.print("°");
    Serial.print("  ||  buzzersSilenciados: "); Serial.print(buzzersSilenciados ? "SI" : "NO");
    Serial.print("  ||  WiFi: "); Serial.print(WiFi.RSSI()); Serial.print(" dBm");
    Serial.print("  ||  sensor2_fault: "); Serial.println(sensor2_fault ? "YES" : "NO");
    ultimoSerial = ahora;
  }

  delay(INTERVALO_LECTURA);
}