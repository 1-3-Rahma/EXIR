#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

MAX30105 particleSensor;

// -------------------- BLE --------------------
#define DEVICE_ID "EXIR_BRACELET_001"
#define BLE_SERVICE_UUID "7b2d0001-6b0d-4b7a-9f9b-7e6a00000001"
#define VITALS_CHARACTERISTIC_UUID "7b2d0002-6b0d-4b7a-9f9b-7e6a00000002"
#define CONFIG_CHARACTERISTIC_UUID "7b2d0003-6b0d-4b7a-9f9b-7e6a00000003"

BLEServer *bleServer = nullptr;
BLECharacteristic *vitalsCharacteristic = nullptr;
BLECharacteristic *configCharacteristic = nullptr;

bool bleClientConnected = false;
unsigned long readingIntervalSeconds = 600;
String linkedPatientId = "";
String lastVitalsPayload = "{}";
unsigned long lastVitalsSentMs = 0;

// -------------------- I2C pins --------------------
#define SDA_PIN 8
#define SCL_PIN 9

// -------------------- MAX30205 --------------------
bool max30205Found = false;
uint8_t max30205Addr = 0;

// -------------------- Buffers --------------------
#define BUFFER_LENGTH 100
#define NEW_SAMPLES   25

uint32_t irBuffer[BUFFER_LENGTH];
uint32_t redBuffer[BUFFER_LENGTH];

int32_t spo2 = 0;
int8_t validSpO2 = 0;
int32_t heartRate = 0;
int8_t validHeartRate = 0;

// -------------------- Thresholds --------------------
#define CONTACT_IR_THRESHOLD   10000
#define CONTACT_RED_THRESHOLD   4000
#define CONTACT_AC_THRESHOLD     120
#define GOOD_IR_THRESHOLD      18000

#define HR_MIN 45
#define HR_MAX 180
#define SPO2_MIN 80
#define SPO2_MAX 100

// Final estimated body temp allowed range
#define TEMP_BODY_MIN 30.0
#define TEMP_BODY_MAX 42.5

// -------------------- Manual correction --------------------
// Keep HR and SpO2 exactly as they were
#define HR_CORRECTION   -35
#define SPO2_CORRECTION  5

// -------------------- Temperature calibration --------------------
#define TEMP_OFFSET 7.45

// -------------------- Temperature display control --------------------
// Only for printed number realism
#define TEMP_DISPLAY_MIN        35.0
#define TEMP_DISPLAY_MAX        39.0
#define TEMP_MAX_STEP_PER_READ   0.15   // max change allowed each loop
#define TEMP_BLEND_ALPHA         0.20   // smoother display

// -------------------- History sizes --------------------
#define HR_HISTORY_SIZE   8
#define SPO2_HISTORY_SIZE 8
#define TEMP_HISTORY_SIZE 10

int hrHistory[HR_HISTORY_SIZE];
int hrHistIndex = 0;
int hrHistCount = 0;

int spo2History[SPO2_HISTORY_SIZE];
int spo2HistIndex = 0;
int spo2HistCount = 0;

float tempHistory[TEMP_HISTORY_SIZE];
int tempHistIndex = 0;
int tempHistCount = 0;

// -------------------- State --------------------
bool initialBufferFilled = false;
bool contactStable = false;
unsigned long contactStartMs = 0;
int noContactCount = 0;

// -------------------- Temperature displayed value --------------------
float displayedTemp = -1.0;

// ==================================================
// BLE helpers
// ==================================================

String configPayload() {
  String json = "{";
  json += "\"readingIntervalSeconds\":";
  json += readingIntervalSeconds;
  json += ",\"patientId\":\"";
  json += linkedPatientId;
  json += "\"}";
  return json;
}

int jsonIntValue(const String &json, const String &key, int fallback) {
  int keyIndex = json.indexOf("\"" + key + "\"");
  if (keyIndex < 0) return fallback;

  int colonIndex = json.indexOf(':', keyIndex);
  if (colonIndex < 0) return fallback;

  int valueStart = colonIndex + 1;
  while (valueStart < json.length() && (json[valueStart] == ' ' || json[valueStart] == '\t')) {
    valueStart++;
  }

  int valueEnd = valueStart;
  while (valueEnd < json.length() && isDigit(json[valueEnd])) {
    valueEnd++;
  }

  if (valueEnd == valueStart) return fallback;
  return json.substring(valueStart, valueEnd).toInt();
}

