/**
 * IV Regulator Routes  —  /api/iv/*
 *
 * All commands match the ESP32 firmware's exact serial protocol:
 *
 *  Mode:
 *    MODE PARALLEL
 *    MODE SEQUENTIAL
 *
 *  Parallel start:
 *    PARALLEL <f1> <f2> <f3>        (opens valves 2-4, starts pumps 1-3)
 *
 *  Sequential configure + run:
 *    SEQSET <valve> <flow> <vol>    (sent once per valve at configure time)
 *    PRIME                          (primes all 3 lines, ~10 s on ESP32)
 *    START                          (starts sequence)
 *    PAUSE / RESUME
 *    STOPSEQ
 *
 *  Parallel stop:
 *    STOPPARALLEL
 *
 *  General:
 *    STATUS
 */

const express = require('express');
const router  = express.Router();
const esp32Service    = require('../services/esp32Service');
const InfusionSession = require('../models/InfusionSession');
const InfusionLog     = require('../models/InfusionLog');

// ---------------------------------------------------------------------------
// In-memory session snapshot (mirrors the active MongoDB document)
// ---------------------------------------------------------------------------
let activeSession = null;
// shape: { sessionId, mode, config, status, primed, startedAt }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Send a command and return 503 to the client if the ESP32 is not connected.
 *  Returns true on success, false if a 503 was already sent.
 */
async function tryCommand(res, command) {
  try {
    await esp32Service.sendCommand(command);   // write + drain
    return true;
  } catch (err) {
    res.status(503).json({
      success: false,
      error: `ESP32 command failed: ${err.message}`,
    });
    return false;
  }
}

async function appendLog(sessionId, event, command) {
  const hw = esp32Service.getStatus();
  const entry = { timestamp: new Date(), event, command: command || null, response: hw.lastResponse || null };
  await Promise.all([
    InfusionSession.findOneAndUpdate(
      { sessionId },
      { $push: { logs: { timestamp: entry.timestamp, event, command: entry.command } } }
    ),
    InfusionLog.create({ sessionId, ...entry }),
  ]);
}

/** Create a new DB session, or reuse the current idle/running one.
 *  Always creates fresh when previous session is completed/error.
 */
async function ensureSession(mode) {
  const needsNew = !activeSession ||
    activeSession.status === 'completed' ||
    activeSession.status === 'error';

  if (needsNew) {
    const doc = await InfusionSession.create({ mode });
    activeSession = { sessionId: doc.sessionId, mode, config: null, status: 'idle', primed: false, startedAt: null };
  } else {
    activeSession.mode = mode;
  }
  return activeSession;
}

