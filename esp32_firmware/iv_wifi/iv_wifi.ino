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

#include "wifi_config.h"
const int   SERVER_PORT = 443;
const char* SERVER_PATH = "/esp32";

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------
#define WIFI_CONNECT_TIMEOUT_MS  15000   // give up on one attempt after 15 s
#define WIFI_RETRY_DELAY_MS       5000   // wait before next attempt
#define PRIME_DURATION_MS         2000   // how long to run PRIME

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
#define PUMP3_IN1    4
#define PUMP3_IN2   16

// ---------------------------------------------------------------------------
// SEQUENTIAL pins
// ---------------------------------------------------------------------------
#define VALVE5_PIN  18
#define VALVE6_PIN   5
#define VALVE7_PIN  17

#define PUMP4_PWM   12
#define PUMP4_IN1   15
#define PUMP4_IN2    2

// ---------------------------------------------------------------------------
// PWM
// ---------------------------------------------------------------------------
#define PWM_FREQ       1000
#define PWM_RESOLUTION    8   // 8-bit: 0–255
#define MIN_PWM         235   // minimum duty that makes the pump spin

// ---------------------------------------------------------------------------
// WiFi state machine
// ---------------------------------------------------------------------------
enum class WiFiPhase { CONNECTING, CONNECTED, WAITING_RETRY };
static WiFiPhase  wifiPhase       = WiFiPhase::CONNECTING;
static uint32_t   wifiAttemptMs   = 0;
static uint32_t   wifiRetryMs     = 0;
static bool       wsStarted       = false;

// ---------------------------------------------------------------------------
// Sequential session state
// ---------------------------------------------------------------------------
struct SeqStep {
  int           valve;
  float         flowRate;   // mL/min
  float         volume;     // mL
  unsigned long delayMs;    // inter-step delay in milliseconds
};

static SeqStep        seqSteps[3];
static int            seqStepCount  = 0;
static int            currentStep   = 0;
static bool           seqRunning    = false;
static bool           seqPaused     = false;
static unsigned long  stepStartMs   = 0;
static unsigned long  stepRemainingMs = 0;

// Non-blocking inter-step delay
static bool           stepDelaying  = false;
static unsigned long  delayStartMs  = 0;
static unsigned long  pendingDelayMs = 0;
static bool           pausedDuringDelay = false;

// Non-blocking PRIME
static bool           priming       = false;
static unsigned long  primeStartMs  = 0;
static bool           seqStartPending = false;

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------
static WebSocketsClient webSocket;
static bool             wsConnected = false;

// ---------------------------------------------------------------------------
// Hardware helpers
// ---------------------------------------------------------------------------
int flowToPWM(float mlMin) {
  if (mlMin <= 0) return 0;
  return constrain(
    (int)(MIN_PWM + ((mlMin - 1.0f) / 16.0f) * (255 - MIN_PWM)),
    MIN_PWM, 255
  );
}

int valvePin(int v) {
  switch (v) {
    case 5: return VALVE5_PIN;
    case 6: return VALVE6_PIN;
    default: return VALVE7_PIN;
  }
}

void runPump(int pwmPin, int in1, int in2, int speed) {
  if (speed > 0) {
    digitalWrite(in1, HIGH);
    digitalWrite(in2, LOW);
  } else {
    digitalWrite(in1, LOW);
    digitalWrite(in2, LOW);
  }
  ledcWrite(pwmPin, speed > 0 ? speed : 0);
}

void stopAllParallel() {
  runPump(PUMP1_PWM, PUMP1_IN1, PUMP1_IN2, 0);
  runPump(PUMP2_PWM, PUMP2_IN1, PUMP2_IN2, 0);
  runPump(PUMP3_PWM, PUMP3_IN1, PUMP3_IN2, 0);
  digitalWrite(VALVE2_PIN, HIGH);
  digitalWrite(VALVE3_PIN, HIGH);
  digitalWrite(VALVE4_PIN, HIGH);
}