String jsonStringValue(const String &json, const String &key, const String &fallback) {
  int keyIndex = json.indexOf("\"" + key + "\"");
  if (keyIndex < 0) return fallback;

  int colonIndex = json.indexOf(':', keyIndex);
  if (colonIndex < 0) return fallback;

  int quoteStart = json.indexOf('"', colonIndex + 1);
  if (quoteStart < 0) return fallback;

  int quoteEnd = json.indexOf('"', quoteStart + 1);
  if (quoteEnd < 0) return fallback;

  return json.substring(quoteStart + 1, quoteEnd);
}

void updateConfigCharacteristic() {
  if (configCharacteristic) {
    configCharacteristic->setValue(configPayload().c_str());
  }
}

class BraceletServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) {
    bleClientConnected = true;
    Serial.println("client connected");
  }

  void onDisconnect(BLEServer *server) {
    bleClientConnected = false;
    Serial.println("client disconnected");
    server->startAdvertising();
  }
};

class BraceletConfigCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) {
    auto rawValue = characteristic->getValue();
    String json = String(rawValue.c_str());

    Serial.print("received config: ");
    Serial.println(json);

    int nextInterval = jsonIntValue(json, "readingIntervalSeconds", readingIntervalSeconds);
    if (nextInterval > 0) {
      readingIntervalSeconds = (unsigned long)nextInterval;
    }

    linkedPatientId = jsonStringValue(json, "patientId", linkedPatientId);
    lastVitalsSentMs = 0;
    updateConfigCharacteristic();

    Serial.print("linked patient ID: ");
    Serial.println(linkedPatientId.length() > 0 ? linkedPatientId : "(not set)");
  }
};