// ---------------------------------------------------------------------------
// GET /api/iv/ports
// ---------------------------------------------------------------------------
router.get('/ports', async (req, res) => {
  try {
    const ports = await esp32Service.listPorts();
    res.json({ success: true, ports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/connect  — Body: { portPath, baudRate }
// ---------------------------------------------------------------------------
router.post('/connect', async (req, res) => {
  try {
    const portPath = req.body.portPath || process.env.ESP32_SERIAL_PORT || 'COM9';
    const baudRate = parseInt(req.body.baudRate || process.env.ESP32_BAUD_RATE || '115200', 10);
    await esp32Service.connect(portPath, baudRate);
    res.json({ success: true, portPath, baudRate, message: `Connected to ${portPath}` });
  } catch (err) {
    res.status(503).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/disconnect
// ---------------------------------------------------------------------------
router.post('/disconnect', async (req, res) => {
  try {
    await esp32Service.disconnect();
    res.json({ success: true, message: 'Disconnected from ESP32' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/mode  — Body: { mode: "parallel" | "sequential" }
// Sends "MODE PARALLEL" or "MODE SEQUENTIAL" to the firmware.
// ---------------------------------------------------------------------------
router.post('/mode', async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['parallel', 'sequential'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'mode must be "parallel" or "sequential"' });
    }

    const cmd = mode === 'parallel' ? 'MODE PARALLEL' : 'MODE SEQUENTIAL';
    if (!await tryCommand(res, cmd)) return;

    await ensureSession(mode);
    await InfusionSession.findOneAndUpdate({ sessionId: activeSession.sessionId }, { mode });

    res.json({ success: true, mode });
  } catch (err) {
    console.error('[IV /mode]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/parallel  — Body: { pumps: [{pump,flowRateMlMin}, ...] }
// Stores config. Nothing sent to ESP32 yet — command goes on /start.
// ---------------------------------------------------------------------------
router.post('/parallel', async (req, res) => {
  try {
    const { pumps } = req.body;

    if (!Array.isArray(pumps) || pumps.length < 1 || pumps.length > 3) {
      return res.status(400).json({ success: false, error: 'pumps must be an array of 1–3 entries' });
    }
    for (const p of pumps) {
      if (![1, 2, 3].includes(Number(p.pump))) {
        return res.status(400).json({ success: false, error: `Pump number must be 1, 2, or 3 (got ${p.pump})` });
      }
      if (!p.flowRateMlMin || Number(p.flowRateMlMin) <= 0) {
        return res.status(400).json({ success: false, error: `flowRateMlMin for pump ${p.pump} must be > 0` });
      }
    }

    // Build the PARALLEL command string that will be sent on /start
    // Firmware: PARALLEL <f1> <f2> <f3>  — all 3 values required
    const byPump = [1, 2, 3].map((n) => {
      const found = pumps.find((p) => Number(p.pump) === n);
      return found ? Number(found.flowRateMlMin).toFixed(2) : '0.00';
    });
    const commandPreview = `PARALLEL ${byPump.join(' ')}`;

    await ensureSession('parallel');
    activeSession.config = { mode: 'parallel', pumps };

    await InfusionSession.findOneAndUpdate(
      { sessionId: activeSession.sessionId },
      { mode: 'parallel', config: activeSession.config }
    );
    await appendLog(activeSession.sessionId, 'CONFIG', commandPreview);

    res.json({ success: true, command: commandPreview });
  } catch (err) {
    console.error('[IV /parallel]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/sequential  — Body: { steps: [{valve,flowRateMlMin,volumeMl}, ...] }
// Sends SEQSET commands to the ESP32 immediately so the firmware has them
// stored before PRIME and START are called.
// ---------------------------------------------------------------------------
router.post('/sequential', async (req, res) => {
  try {
    const { steps } = req.body;

    if (!Array.isArray(steps) || steps.length < 1 || steps.length > 3) {
      return res.status(400).json({ success: false, error: 'steps must be an array of 1–3 entries' });
    }
    for (const s of steps) {
      if (![5, 6, 7].includes(Number(s.valve))) {
        return res.status(400).json({ success: false, error: `Valve must be 5, 6, or 7 (got ${s.valve})` });
      }
      if (!s.flowRateMlMin || Number(s.flowRateMlMin) <= 0) {
        return res.status(400).json({ success: false, error: `flowRateMlMin for valve ${s.valve} must be > 0` });
      }
      if (!s.volumeMl || Number(s.volumeMl) <= 0) {
        return res.status(400).json({ success: false, error: `volumeMl for valve ${s.valve} must be > 0` });
      }
    }

    await ensureSession('sequential');

    // Send each SEQSET command individually — firmware stores each in its steps array
    // Firmware command: SEQSET <valve> <flow> <volume>
    const sentCommands = [];
    for (const s of steps) {
      const cmd = `SEQSET ${s.valve} ${Number(s.flowRateMlMin).toFixed(2)} ${Number(s.volumeMl).toFixed(1)}`;
      if (!await tryCommand(res, cmd)) return;   // 503 already sent if failed
      sentCommands.push(cmd);
    }

    activeSession.config  = { mode: 'sequential', steps };
    activeSession.primed  = false;   // config changed → must prime again

    await InfusionSession.findOneAndUpdate(
      { sessionId: activeSession.sessionId },
      { mode: 'sequential', config: activeSession.config, primed: false }
    );
    await appendLog(activeSession.sessionId, 'CONFIG', sentCommands.join(' | '));

    res.json({ success: true, commands: sentCommands });
  } catch (err) {
    console.error('[IV /sequential]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/prime  (sequential mode only)
// Sends PRIME to the ESP32. The firmware primes all 3 lines (~10 s, blocking
// on the ESP32 side). The next START command queues in the serial buffer
// and is processed automatically when priming finishes.
// ---------------------------------------------------------------------------
router.post('/prime', async (req, res) => {
  try {
    if (!activeSession || activeSession.mode !== 'sequential') {
      return res.status(400).json({ success: false, error: 'Switch to Sequential mode and configure steps first.' });
    }
    if (!activeSession.config) {
      return res.status(400).json({ success: false, error: 'Configure steps before priming.' });
    }

    if (!await tryCommand(res, 'PRIME')) return;

    activeSession.primed = true;
    await InfusionSession.findOneAndUpdate({ sessionId: activeSession.sessionId }, { primed: true });
    await appendLog(activeSession.sessionId, 'PRIME', 'PRIME');

    res.json({ success: true });
  } catch (err) {
    console.error('[IV /prime]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/start
//
//  Parallel:   sends  "PARALLEL <f1> <f2> <f3>"
//              (firmware opens valves 2-4 and drives pumps 1-3 at once)
//
//  Sequential: sends  "START"
//              (SEQSET already sent; PRIME already sent or queued)
// ---------------------------------------------------------------------------
router.post('/start', async (req, res) => {
  try {
    if (!activeSession || !activeSession.config) {
      return res.status(400).json({
        success: false,
        error: 'No session configured. Select a mode and configure pumps/steps first.',
      });
    }

    let command;

    if (activeSession.mode === 'parallel') {
      const pumps = activeSession.config.pumps;
      // Build "PARALLEL f1 f2 f3" — firmware expects all 3 values in pump order
      const byPump = [1, 2, 3].map((n) => {
        const found = pumps.find((p) => Number(p.pump) === n);
        return found ? Number(found.flowRateMlMin).toFixed(2) : '0.00';
      });
      command = `PARALLEL ${byPump.join(' ')}`;

    } else {
      // Sequential — steps already in ESP32 via SEQSET, PRIME already sent
      command = 'START';
    }

    if (!await tryCommand(res, command)) return;

    const now = new Date();
    activeSession.status    = 'running';
    activeSession.startedAt = now;

    await InfusionSession.findOneAndUpdate(
      { sessionId: activeSession.sessionId },
      { status: 'running', startedAt: now }
    );
    await appendLog(activeSession.sessionId, 'START', command);

    res.json({ success: true, command });
  } catch (err) {
    console.error('[IV /start]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/pause  (sequential only — parallel has no pause)
// Firmware command: PAUSE
// ---------------------------------------------------------------------------
router.post('/pause', async (req, res) => {
  try {
    if (!activeSession) {
      return res.status(400).json({ success: false, error: 'No active session.' });
    }
    if (activeSession.mode !== 'sequential') {
      return res.status(400).json({
        success: false,
        error: 'Pause is only available in Sequential mode. Use Stop to halt Parallel mode.',
      });
    }

    if (!await tryCommand(res, 'PAUSE')) return;

    activeSession.status = 'paused';
    await InfusionSession.findOneAndUpdate({ sessionId: activeSession.sessionId }, { status: 'paused' });
    await appendLog(activeSession.sessionId, 'PAUSE', 'PAUSE');

    res.json({ success: true });
  } catch (err) {
    console.error('[IV /pause]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/resume  (sequential only)
// Firmware command: RESUME
// ---------------------------------------------------------------------------
router.post('/resume', async (req, res) => {
  try {
    if (!activeSession) {
      return res.status(400).json({ success: false, error: 'No active session.' });
    }
    if (activeSession.mode !== 'sequential') {
      return res.status(400).json({
        success: false,
        error: 'Resume is only available in Sequential mode.',
      });
    }

    if (!await tryCommand(res, 'RESUME')) return;

    activeSession.status = 'running';
    await InfusionSession.findOneAndUpdate({ sessionId: activeSession.sessionId }, { status: 'running' });
    await appendLog(activeSession.sessionId, 'RESUME', 'RESUME');

    res.json({ success: true });
  } catch (err) {
    console.error('[IV /resume]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/stop
//  Parallel:   sends  "STOPPARALLEL"  (stops pumps 1-3, closes valves 2-4)
//  Sequential: sends  "STOPSEQ"       (stops pump 4, closes valves 5-7)
// ---------------------------------------------------------------------------
router.post('/stop', async (req, res) => {
  try {
    if (!activeSession) {
      return res.status(400).json({ success: false, error: 'No active session.' });
    }

    const command = activeSession.mode === 'parallel' ? 'STOPPARALLEL' : 'STOPSEQ';
    if (!await tryCommand(res, command)) return;

    const now = new Date();
    activeSession.status = 'completed';

    await InfusionSession.findOneAndUpdate(
      { sessionId: activeSession.sessionId },
      { status: 'completed', stoppedAt: now }
    );
    await appendLog(activeSession.sessionId, 'STOP', command);

    // Keep activeSession so the UI shows 'completed'.
    // ensureSession() replaces it when the nurse configures the next session.

    res.json({ success: true, command });
  } catch (err) {
    console.error('[IV /stop]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/iv/status
// ---------------------------------------------------------------------------
router.get('/status', async (req, res) => {
  try {
    const hw = esp32Service.getStatus();

    let sessionDoc = null;
    if (activeSession?.sessionId) {
      sessionDoc = await InfusionSession.findOne(
        { sessionId: activeSession.sessionId },
        { logs: 0 }
      ).lean();
    }

    res.json({
      success:       true,
      sessionStatus: activeSession?.status  || 'idle',
      mode:          activeSession?.mode    || null,
      config:        activeSession?.config  || null,
      primed:        activeSession?.primed  || false,
      startedAt:     activeSession?.startedAt || null,
      esp32Connected: hw.connected,
      esp32State:     hw.state,
      esp32PortPath:  hw.portPath,
      esp32BaudRate:  hw.baudRate,
      lastResponse:   hw.lastResponse,
      lastError:      hw.lastError,
      session:        sessionDoc,
    });
  } catch (err) {
    console.error('[IV /status]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
