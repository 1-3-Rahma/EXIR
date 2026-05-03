/**
 * EXIR IV Regulator — ESP32 WiFi Firmware
 *
 * Required library: "WebSockets" by Markus Sattler (Arduino Library Manager)
 *
 * RELAY: ACTIVE LOW  →  LOW = valve OPEN, HIGH = valve CLOSED
 *
 * PARALLEL SUBSYSTEM
 *   Valve2 → GPIO 22      Valve3 → GPIO 21      Valve4 → GPIO 19
 *   Pump1  → PWM:25  IN1:13  IN2:14
 *   Pump2  → PWM:33  IN1:27  IN2:26
 *   Pump3  → PWM:32  IN1:4   IN2:16
 *
 * SEQUENTIAL SUBSYSTEM
 *   Valve5 → GPIO 18      Valve6 → GPIO 5       Valve7 → GPIO 17
 *   Pump4  → PWM:12  IN1:15  IN2:2
 */

#include <WiFi.h>
#include <WebSocketsClient.h>

// ---------------------------------------------------------------------------
// WiFi + server — loaded from wifi_config.h (not committed to git)
// Copy wifi_config.h.example → wifi_config.h and fill in your values
// ---------------------------------------------------------------------------
#include "wifi_config.h"
const int   SERVER_PORT   = 5000;
const char* SERVER_PATH   = "/esp32";

// ---------------------------------------------------------------------------
// PARALLEL pins
// ---------------------------------------------------------------------------
#define VALVE2_PIN  22
#define VALVE3_PIN  21
#define VALVE4_PIN  19

#define PUMP1_PWM   25
#define PUMP1_IN1   13
#define PUMP1_IN2   14

#define PUMP2_PWM   33
#define PUMP2_IN1   27
#define PUMP2_IN2   26

#define PUMP3_PWM   32
#define PUMP3_IN1   4
#define PUMP3_IN2   16

// ---------------------------------------------------------------------------
// SEQUENTIAL pins
// ---------------------------------------------------------------------------
#define VALVE5_PIN  18
#define VALVE6_PIN  5
#define VALVE7_PIN  17

#define PUMP4_PWM   12
#define PUMP4_IN1   15
#define PUMP4_IN2   2

// ---------------------------------------------------------------------------
// PWM — ESP32 Arduino core 3.x (ledcAttach / ledcWrite per pin)
// If you are on core 2.x and get compile errors, see commented block below.
// ---------------------------------------------------------------------------
#define PWM_FREQ       1000
#define PWM_RESOLUTION 8   // 8-bit: 0–255

// ---------------------------------------------------------------------------
// Sequential state
// ---------------------------------------------------------------------------
struct SeqStep { int valve; float flowRate; float volume; int delayMs; };
SeqStep seqSteps[3];
int     seqStepCount = 0;
int     currentStep  = 0;
bool    seqRunning   = false;
bool    seqPaused    = false;
unsigned long stepStartMs = 0;

WebSocketsClient webSocket;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// MIN_PWM: minimum duty cycle that makes the pump spin (tune if needed)
// Maps 1 mL/min → MIN_PWM,  17 mL/min → 255
#define MIN_PWM 235

int flowToPWM(float mlMin) {
  if (mlMin <= 0) return 0;
  return constrain((int)(MIN_PWM + ((mlMin - 1.0f) / 16.0f) * (255 - MIN_PWM)), MIN_PWM, 255);
}

int valvePin(int v) {
  if (v == 5) return VALVE5_PIN;
  if (v == 6) return VALVE6_PIN;
  return VALVE7_PIN;
}

// Drive a motor driver (L298N / L293D style)
// speed=0 → brake; speed>0 → forward at that PWM duty
void runPump(int pwmPin, int in1, int in2, int speed) {
  if (speed > 0) {
    digitalWrite(in1, HIGH);
    digitalWrite(in2, LOW);
    ledcWrite(pwmPin, speed);
  } else {
    digitalWrite(in1, LOW);
    digitalWrite(in2, LOW);
    ledcWrite(pwmPin, 0);
  }
}