void stopAllSequential() {
  runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, 0);
  digitalWrite(VALVE5_PIN, HIGH);
  digitalWrite(VALVE6_PIN, HIGH);
  digitalWrite(VALVE7_PIN, HIGH);
}

// Patient-safety stop — called whenever the connection drops unexpectedly
void emergencyStop() {
  stopAllParallel();
  stopAllSequential();
  seqRunning    = false;
  seqPaused     = false;
  seqStepCount  = 0;
  currentStep   = 0;
  stepDelaying  = false;
  stepRemainingMs = 0;
  pendingDelayMs = 0;
  pausedDuringDelay = false;
  priming       = false;
  seqStartPending = false;
  Serial.println("[SAFETY] Emergency stop — all valves closed, all pumps off.");
}

// ---------------------------------------------------------------------------
// WiFi management — non-blocking, called every loop()
// ---------------------------------------------------------------------------
void wifiBeginConnect() {
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // disable power-save: lower latency, more reliable
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  wifiAttemptMs = millis();
  wifiPhase     = WiFiPhase::CONNECTING;
  wsStarted     = false;
  Serial.printf("[WiFi] Connecting to \"%s\"…\n", WIFI_SSID);
}

void handleWiFi() {
  switch (wifiPhase) {

    case WiFiPhase::CONNECTING:
      if (WiFi.status() == WL_CONNECTED) {
        wifiPhase = WiFiPhase::CONNECTED;
        Serial.printf("[WiFi] Connected! IP: %s  RSSI: %d dBm\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
        // Start (or restart) the WebSocket client
        if (!wsStarted) {
          webSocket.beginSSL(SERVER_HOST, SERVER_PORT, SERVER_PATH);
          webSocket.onEvent(webSocketEvent);
          webSocket.setReconnectInterval(3000);
          // Heartbeat: ping every 15 s, expect pong within 5 s, disconnect after 2 misses
          webSocket.enableHeartbeat(15000, 5000, 2);
          wsStarted = true;
        } else {
          webSocket.beginSSL(SERVER_HOST, SERVER_PORT, SERVER_PATH);
        }
      } else if (millis() - wifiAttemptMs > WIFI_CONNECT_TIMEOUT_MS) {
        Serial.printf("[WiFi] Timeout — retrying in %d s\n", WIFI_RETRY_DELAY_MS / 1000);
        WiFi.disconnect(true);
        wifiRetryMs = millis();
        wifiPhase   = WiFiPhase::WAITING_RETRY;
      }
      break;

    case WiFiPhase::CONNECTED:
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WiFi] Connection lost!");
        wsConnected = false;
        webSocket.disconnect();
        emergencyStop();
        wifiRetryMs = millis();
        wifiPhase   = WiFiPhase::WAITING_RETRY;
      }
      break;

    case WiFiPhase::WAITING_RETRY:
      if (millis() - wifiRetryMs > WIFI_RETRY_DELAY_MS) {
        wifiBeginConnect();
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// Sequential step runner — non-blocking, called every loop()
// ---------------------------------------------------------------------------
unsigned long remainingMs(unsigned long startedAt, unsigned long duration) {
  const unsigned long elapsed = millis() - startedAt;
  return elapsed >= duration ? 0 : duration - elapsed;
}

void runCurrentStep(bool announceStart) {
  if (currentStep >= seqStepCount) {
    seqRunning = false;
    seqPaused = false;
    stepDelaying = false;
    stopAllSequential();
    if (wsConnected) webSocket.sendTXT("SEQ_COMPLETE");
    Serial.println("[SEQ] All steps complete.");
    return;
  }

  stopAllSequential();
  SeqStep& s = seqSteps[currentStep];
  digitalWrite(valvePin(s.valve), LOW);
  runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, flowToPWM(s.flowRate));
  stepStartMs = millis();

  if (announceStart) {
    char msg[32];
    snprintf(msg, sizeof(msg), "STEP_START %d", s.valve);
    if (wsConnected) webSocket.sendTXT(msg);
    Serial.printf("[SEQ] Step %d — valve %d  %.2f mL/min  %.1f mL\n",
                  currentStep + 1, s.valve, s.flowRate, s.volume);
  } else {
    Serial.printf("[SEQ] Resumed step %d with %lu ms remaining.\n",
                  currentStep + 1, stepRemainingMs);
  }
}

void startStep(int idx) {
  stepDelaying = false;
  pausedDuringDelay = false;
  if (idx >= seqStepCount) {
    seqRunning = false;
    seqPaused = false;
    stopAllSequential();
    if (wsConnected) webSocket.sendTXT("SEQ_COMPLETE");
    Serial.println("[SEQ] All steps complete.");
    return;
  }

  currentStep = idx;
  SeqStep& s = seqSteps[idx];
  stepRemainingMs = (unsigned long)((s.volume / s.flowRate) * 60000.0f);
  runCurrentStep(true);
}

void completeCurrentStep() {
  SeqStep& completedStep = seqSteps[currentStep];
  digitalWrite(valvePin(completedStep.valve), HIGH);
  runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, 0);
  Serial.printf("[SEQ] Step %d done.\n", currentStep + 1);

  const unsigned long delayMs = completedStep.delayMs;
  currentStep++;
  if (delayMs > 0 && currentStep < seqStepCount) {
    stepDelaying = true;
    delayStartMs = millis();
    pendingDelayMs = delayMs;
    pausedDuringDelay = false;
    Serial.printf("[SEQ] Inter-step delay: %lu ms\n", delayMs);
  } else {
    startStep(currentStep);
  }
}

