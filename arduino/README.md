# 🔥 Firmware Arduino - Sistema Detector de Gas IoT (SDGI)

## 📋 Descripción
Firmware para Arduino UNO R4 WiFi que detecta gas con 2 sensores MQ-2 
y envía datos en tiempo real a Firebase Cloud Firestore.

---

## 🔌 Hardware Necesario

| Componente | Cantidad | Pines |
|------------|----------|-------|
| Arduino UNO R4 WiFi | 1 | - |
| Sensor MQ-2 (Piso 1) | 1 | A0 |
| Sensor MQ-2 (Piso 2) | 1 | A3 |
| Buzzer Activo (Piso 1) | 1 | Pin 5 |
| Buzzer Pasivo (Piso 2) | 1 | Pin 3 |
| LED Rojo (Piso 1) | 1 | Pin 1 |
| LED Rojo (Piso 2) | 1 | Pin 2 |
| LED General | 1 | Pin 7 |
| Servomotor SG90 | 1 | Pin 6 |

---

## 📚 Librerías Requeridas

Instalar desde Arduino IDE > Library Manager:
```cpp
1. WiFiS3                    // Incluida con Arduino UNO R4 WiFi
2. Firebase_ESP_Client       // Por Mobizt
3. Servo                     // Incluida con Arduino IDE
```

---

## ⚙️ Configuración Inicial

### 1. Abrir el archivo en Arduino IDE:
```
File > Open > arduino/detector_gas.ino
```

### 2. Configurar credenciales WiFi (líneas 10-11):
```cpp
#define WIFI_SSID "TU_NOMBRE_WIFI"        // ⚠️ CAMBIAR
#define WIFI_PASSWORD "TU_PASSWORD_WIFI"  // ⚠️ CAMBIAR
```

### 3. Configurar credenciales Firebase (líneas 15-16):
```cpp
#define USER_EMAIL "tu_email@gmail.com"     // ⚠️ CAMBIAR
#define USER_PASSWORD "tu_password_seguro"  // ⚠️ CAMBIAR
```

### 4. Verificar configuración Firebase (líneas 13-14):
```cpp
#define API_KEY "AIzaSyCzj116N3yttGaBGFCKAClWWxzmwFAyLL8"
#define FIREBASE_PROJECT_ID "sdgi-detector-gas"
```

---

## 🚀 Cómo Subir el Código

### Paso 1: Seleccionar la placa
```
Tools > Board > Arduino UNO R4 Boards > Arduino UNO R4 WiFi
```

### Paso 2: Seleccionar el puerto
```
Tools > Port > COM3 (o el que aparezca)
```

### Paso 3: Compilar y subir
```
Sketch > Upload (o presionar Ctrl+U)
```

### Paso 4: Verificar en Serial Monitor
```
Tools > Serial Monitor
Baud rate: 115200
```

**Deberías ver:**
```
🌐 Conectando a WiFi...
✅ WiFi conectado!
📡 IP: 192.168.1.105
🔥 Conectando a Firebase...
✅ Firebase conectado!
🎯 Comenzando calibración de sensores...
```

---

## 🔧 Troubleshooting

### Error: "WiFi connection failed"
- ✅ Verifica SSID y contraseña
- ✅ Verifica que el router esté encendido
- ✅ Acércate al router

### Error: "Firebase authentication failed"
- ✅ Verifica email y contraseña de Firebase
- ✅ Verifica que el usuario exista en Firebase Console

### Error: "Sensor2 defectuoso"
- ✅ Verifica conexión del sensor A3
- ✅ Verifica alimentación 5V

---

## 📊 Estructura de Datos en Firebase

### Colección: `lecturas`
```json
{
  "valorSensor1": 45,
  "valorSensor2": 38,
  "sensor1Alerta": false,
  "sensor2Alerta": false,
  "dispositivo": "arduino_001",
  "timestamp": "2024-10-19T10:30:00Z"
}
```

### Colección: `configuracion/sistema`
```json
{
  "umbralGas": 60,
  "buzzerPiso1Activo": true,
  "buzzerPiso2Activo": true,
  "ledPiso1Activo": true,
  "ledPiso2Activo": true,
  "servoAbierto": false
}
```

---

## 🔄 Flujo de Funcionamiento
```
1. Arduino lee sensores cada 100ms
2. Compara con umbral (default: 60)
3. Si detecta gas:
   - Enciende buzzer correspondiente
   - Enciende LED correspondiente
   - Abre servomotor (puerta)
   - Envía alerta a Firebase
4. Frontend React escucha cambios en tiempo real
5. Actualiza interfaz 3D automáticamente
```

---

## 📝 Notas Importantes

- ⚠️ **Calibración:** Los sensores MQ-2 necesitan 20 segundos de calentamiento
- ⚠️ **Umbral:** Se puede ajustar desde el frontend (rango: 10-200)
- ⚠️ **Autosave:** Los cambios de configuración se guardan automáticamente
- ⚠️ **Buzzer Pin 3:** Usa `tone()` porque es pasivo
- ⚠️ **Buzzer Pin 5:** Usa `digitalWrite()` porque es activo

---

## 👥 Autores
- Cristian Segovia
- Simón Contreras
- Camilo Herrera
- Diego Vera

---

## 📅 Versión
- **v1.0** - Octubre 2024

---

## 🔗 Enlaces
- Frontend: [Ver código](../frontend/)
- Firebase: [Console](https://console.firebase.google.com/)
```

---

## 🎯 **RESUMEN:**

### **Pregunta 1: ¿Cómo funciona el enlazamiento?**
```
PC + Arduino IDE
    ↓ (USB) Solo para programar
Arduino grabado
    ↓ (WiFi) Permanente
Firebase
    ↓ (Internet) Permanente
Tu Frontend React
```

### **Pregunta 2: ¿Qué hacer con los archivos?**
```
arduino/
├── detector_gas.ino    ← ✅ MANTENER (código fuente)
└── README.md           ← ✅ CREAR (documentación)