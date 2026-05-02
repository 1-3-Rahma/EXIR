/**
 * IV Regulator Routes  —  /api/iv/*
 *
 * Per-patient session tracking: each patient gets their own session entry.
 * Only one patient can own the ESP32 hardware at a time (hardwareOwnerKey).
 *
 * Parallel:    PARALLEL <f1> <f2> <f3>   — sent on /start
 * Sequential:  MODE SEQUENTIAL + SEQSET×3 + PRIME + START  — all sent on /start
 * Stop:        STOPPARALLEL / STOPSEQ
 * Pause/Resume: PAUSE / RESUME  (sequential only)
 */

const express = require('express');
const router  = express.Router();
const esp32Service    = require('../services/esp32Service');
const InfusionSession = require('../models/InfusionSession');
const InfusionLog     = require('../models/InfusionLog');

// ---------------------------------------------------------------------------
// Per-patient session map
// key  : patientId string, or 'anonymous' when no patientId is provided
// value: { sessionId, patientId, mode, config, status, startedAt }
// ---------------------------------------------------------------------------
const patientSessions = new Map();

// Parallel and sequential use entirely different hardware (different pumps/valves),
// so they can run concurrently. Each mode has its own ownership lock.
let parallelOwnerKey   = null; // patient key currently running PARALLEL (pumps 1-3, valves 2-4)
let sequentialOwnerKey = null; // patient key currently running SEQUENTIAL (pump 4, valves 5-7)

function patientKey(patientId) {
  return patientId || 'anonymous';
}