void beginSequentialRun() {
  priming = false;
  seqStartPending = false;
  seqRunning = true;
  seqPaused = false;
  currentStep = 0;
  startStep(0);
  if (wsConnected) webSocket.sendTXT("SEQ_STARTED");
}

void tickSequential() {
  if (!seqRunning || seqPaused) return;

  // Waiting between steps
  if (stepDelaying) {
    if (millis() - delayStartMs >= pendingDelayMs) {
      stepDelaying = false;
      startStep(currentStep);
    }
    return;
  }

  // Check if current step has finished
  if (millis() - stepStartMs >= stepRemainingMs) {
    completeCurrentStep();
  }
}

// Non-blocking PRIME — called every loop()
void tickPrime() {
  if (!priming) return;
  if (millis() - primeStartMs >= PRIME_DURATION_MS) {
    priming = false;
    stopAllSequential();
    if (wsConnected) webSocket.sendTXT("PRIME_DONE");
    Serial.println("[PRIME] Done.");
    if (seqStartPending && !seqPaused) {
      beginSequentialRun();
    } else if (seqStartPending) {
      Serial.println("[SEQ] Priming complete; waiting for RESUME.");
    }
  }
}

// ---------------------------------------------------------------------------
// Command parser
// ---------------------------------------------------------------------------
void handleCommand(const String& raw) {
  String cmd = raw;
  cmd.trim();
  Serial.println("[CMD] " + cmd);

  if (cmd.startsWith("PARALLEL ")) {
    float f1 = 0, f2 = 0, f3 = 0;
    sscanf(cmd.c_str(), "PARALLEL %f %f %f", &f1, &f2, &f3);
    digitalWrite(VALVE2_PIN, f1 > 0 ? LOW : HIGH);
    digitalWrite(VALVE3_PIN, f2 > 0 ? LOW : HIGH);
    digitalWrite(VALVE4_PIN, f3 > 0 ? LOW : HIGH);
    runPump(PUMP1_PWM, PUMP1_IN1, PUMP1_IN2, flowToPWM(f1));
    runPump(PUMP2_PWM, PUMP2_IN1, PUMP2_IN2, flowToPWM(f2));
    runPump(PUMP3_PWM, PUMP3_IN1, PUMP3_IN2, flowToPWM(f3));
    webSocket.sendTXT("PARALLEL_RUNNING");

  } else if (cmd == "SEQRESET") {
    if (seqRunning || priming) {
      webSocket.sendTXT("ERROR: sequence active");
      return;
    }
    stopAllSequential();
    seqStepCount = 0;
    currentStep = 0;
    seqPaused = false;
    stepDelaying = false;
    stepRemainingMs = 0;
    pendingDelayMs = 0;
    pausedDuringDelay = false;
    seqStartPending = false;
    webSocket.sendTXT("SEQRESET_OK");

  } else if (cmd.startsWith("SEQSET ")) {
    if (seqRunning || priming) { webSocket.sendTXT("ERROR: sequence active"); return; }
    if (seqStepCount >= 3) { webSocket.sendTXT("ERROR: max 3 steps"); return; }
    SeqStep s = {0, 0.0f, 0.0f, 0};
    unsigned long delaySec = 0;
    // Backend sends delay in SECONDS — convert to ms here
    const int parsed = sscanf(
      cmd.c_str(), "SEQSET %d %f %f %lu",
      &s.valve, &s.flowRate, &s.volume, &delaySec
    );
    if (parsed < 3 || s.valve < 5 || s.valve > 7 ||
        s.flowRate <= 0.0f || s.volume <= 0.0f) {
      webSocket.sendTXT("ERROR: invalid SEQSET");
      return;
    }
    s.delayMs = delaySec * 1000UL;
    seqSteps[seqStepCount++] = s;
    webSocket.sendTXT("SEQSET_OK");

  } else if (cmd == "PRIME") {
    if (seqRunning || seqStepCount == 0) {
      webSocket.sendTXT("ERROR: configure sequence first");
      return;
    }
    stopAllSequential();
    priming      = true;
    primeStartMs = millis();
    digitalWrite(valvePin(seqSteps[0].valve), LOW);
    runPump(PUMP4_PWM, PUMP4_IN1, PUMP4_IN2, MIN_PWM);
    Serial.println("[PRIME] Running…");

  } else if (cmd == "START") {
    if (seqStepCount == 0) { webSocket.sendTXT("ERROR: no steps configured"); return; }
    if (seqRunning) { webSocket.sendTXT("ERROR: sequence already running"); return; }
    if (priming) {
      seqStartPending = true;
      webSocket.sendTXT("START_PENDING");
      Serial.println("[SEQ] Start queued until priming completes.");
    } else {
      beginSequentialRun();
    }

  } else if (cmd == "PAUSE") {
    if (priming && seqStartPending && !seqPaused) {
      seqPaused = true;
      webSocket.sendTXT("PAUSED");
      Serial.println("[SEQ] Start paused during priming.");
      return;
    }
    if (!seqRunning || seqPaused) {
      webSocket.sendTXT("ERROR: sequence not running");
      return;
    }

    if (stepDelaying) {
      pendingDelayMs = remainingMs(delayStartMs, pendingDelayMs);
      pausedDuringDelay = true;
    } else {
      stepRemainingMs = remainingMs(stepStartMs, stepRemainingMs);
      pausedDuringDelay = false;
    }

    seqPaused = true;
    stopAllSequential();
    webSocket.sendTXT("PAUSED");

  } else if (cmd == "RESUME") {
    if (seqStartPending && seqPaused) {
      seqPaused = false;
      if (!priming) {
        beginSequentialRun();
      }
      webSocket.sendTXT("RESUMED");
      return;
    }
    if (!seqRunning || !seqPaused) {
      webSocket.sendTXT("ERROR: sequence not paused");
      return;
    }

    seqPaused = false;
    if (pausedDuringDelay) {
      pausedDuringDelay = false;
      if (pendingDelayMs == 0) {
        stepDelaying = false;
        startStep(currentStep);
      } else {
        stepDelaying = true;
        delayStartMs = millis();
        Serial.printf("[SEQ] Resumed delay with %lu ms remaining.\n", pendingDelayMs);
      }
    } else if (stepRemainingMs == 0) {
      completeCurrentStep();
    } else {
      runCurrentStep(false);
    }
    webSocket.sendTXT("RESUMED");

  } else if (cmd == "STOPPARALLEL") {
    stopAllParallel();
    webSocket.sendTXT("PARALLEL_STOPPED");

  } else if (cmd == "STOPSEQ") {
    seqRunning   = false;
    seqPaused    = false;
    seqStepCount = 0;
    currentStep  = 0;
    stepDelaying = false;
    stepRemainingMs = 0;
    pendingDelayMs = 0;
    pausedDuringDelay = false;
    priming = false;
    seqStartPending = false;
    stopAllSequential();
    webSocket.sendTXT("SEQ_STOPPED");

  } else {
    webSocket.sendTXT("UNKNOWN_CMD");
  }
}