void stopAllParallel() {
  runPump(PUMP1_PWM, PUMP1_IN1, PUMP1_IN2, 0);
  runPump(PUMP2_PWM, PUMP2_IN1, PUMP2_IN2, 0);
  runPump(PUMP3_PWM, PUMP3_IN1, PUMP3_IN2, 0);
  digitalWrite(VALVE2_PIN, HIGH);  // close (active-LOW relay)
  digitalWrite(VALVE3_PIN, HIGH);
  digitalWrite(VALVE4_PIN, HIGH);
}

void stopAllSequential() {
  runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, 0);
  digitalWrite(VALVE5_PIN, HIGH);  // close
  digitalWrite(VALVE6_PIN, HIGH);
  digitalWrite(VALVE7_PIN, HIGH);
}

void startStep(int idx) {
  if (idx >= seqStepCount) {
    seqRunning = false;
    stopAllSequential();
    webSocket.sendTXT("SEQ_COMPLETE");
    Serial.println("[SEQ] Done.");
    return;
  }
  stopAllSequential();
  SeqStep& s = seqSteps[idx];
  digitalWrite(valvePin(s.valve), LOW);  // open valve (active-LOW)
  runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, flowToPWM(s.flowRate));
  stepStartMs = millis();
  String msg = "STEP_START " + String(s.valve);
  webSocket.sendTXT(msg.c_str());
  Serial.println("[SEQ] " + msg);
}

// ---------------------------------------------------------------------------
// Command parser
// ---------------------------------------------------------------------------
void handleCommand(String cmd) {
  cmd.trim();
  Serial.println("[CMD] " + cmd);

  // ── PARALLEL ─────────────────────────────────────────────────────────────
  if (cmd.startsWith("PARALLEL ")) {
    float f1 = 0, f2 = 0, f3 = 0;
    sscanf(cmd.c_str(), "PARALLEL %f %f %f", &f1, &f2, &f3);

    // Active-LOW: LOW = open, HIGH = closed
    digitalWrite(VALVE2_PIN, f1 > 0 ? LOW : HIGH);
    digitalWrite(VALVE3_PIN, f2 > 0 ? LOW : HIGH);
    digitalWrite(VALVE4_PIN, f3 > 0 ? LOW : HIGH);

    runPump(PUMP1_PWM, PUMP1_IN1, PUMP1_IN2, flowToPWM(f1));
    runPump(PUMP2_PWM, PUMP2_IN1, PUMP2_IN2, flowToPWM(f2));
    runPump(PUMP3_PWM, PUMP3_IN1, PUMP3_IN2, flowToPWM(f3));

    webSocket.sendTXT("PARALLEL_RUNNING");

  // ── SEQSET ───────────────────────────────────────────────────────────────
  } else if (cmd.startsWith("SEQSET ")) {
    if (seqStepCount >= 3) { webSocket.sendTXT("ERROR: max 3 steps"); return; }
    SeqStep s = {0, 0.0f, 0.0f, 0};
    sscanf(cmd.c_str(), "SEQSET %d %f %f %d", &s.valve, &s.flowRate, &s.volume, &s.delayMs);
    seqSteps[seqStepCount++] = s;
    webSocket.sendTXT("SEQSET_OK");

  // ── PRIME ────────────────────────────────────────────────────────────────
  } else if (cmd == "PRIME") {
    runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, 100);
    delay(2000);
    runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, 0);
    webSocket.sendTXT("PRIME_DONE");

  // ── START ────────────────────────────────────────────────────────────────
  } else if (cmd == "START") {
    seqRunning = true; seqPaused = false; currentStep = 0;
    startStep(0);
    webSocket.sendTXT("SEQ_STARTED");

  // ── PAUSE ────────────────────────────────────────────────────────────────
  } else if (cmd == "PAUSE") {
    seqPaused = true;
    runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, 0);
    webSocket.sendTXT("PAUSED");

  // ── RESUME ───────────────────────────────────────────────────────────────
  } else if (cmd == "RESUME") {
    seqPaused = false;
    startStep(currentStep);
    webSocket.sendTXT("RESUMED");

  // ── STOPPARALLEL ─────────────────────────────────────────────────────────
  } else if (cmd == "STOPPARALLEL") {
    stopAllParallel();
    webSocket.sendTXT("PARALLEL_STOPPED");

  // ── STOPSEQ ──────────────────────────────────────────────────────────────
  } else if (cmd == "STOPSEQ") {
    seqRunning = false; seqPaused = false;
    seqStepCount = 0;   currentStep = 0;
    stopAllSequential();
    webSocket.sendTXT("SEQ_STOPPED");

  } else {
    webSocket.sendTXT("UNKNOWN_CMD");
  }
}