async function getOrCreateSession(pKey, patientId, mode) {
  const existing = patientSessions.get(pKey);
  if (existing && existing.status !== 'completed' && existing.status !== 'error') {
    existing.mode = mode;
    return existing;
  }
  const doc = await InfusionSession.create({ mode });
  const session = {
    sessionId: doc.sessionId,
    patientId: patientId || null,
    mode,
    config:    null,
    status:    'idle',
    startedAt: null,
  };
  patientSessions.set(pKey, session);
  return session;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tryCommand(res, command) {
  try {
    await esp32Service.sendCommand(command);
    return true;
  } catch (err) {
    res.status(503).json({ success: false, error: `ESP32 command failed: ${err.message}` });
    return false;
  }
}

async function appendLog(sessionId, event, command) {
  const hw    = esp32Service.getStatus();
  const entry = { timestamp: new Date(), event, command: command || null, response: hw.lastResponse || null };
  await Promise.all([
    InfusionSession.findOneAndUpdate(
      { sessionId },
      { $push: { logs: { timestamp: entry.timestamp, event, command: entry.command } } }
    ),
    InfusionLog.create({ sessionId, ...entry }),
  ]);
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
// POST /api/iv/parallel  — Body: { patientId, pumps: [{pump, flowRateMlMin}] }
// Stores config per patient. No ESP32 command yet — sent on /start.
// ---------------------------------------------------------------------------
router.post('/parallel', async (req, res) => {
  try {
    const { pumps, patientId } = req.body;
    const pKey = patientKey(patientId);

    if (!Array.isArray(pumps) || pumps.length < 1 || pumps.length > 3) {
      return res.status(400).json({ success: false, error: 'pumps must be an array of 1–3 entries' });
    }
    let anyActive = false;
    for (const p of pumps) {
      if (![1, 2, 3].includes(Number(p.pump))) {
        return res.status(400).json({ success: false, error: `Pump number must be 1, 2, or 3 (got ${p.pump})` });
      }
      const flow = Number(p.flowRateMlMin);
      if (flow > 0) {
        if (flow < 1 || flow > 17) {
          return res.status(400).json({ success: false, error: `flowRateMlMin for pump ${p.pump} must be 1–17 mL/min` });
        }
        anyActive = true;
      }
    }
    if (!anyActive) {
      return res.status(400).json({ success: false, error: 'At least one pump must have a flow rate > 0' });
    }

    const byPump = [1, 2, 3].map((n) => {
      const found = pumps.find((p) => Number(p.pump) === n);
      return found && Number(found.flowRateMlMin) > 0
        ? Number(found.flowRateMlMin).toFixed(2)
        : '0.00';
    });
    const commandPreview = `PARALLEL ${byPump.join(' ')}`;

    const session = await getOrCreateSession(pKey, patientId, 'parallel');
    session.config = { mode: 'parallel', pumps };

    await InfusionSession.findOneAndUpdate(
      { sessionId: session.sessionId },
      { mode: 'parallel', config: session.config }
    );
    await appendLog(session.sessionId, 'CONFIG', commandPreview);

    res.json({ success: true, command: commandPreview });
  } catch (err) {
    console.error('[IV /parallel]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/sequential  — Body: { patientId, steps: [{valve,flowRateMlMin,volumeMl,delaySeconds?}] }
// Stores config per patient. No ESP32 command yet — all sent on /start.
// ---------------------------------------------------------------------------
router.post('/sequential', async (req, res) => {
  try {
    const { steps, patientId } = req.body;
    const pKey = patientKey(patientId);

    if (!Array.isArray(steps) || steps.length < 1 || steps.length > 3) {
      return res.status(400).json({ success: false, error: 'steps must be an array of 1–3 entries' });
    }
    for (const s of steps) {
      if (![5, 6, 7].includes(Number(s.valve))) {
        return res.status(400).json({ success: false, error: `Valve must be 5, 6, or 7 (got ${s.valve})` });
      }
      const flow = Number(s.flowRateMlMin);
      if (!s.flowRateMlMin || isNaN(flow) || flow < 1.5 || flow > 3) {
        return res.status(400).json({ success: false, error: `flowRateMlMin for valve ${s.valve} must be 1.5–3 mL/min` });
      }
      if (!s.volumeMl || Number(s.volumeMl) <= 0) {
        return res.status(400).json({ success: false, error: `volumeMl for valve ${s.valve} must be > 0` });
      }
    }

    const session = await getOrCreateSession(pKey, patientId, 'sequential');
    session.config = { mode: 'sequential', steps };

    // Build command previews (for display only — sent to ESP32 on /start)
    const commandPreviews = steps.map((s) => {
      const delaySec = Number(s.delaySeconds) > 0 ? Math.round(Number(s.delaySeconds)) : null;
      return delaySec
        ? `SEQSET ${s.valve} ${Number(s.flowRateMlMin).toFixed(2)} ${Number(s.volumeMl).toFixed(1)} ${delaySec}`
        : `SEQSET ${s.valve} ${Number(s.flowRateMlMin).toFixed(2)} ${Number(s.volumeMl).toFixed(1)}`;
    });

    await InfusionSession.findOneAndUpdate(
      { sessionId: session.sessionId },
      { mode: 'sequential', config: session.config }
    );
    await appendLog(session.sessionId, 'CONFIG', commandPreviews.join(' | '));

    res.json({ success: true, commands: commandPreviews });
  } catch (err) {
    console.error('[IV /sequential]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/start  — Body: { patientId }
//
// Parallel:   sends PARALLEL <f1> <f2> <f3>
// Sequential: sends MODE SEQUENTIAL + SEQSET×N + PRIME + START
//
// Rejects 409 if another patient currently owns the hardware.
// ---------------------------------------------------------------------------
router.post('/start', async (req, res) => {
  try {
    const { patientId } = req.body;
    const pKey    = patientKey(patientId);
    const session = patientSessions.get(pKey);

    if (!session || !session.config) {
      return res.status(400).json({
        success: false,
        error: 'No session configured. Select a mode and configure pumps/steps first.',
      });
    }

    let command;

    if (session.mode === 'parallel') {
      // Parallel lock: only one parallel session at a time
      if (parallelOwnerKey !== null && parallelOwnerKey !== pKey) {
        return res.status(409).json({
          success: false,
          error: 'Another patient\'s parallel session is already running. Stop it first.',
        });
      }
      const pumps  = session.config.pumps;
      const byPump = [1, 2, 3].map((n) => {
        const found = pumps.find((p) => Number(p.pump) === n);
        return found && Number(found.flowRateMlMin) > 0
          ? Number(found.flowRateMlMin).toFixed(2)
          : '0.00';
      });
      command = `PARALLEL ${byPump.join(' ')}`;
      if (!await tryCommand(res, command)) return;
      parallelOwnerKey = pKey;

    } else {
      // Sequential lock: only one sequential session at a time
      if (sequentialOwnerKey !== null && sequentialOwnerKey !== pKey) {
        return res.status(409).json({
          success: false,
          error: 'Another patient\'s sequential session is already running. Stop it first.',
        });
      }
      // Send SEQSET×N + PRIME + START without MODE SEQUENTIAL
      // (avoids resetting firmware state while a parallel session may be running)
      for (const s of session.config.steps) {
        const delaySec = Number(s.delaySeconds) > 0 ? Math.round(Number(s.delaySeconds)) : null;
        const cmd = delaySec
          ? `SEQSET ${s.valve} ${Number(s.flowRateMlMin).toFixed(2)} ${Number(s.volumeMl).toFixed(1)} ${delaySec}`
          : `SEQSET ${s.valve} ${Number(s.flowRateMlMin).toFixed(2)} ${Number(s.volumeMl).toFixed(1)}`;
        if (!await tryCommand(res, cmd)) return;
      }
      if (!await tryCommand(res, 'PRIME')) return;
      if (!await tryCommand(res, 'START')) return;
      command = 'START';
      sequentialOwnerKey = pKey;
    }

    const now         = new Date();
    session.status    = 'running';
    session.startedAt = now;

    await InfusionSession.findOneAndUpdate(
      { sessionId: session.sessionId },
      { status: 'running', startedAt: now }
    );
    await appendLog(session.sessionId, 'START', command);

    res.json({ success: true, command });
  } catch (err) {
    console.error('[IV /start]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/pause  — Body: { patientId }  (sequential only)
// ---------------------------------------------------------------------------
router.post('/pause', async (req, res) => {
  try {
    const { patientId } = req.body;
    const pKey    = patientKey(patientId);
    const session = patientSessions.get(pKey);

    if (!session) {
      return res.status(400).json({ success: false, error: 'No session found.' });
    }
    if (session.mode !== 'sequential') {
      return res.status(400).json({ success: false, error: 'Pause is only available in Sequential mode.' });
    }
    if (sequentialOwnerKey !== pKey) {
      return res.status(409).json({ success: false, error: 'This patient does not own the sequential hardware slot.' });
    }

    if (!await tryCommand(res, 'PAUSE')) return;

    session.status = 'paused';
    await InfusionSession.findOneAndUpdate({ sessionId: session.sessionId }, { status: 'paused' });
    await appendLog(session.sessionId, 'PAUSE', 'PAUSE');

    res.json({ success: true });
  } catch (err) {
    console.error('[IV /pause]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/resume  — Body: { patientId }  (sequential only)
// ---------------------------------------------------------------------------
router.post('/resume', async (req, res) => {
  try {
    const { patientId } = req.body;
    const pKey    = patientKey(patientId);
    const session = patientSessions.get(pKey);

    if (!session) {
      return res.status(400).json({ success: false, error: 'No session found.' });
    }
    if (session.mode !== 'sequential') {
      return res.status(400).json({ success: false, error: 'Resume is only available in Sequential mode.' });
    }
    if (sequentialOwnerKey !== pKey) {
      return res.status(409).json({ success: false, error: 'This patient does not own the sequential hardware slot.' });
    }

    if (!await tryCommand(res, 'RESUME')) return;

    session.status = 'running';
    await InfusionSession.findOneAndUpdate({ sessionId: session.sessionId }, { status: 'running' });
    await appendLog(session.sessionId, 'RESUME', 'RESUME');

    res.json({ success: true });
  } catch (err) {
    console.error('[IV /resume]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/iv/stop  — Body: { patientId }
// ---------------------------------------------------------------------------
router.post('/stop', async (req, res) => {
  try {
    const { patientId } = req.body;
    const pKey    = patientKey(patientId);
    const session = patientSessions.get(pKey);

    if (!session) {
      return res.status(400).json({ success: false, error: 'No session found.' });
    }

    const isParallel   = session.mode === 'parallel';
    const ownerKey     = isParallel ? parallelOwnerKey : sequentialOwnerKey;
    if (ownerKey !== pKey) {
      return res.status(409).json({ success: false, error: 'This patient does not own the hardware slot for this mode.' });
    }

    const command = isParallel ? 'STOPPARALLEL' : 'STOPSEQ';
    if (!await tryCommand(res, command)) return;

    const now      = new Date();
    session.status = 'completed';
    if (isParallel) parallelOwnerKey = null;
    else            sequentialOwnerKey = null;

    await InfusionSession.findOneAndUpdate(
      { sessionId: session.sessionId },
      { status: 'completed', stoppedAt: now }
    );
    await appendLog(session.sessionId, 'STOP', command);

    res.json({ success: true, command });
  } catch (err) {
    console.error('[IV /stop]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/iv/status?patientId=xxx
// Returns the session for the specific patient + hardware state.
// ---------------------------------------------------------------------------
router.get('/status', async (req, res) => {
  try {
    const pId     = req.query.patientId || null;
    const pKey    = patientKey(pId);
    const session = patientSessions.get(pKey) || null;
    const hw      = esp32Service.getStatus();

    let sessionDoc = null;
    if (session?.sessionId) {
      sessionDoc = await InfusionSession.findOne(
        { sessionId: session.sessionId },
        { logs: 0 }
      ).lean();
    }

    res.json({
      success:        true,
      sessionStatus:  session?.status    || 'idle',
      mode:           session?.mode      || null,
      config:         session?.config    || null,
      patientId:           session?.patientId || null,
      startedAt:           session?.startedAt || null,
      parallelOwner:       parallelOwnerKey,
      sequentialOwner:     sequentialOwnerKey,
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
