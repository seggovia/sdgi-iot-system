# 🔥 SDGI - Sistema Detector de Gas IoT

Sistema de detección de gas para edificios basado en tecnología IoT con Arduino UNO R4 WiFi y Firebase.

## 👥 Equipo

- **Cristian Segovia**
- **Simón Contreras**
- **Camilo Herrera**
- **Diego Vera**

## 🎯 Objetivo

Diseñar un sistema IoT de detección de gas que monitoree múltiples oficinas de un edificio. Al detectar concentraciones peligrosas, activa alarmas localizadas y envía alertas automáticas con información detallada sobre la ubicación, nivel de gas y personas presentes.

## 🛠️ Tecnologías

- **Hardware:** Arduino UNO R4 WiFi
- **Sensores:** MQ-2 (Gas), MQ-4 (Metano), MQ-6 (GLP), MQ-7 (CO)
- **Frontend:** React + Vite
- **Backend:** Firebase Firestore
- **Gráficos:** Recharts
- **Estilos:** CSS3 con Glassmorphism

## 📁 Estructura del Proyecto
```
sdgi-iot-system/
├── frontend/           # Aplicación web (Dashboard)
│   ├── src/
│   │   ├── App.jsx    # Componente principal
│   │   ├── App.css    # Estilos
│   │   └── firebase.js # Configuración Firebase
│   └── package.json
├── arduino/            # Código del Arduino
│   └── detector_gas.ino
└── README.md
```

## ⚡ Instalación y Uso

### Frontend (Dashboard Web)
```bash
cd frontend
npm install
npm run dev
```

El dashboard estará disponible en `http://localhost:5173`

### Arduino

1. Abrir `arduino/detector_gas.ino` en Arduino IDE
2. Configurar credenciales WiFi
3. Instalar librerías necesarias
4. Subir código al Arduino UNO R4 WiFi

## 🎨 Características del Dashboard

- 📊 **Gráficos en tiempo real** de lecturas del sensor
- ⚙️ **Configuración remota** (umbral, buzzer, LED)
- 🔴 **Alertas visuales** cuando se detecta gas
- 📜 **Historial de lecturas** con timestamps
- 🌐 **Sincronización en tiempo real** con Firebase

## 🔐 Configuración Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Firestore Database
3. Copiar credenciales en `frontend/src/firebase.js`

## 📋 Colecciones Firestore

- `configuracion` - Parámetros del sistema
- `lecturas` - Datos históricos del sensor
- `dispositivos` - Estado de los Arduinos
- `alertas` - Registro de alarmas

## 🚀 Próximas Funcionalidades

- [ ] Notificaciones por email/SMS
- [ ] Múltiples sensores simultáneos
- [ ] Sistema de ventilación automática
- [ ] Análisis predictivo de riesgos
- [ ] App móvil

## 📄 Licencia

Proyecto académico - Universidad [Tu Universidad]

---

**Desarrollado con ❤️ por el equipo SDGI**
```

**Guarda el archivo (`Ctrl + S`)**

---

### Paso 3: Crear archivo .gitignore

**1. Crea otro archivo en la raíz:** `.gitignore`

**2. Pega este contenido:**
```
# Node modules
node_modules/
frontend/node_modules/

# Build
frontend/dist/
frontend/build/

# Logs
*.log
npm-debug.log*

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Firebase
.firebase/
firebase-debug.log