void setupBLE() {
  BLEDevice::init(DEVICE_ID);

  bleServer = BLEDevice::createServer();
  bleServer->setCallbacks(new BraceletServerCallbacks());

  BLEService *service = bleServer->createService(BLE_SERVICE_UUID);

  vitalsCharacteristic = service->createCharacteristic(
    VITALS_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  vitalsCharacteristic->addDescriptor(new BLE2902());
  vitalsCharacteristic->setValue(lastVitalsPayload.c_str());

  configCharacteristic = service->createCharacteristic(
    CONFIG_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  configCharacteristic->setCallbacks(new BraceletConfigCallbacks());
  updateConfigCharacteristic();

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BLE_SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE started");
}

void sendVitalsIfDue(int finalHR, int finalSpO2, float shownTemp) {
  if (linkedPatientId.length() == 0) return;
  if (finalHR <= 0 || finalSpO2 <= 0 || shownTemp <= 0) return;

  unsigned long nowMs = millis();
  unsigned long intervalMs = readingIntervalSeconds * 1000UL;
  if (lastVitalsSentMs != 0 && nowMs - lastVitalsSentMs < intervalMs) return;

  String json = "{";
  json += "\"deviceId\":\"";
  json += DEVICE_ID;
  json += "\",\"heartRate\":";
  json += finalHR;
  json += ",\"spo2\":";
  json += finalSpO2;
  json += ",\"temperature\":";
  json += String(shownTemp, 1);
  json += ",\"timestamp\":";
  json += nowMs / 1000UL;
  json += "}";

  lastVitalsPayload = json;
  vitalsCharacteristic->setValue(lastVitalsPayload.c_str());

  if (bleClientConnected) {
    Serial.print("sending vitals: ");
    Serial.println(lastVitalsPayload);
    vitalsCharacteristic->notify();
  }

  lastVitalsSentMs = nowMs;
}

// ==================================================
// Utility functions
// ==================================================

void resetAll() {
  hrHistIndex = 0;
  hrHistCount = 0;

  spo2HistIndex = 0;
  spo2HistCount = 0;

  tempHistIndex = 0;
  tempHistCount = 0;

  initialBufferFilled = false;
  contactStable = false;
  contactStartMs = 0;
  noContactCount = 0;

  displayedTemp = -1.0;
}

uint32_t averageLast(uint32_t *buf, int len, int count) {
  if (count > len) count = len;

  uint64_t sum = 0;
  for (int i = len - count; i < len; i++) {
    sum += buf[i];
  }
  return (uint32_t)(sum / count);
}

uint32_t minValue(uint32_t *buf, int len) {
  uint32_t m = buf[0];
  for (int i = 1; i < len; i++) {
    if (buf[i] < m) m = buf[i];
  }
  return m;
}

uint32_t maxValue(uint32_t *buf, int len) {
  uint32_t m = buf[0];
  for (int i = 1; i < len; i++) {
    if (buf[i] > m) m = buf[i];
  }
  return m;
}

float clampFloat(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

int smoothHR(int value) {
  if (value < HR_MIN || value > HR_MAX) return -1;

  if (hrHistCount >= 3) {
    long sum = 0;
    for (int i = 0; i < hrHistCount; i++) {
      sum += hrHistory[i];
    }
    int avg = (int)(sum / hrHistCount);

    if (abs(value - avg) > 20) {
      value = avg;
    }
  }

  hrHistory[hrHistIndex] = value;
  hrHistIndex = (hrHistIndex + 1) % HR_HISTORY_SIZE;
  if (hrHistCount < HR_HISTORY_SIZE) hrHistCount++;

  long sum = 0;
  for (int i = 0; i < hrHistCount; i++) {
    sum += hrHistory[i];
  }

  return (int)(sum / hrHistCount);
}

int smoothSpO2(int value) {
  if (value < SPO2_MIN || value > SPO2_MAX) return -1;

  if (spo2HistCount >= 3) {
    long sum = 0;
    for (int i = 0; i < spo2HistCount; i++) {
      sum += spo2History[i];
    }
    int avg = (int)(sum / spo2HistCount);

    if (abs(value - avg) > 3) {
      value = avg;
    }
  }

  spo2History[spo2HistIndex] = value;
  spo2HistIndex = (spo2HistIndex + 1) % SPO2_HISTORY_SIZE;
  if (spo2HistCount < SPO2_HISTORY_SIZE) spo2HistCount++;

  long sum = 0;
  for (int i = 0; i < spo2HistCount; i++) {
    sum += spo2History[i];
  }

  return (int)(sum / spo2HistCount);
}

float smoothTemp(float value) {
  if (value < 20.0 || value > 45.0) return -1.0;

  tempHistory[tempHistIndex] = value;
  tempHistIndex = (tempHistIndex + 1) % TEMP_HISTORY_SIZE;
  if (tempHistCount < TEMP_HISTORY_SIZE) tempHistCount++;

  float sum = 0.0;
  for (int i = 0; i < tempHistCount; i++) {
    sum += tempHistory[i];
  }

  return sum / tempHistCount;
}

// ==================================================
// MAX30205
// ==================================================

bool i2cExists(uint8_t addr) {
  Wire.beginTransmission(addr);
  return (Wire.endTransmission() == 0);
}

void findMAX30205() {
  max30205Found = false;
  max30205Addr = 0;

  for (uint8_t addr = 0x48; addr <= 0x4F; addr++) {
    if (i2cExists(addr)) {
      max30205Addr = addr;
      max30205Found = true;
      return;
    }
  }
}

float readMAX30205Raw() {
  if (!max30205Found) return -999.0;

  Wire.beginTransmission(max30205Addr);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return -999.0;

  Wire.requestFrom((uint8_t)max30205Addr, (uint8_t)2);
  if (Wire.available() < 2) return -999.0;

  uint8_t msb = Wire.read();
  uint8_t lsb = Wire.read();

  int16_t rawTemp = ((int16_t)msb << 8) | lsb;
  return rawTemp * 0.00390625;
}

float calibrateBodyTemp(float sensorTemp) {
  float bodyTemp = sensorTemp + TEMP_OFFSET;

  // small startup compensation
  float tSec = (millis() - contactStartMs) / 1000.0;
  if (tSec < 30.0) {
    bodyTemp -= 0.3;
  }

  if (bodyTemp < TEMP_BODY_MIN || bodyTemp > TEMP_BODY_MAX) return -1.0;
  return bodyTemp;
}

float getFinalTemp() {
  float raw = readMAX30205Raw();
  if (raw < 0) return -1.0;

  float sm = smoothTemp(raw);
  if (sm < 0) return -1.0;

  if (!contactStable) return -1.0;

  float tSec = (millis() - contactStartMs) / 1000.0;

  // warm-up time before trusting temperature
  if (tSec < 10.0) return -1.0;

  return calibrateBodyTemp(sm);
}

float getDisplayedTemp(float finalTemp) {
  if (finalTemp <= 0) return -1.0;

  float target = clampFloat(finalTemp, TEMP_DISPLAY_MIN, TEMP_DISPLAY_MAX);

  if (displayedTemp < 0) {
    displayedTemp = target;
    return displayedTemp;
  }

  // smooth movement toward target
  float blended = displayedTemp + TEMP_BLEND_ALPHA * (target - displayedTemp);

  // limit step size per reading
  float delta = blended - displayedTemp;
  if (delta > TEMP_MAX_STEP_PER_READ) delta = TEMP_MAX_STEP_PER_READ;
  if (delta < -TEMP_MAX_STEP_PER_READ) delta = -TEMP_MAX_STEP_PER_READ;

  displayedTemp += delta;
  displayedTemp = clampFloat(displayedTemp, TEMP_DISPLAY_MIN, TEMP_DISPLAY_MAX);

  return displayedTemp;
}

// ==================================================
// Sensor reading
// ==================================================

bool quickContactCheck() {
  particleSensor.check();

  uint32_t ir = particleSensor.getIR();
  uint32_t red = particleSensor.getRed();

  if (ir < CONTACT_IR_THRESHOLD) return false;
  if (red < CONTACT_RED_THRESHOLD) return false;

  uint32_t localMin = 0xFFFFFFFF;
  uint32_t localMax = 0;

  for (int i = 0; i < 8; i++) {
    while (!particleSensor.available()) {
      particleSensor.check();
    }

    uint32_t v = particleSensor.getIR();
    if (v < localMin) localMin = v;
    if (v > localMax) localMax = v;

    particleSensor.nextSample();
  }

  uint32_t ac = localMax - localMin;
  if (ac < CONTACT_AC_THRESHOLD) return false;

  return true;
}

void fillInitialBuffer() {
  for (int i = 0; i < BUFFER_LENGTH; i++) {
    while (!particleSensor.available()) {
      particleSensor.check();
    }

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }
}

void updateBuffer() {
  for (int i = NEW_SAMPLES; i < BUFFER_LENGTH; i++) {
    redBuffer[i - NEW_SAMPLES] = redBuffer[i];
    irBuffer[i - NEW_SAMPLES] = irBuffer[i];
  }

  for (int i = BUFFER_LENGTH - NEW_SAMPLES; i < BUFFER_LENGTH; i++) {
    while (!particleSensor.available()) {
      particleSensor.check();
    }

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }
}

const char* qualityLabel(uint32_t avgIR) {
  if (avgIR < CONTACT_IR_THRESHOLD) return "NO_CONTACT";
  if (avgIR < GOOD_IR_THRESHOLD) return "WEAK";
  return "GOOD";
}

// ==================================================
// Setup
// ==================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=== Wrist Bracelet Monitor ===");

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("ERROR: MAX30102 not found!");
    while (1) {
      delay(1000);
    }
  }

  Serial.println("MAX30102 OK");

  particleSensor.setup(0x7F, 4, 2, 100, 411, 16384);

  findMAX30205();

  if (max30205Found) {
    Serial.print("MAX30205 OK at 0x");
    if (max30205Addr < 16) Serial.print("0");
    Serial.println(max30205Addr, HEX);

    Wire.beginTransmission(max30205Addr);
    Wire.write(0x01);
    Wire.write(0x00);
    Wire.endTransmission();
  } else {
    Serial.println("MAX30205 not found on 0x48..0x4F");
  }

  setupBLE();

  Serial.println("Ready. Wear snugly and keep still.");
}

// ==================================================
// Loop
// ==================================================

void loop() {
  bool contact = quickContactCheck();

  if (!contact) {
    noContactCount++;

    if (noContactCount >= 4) {
      resetAll();
      Serial.println("[NO_CONTACT] No valid wrist contact");
      delay(300);
    }
    return;
  }

  noContactCount = 0;

  if (!contactStable) {
    contactStable = true;
    contactStartMs = millis();
    initialBufferFilled = false;

    hrHistIndex = 0;
    hrHistCount = 0;
    spo2HistIndex = 0;
    spo2HistCount = 0;
    tempHistIndex = 0;
    tempHistCount = 0;
    displayedTemp = -1.0;

    Serial.println("Contact detected. Stabilizing...");
  }

  if (!initialBufferFilled) {
    fillInitialBuffer();
    initialBufferFilled = true;
    Serial.println("Initial data ready.");
  } else {
    updateBuffer();
  }

  uint32_t avgIR = averageLast(irBuffer, BUFFER_LENGTH, 20);
  uint32_t avgRed = averageLast(redBuffer, BUFFER_LENGTH, 20);
  uint32_t acIR = maxValue(irBuffer, BUFFER_LENGTH) - minValue(irBuffer, BUFFER_LENGTH);

  if (avgIR < CONTACT_IR_THRESHOLD || avgRed < CONTACT_RED_THRESHOLD || acIR < CONTACT_AC_THRESHOLD) {
    resetAll();
    Serial.println("[NO_CONTACT] Weak or floating signal");
    delay(200);
    return;
  }

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_LENGTH, redBuffer,
    &spo2, &validSpO2, &heartRate, &validHeartRate
  );

  float contactTimeSec = (millis() - contactStartMs) / 1000.0;

  int finalHR = -1;
  if (validHeartRate && heartRate >= HR_MIN && heartRate <= HR_MAX && avgIR >= GOOD_IR_THRESHOLD) {
    int hrSm = smoothHR((int)heartRate);
    if (hrSm > 0) {
      finalHR = hrSm + HR_CORRECTION;
      if (finalHR < HR_MIN || finalHR > HR_MAX) finalHR = -1;
    }
  }

  int finalSpO2 = -1;
  if (validSpO2 && spo2 >= 75 && spo2 <= 100 && avgIR >= GOOD_IR_THRESHOLD && contactTimeSec >= 8.0) {
    int spo2Adj = (int)spo2 + SPO2_CORRECTION;
    if (spo2Adj > 100) spo2Adj = 100;

    int spo2Sm = smoothSpO2(spo2Adj);
    if (spo2Sm >= SPO2_MIN && spo2Sm <= SPO2_MAX) {
      finalSpO2 = spo2Sm;
    }
  }

  float finalTemp = getFinalTemp();
  float shownTemp = getDisplayedTemp(finalTemp);

  Serial.print("[");
  Serial.print(qualityLabel(avgIR));
  Serial.print("] ");

  Serial.print("HR: ");
  if (finalHR > 0) {
    Serial.print(finalHR);
    Serial.print(" BPM");
  } else {
    Serial.print("--");
  }

  Serial.print(" | SpO2: ");
  if (finalSpO2 > 0) {
    Serial.print(finalSpO2);
    Serial.print("%");
  } else {
    Serial.print("--");
  }

  Serial.print(" | Temp: ");
  if (shownTemp > 0) {
    Serial.print(shownTemp, 1);
    Serial.print(" C");
  } else if (max30205Found) {
    Serial.print("waiting");
  } else {
    Serial.print("sensor NA");
  }

  Serial.print(" | IR:");
  Serial.print(avgIR);

  Serial.print(" | RED:");
  Serial.print(avgRed);

  Serial.print(" | AC:");
  Serial.print(acIR);

  Serial.print(" | rawHR:");
  if (validHeartRate) {
    Serial.print((int)heartRate);
  } else {
    Serial.print("--");
  }

  Serial.print(" | rawSpO2:");
  if (validSpO2) {
    Serial.print((int)spo2);
  } else {
    Serial.print("--");
  }

  Serial.print(" | rawTemp:");
  float rawTempNow = readMAX30205Raw();
  if (rawTempNow > 0) {
    Serial.print(rawTempNow, 2);
  } else {
    Serial.print("--");
  }

  Serial.println();

  sendVitalsIfDue(finalHR, finalSpO2, shownTemp);

  delay(120);
}