// ---------------------------------------------------------------------------
// WebSocket event handler
// ---------------------------------------------------------------------------
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      wsConnected = false;
      emergencyStop();
      Serial.println("[WS] Disconnected — retrying…");
      break;

    case WStype_CONNECTED:
      wsConnected = true;
      Serial.printf("[WS] Connected to %s:%d%s\n", SERVER_HOST, SERVER_PORT, SERVER_PATH);
      webSocket.sendTXT("ESP32_READY");
      break;

    case WStype_TEXT:
      handleCommand(String((char*)payload));
      break;

    case WStype_PING:
      Serial.println("[WS] Ping received.");
      break;

    case WStype_PONG:
      Serial.println("[WS] Pong received.");
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  Serial.println("\n[EXIR] Booting…");

  // All valves CLOSED (active-LOW relay: HIGH = closed)
  int valvePins[] = {VALVE2_PIN, VALVE3_PIN, VALVE4_PIN,
                     VALVE5_PIN, VALVE6_PIN, VALVE7_PIN};
  for (int p : valvePins) { pinMode(p, OUTPUT); digitalWrite(p, HIGH); }

  // All motor direction pins LOW (stopped)
  int dirPins[] = {PUMP1_IN1, PUMP1_IN2, PUMP2_IN1, PUMP2_IN2,
                   PUMP3_IN1, PUMP3_IN2, PUMP4_IN1, PUMP4_IN2};
  for (int p : dirPins) { pinMode(p, OUTPUT); digitalWrite(p, LOW); }

  // PWM — ESP32 Arduino core 3.x
  ledcAttach(PUMP1_PWM, PWM_FREQ, PWM_RESOLUTION);
  ledcAttach(PUMP2_PWM, PWM_FREQ, PWM_RESOLUTION);
  ledcAttach(PUMP3_PWM, PWM_FREQ, PWM_RESOLUTION);
  ledcAttach(PUMP4_PWM, PWM_FREQ, PWM_RESOLUTION);

  /*
   * If you are on ESP32 core 2.x, replace the four ledcAttach() lines above
   * with these eight lines, and change every ledcWrite(pin, val) to
   * ledcWrite(channel, val) using channel 0/1/2/3 for Pump1/2/3/4:
   *
   *   ledcSetup(0, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(PUMP1_PWM, 0);
   *   ledcSetup(1, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(PUMP2_PWM, 1);
   *   ledcSetup(2, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(PUMP3_PWM, 2);
   *   ledcSetup(3, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(PUMP4_PWM, 3);
   */

  // Start WiFi (non-blocking from here on — managed in loop via handleWiFi)
  wifiBeginConnect();
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
void loop() {
  handleWiFi();          // reconnects WiFi automatically if it drops

  if (wifiPhase == WiFiPhase::CONNECTED) {
    webSocket.loop();    // processes WebSocket frames and heartbeat
  }

  tickPrime();           // completes non-blocking PRIME
  tickSequential();      // advances sequential infusion steps
}