// ---------------------------------------------------------------------------
// WebSocket event
// ---------------------------------------------------------------------------
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected — retrying…");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to backend!");
      webSocket.sendTXT("ESP32_READY");
      break;
    case WStype_TEXT:
      handleCommand(String((char*)payload));
      break;
    default: break;
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  Serial.println("\n[EXIR] Booting…");

  // ── Valve pins — all CLOSED at startup (HIGH = closed, active-LOW relay)
  pinMode(VALVE2_PIN, OUTPUT); digitalWrite(VALVE2_PIN, HIGH);
  pinMode(VALVE3_PIN, OUTPUT); digitalWrite(VALVE3_PIN, HIGH);
  pinMode(VALVE4_PIN, OUTPUT); digitalWrite(VALVE4_PIN, HIGH);
  pinMode(VALVE5_PIN, OUTPUT); digitalWrite(VALVE5_PIN, HIGH);
  pinMode(VALVE6_PIN, OUTPUT); digitalWrite(VALVE6_PIN, HIGH);
  pinMode(VALVE7_PIN, OUTPUT); digitalWrite(VALVE7_PIN, HIGH);

  // ── Motor driver direction pins — all LOW (stopped)
  int dirPins[] = {PUMP1_IN1, PUMP1_IN2, PUMP2_IN1, PUMP2_IN2,
                   PUMP3_IN1, PUMP3_IN2, PUMP4_IN1, PUMP4_IN2};
  for (int p : dirPins) { pinMode(p, OUTPUT); digitalWrite(p, LOW); }

  // ── PWM (ESP32 core 3.x: ledcAttach per pin)
  ledcAttach(PUMP1_PWM, PWM_FREQ, PWM_RESOLUTION);
  ledcAttach(PUMP2_PWM, PWM_FREQ, PWM_RESOLUTION);
  ledcAttach(PUMP3_PWM, PWM_FREQ, PWM_RESOLUTION);
  ledcAttach(PUMP4_PWM, PWM_FREQ, PWM_RESOLUTION);

  /*
   * ── If you are on ESP32 core 2.x and ledcAttach() does not compile,
   *    replace the four lines above with these eight lines:
   *
   *  ledcSetup(0, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(PUMP1_PWM, 0);
   *  ledcSetup(1, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(PUMP2_PWM, 1);
   *  ledcSetup(2, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(PUMP3_PWM, 2);
   *  ledcSetup(3, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(PUMP4_PWM, 3);
   *
   *  Also replace every  ledcWrite(pin, val)  with  ledcWrite(channel, val)
   *  using channels 0/1/2/3 for Pump1/2/3/4.
   */

  // ── WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());

  // ── WebSocket
  webSocket.begin(SERVER_HOST, SERVER_PORT, SERVER_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
void loop() {
  webSocket.loop();

  // Advance sequential steps by time (volume / flow rate)
  if (seqRunning && !seqPaused && currentStep < seqStepCount) {
    SeqStep& s = seqSteps[currentStep];
    unsigned long durationMs = (unsigned long)((s.volume / s.flowRate) * 60000.0f);
    if (millis() - stepStartMs >= durationMs) {
      digitalWrite(valvePin(s.valve), HIGH);          // close finished valve
      runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, 0);   // stop pump
      if (s.delayMs > 0) delay(s.delayMs);
      currentStep++;
      startStep(currentStep);
    }
  }
}
