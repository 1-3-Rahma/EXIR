/**
 * IV Regulator Routes  —  /api/iv/*
 *
 * Per-patient session tracking: each patient gets their own session entry.
 * Only one patient can own the ESP32 hardware at a time (hardwareOwnerKey).
 *
 * Parallel:    PARALLEL <f1> <f2> <f3>   — sent on /start
 * Sequential:  SEQSET×3 + PRIME + START  — all sent on /start
 * Stop:        STOPPARALLEL / STOPSEQ
 * Pause/Resume: PAUSE / RESUME  (sequential only)
 *
 * Auto-complete (sequential):
 *   1. Server-side timer set on /start — fires after sum(vol/flow) + delays
 *   2. ESP32 SEQ_COMPLETE message — also triggers auto-complete
 *   Both paths call autoCompleteSeqSession(), which is idempotent.
 */

const express = require('express');
const router  = express.Router();
const esp32Service    = require('../services/esp32Service');
const InfusionSession = require('../models/InfusionSession');
const InfusionLog     = require('../models/InfusionLog');

// ---------------------------------------------------------------------------
// Per-patient session map
// key  : patientId string, or 'anonymous' when no patientId is provided
// value: { sessionId, patientId, mode, config, status, startedAt,
//          seqTimer, seqTimerRemainingMs, seqTimerStartedAt }
// ---------------------------------------------------------------------------
const patientSessions = new Map();

let parallelOwnerKey   = null;
let sequentialOwnerKey = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function patientKey(patientId) {
  return patientId || 'anonymous';
}

/** Total infusion duration in milliseconds for a sequential session. */
function calcSeqDurationMs(steps) {
  if (!Array.isArray(steps) || !steps.length) return 0;
  return steps.reduce((total, s) => {
    const infusionMs = (Number(s.volumeMl) / Number(s.flowRateMlMin)) * 60 * 1000;
    const delayMs    = Number(s.delaySeconds) > 0 ? Number(s.delaySeconds) * 1000 : 0;
    return total + infusionMs + delayMs;
  }, 0);
}

/** Marks a sequential session as completed and releases the hardware lock. Idempotent. */
async function autoCompleteSeqSession(pKey, reason) {
  const session = patientSessions.get(pKey);
  if (!session || session.status === 'completed' || session.status === 'error') return;

  // Cancel any pending server-side timer
  if (session.seqTimer) {
    clearTimeout(session.seqTimer);
    session.seqTimer = null;
  }

  const now      = new Date();
  session.status = 'completed';
  session.seqTimerRemainingMs = 0;
  session.seqTimerStartedAt   = null;
  if (sequentialOwnerKey === pKey) sequentialOwnerKey = null;

  try {
    await InfusionSession.findOneAndUpdate(
      { sessionId: session.sessionId },
      { status: 'completed', stoppedAt: now }
    );
    await InfusionLog.create({
      sessionId: session.sessionId,
      timestamp: now,
      event:     'AUTO_COMPLETE',
      command:   null,
      response:  reason || 'AUTO',
    });
    console.log(`[IV] Sequential session auto-completed (${reason}) for patient ${pKey}`);
  } catch (err) {
    console.error('[IV] Auto-complete DB error:', err.message);
  }
}

/** Start (or restart) the server-side auto-complete timer for a sequential session. */
function startSeqTimer(pKey, ms) {
  const session = patientSessions.get(pKey);
  if (!session) return;
  if (session.seqTimer) clearTimeout(session.seqTimer);
  session.seqTimerRemainingMs = ms;
  session.seqTimerStartedAt   = Date.now();
  session.seqTimer = setTimeout(() => {
    session.seqTimer = null;
    autoCompleteSeqSession(pKey, 'TIME_ELAPSED');
  }, ms);
  console.log(`[IV] Server-side auto-complete timer set: ${Math.round(ms / 1000)}s for patient ${pKey}`);
}

/** Pause the server-side timer, saving remaining time. */
function pauseSeqTimer(pKey) {
  const session = patientSessions.get(pKey);
  if (!session || !session.seqTimer) return;
  clearTimeout(session.seqTimer);
  session.seqTimer = null;
  const elapsed = Date.now() - (session.seqTimerStartedAt || Date.now());
  session.seqTimerRemainingMs = Math.max(0, session.seqTimerRemainingMs - elapsed);
  session.seqTimerStartedAt   = null;
  console.log(`[IV] Server-side timer paused, ${Math.round(session.seqTimerRemainingMs / 1000)}s remaining for patient ${pKey}`);
}

/** Resume the server-side timer from where it was paused. */
function resumeSeqTimer(pKey) {
  const session = patientSessions.get(pKey);
  if (!session || session.seqTimer || session.seqTimerRemainingMs <= 0) return;
  startSeqTimer(pKey, session.seqTimerRemainingMs);
  console.log(`[IV] Server-side timer resumed for patient ${pKey}`);
}

/** Cancel the server-side timer (used on manual stop). */
function cancelSeqTimer(pKey) {
  const session = patientSessions.get(pKey);
  if (!session) return;
  if (session.seqTimer) {
    clearTimeout(session.seqTimer);
    session.seqTimer = null;
  }
  session.seqTimerRemainingMs = 0;
  session.seqTimerStartedAt   = null;
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
    // Server-side sequential timer tracking
    seqTimer:             null,
    seqTimerRemainingMs:  0,
    seqTimerStartedAt:    null,
  };
  patientSessions.set(pKey, session);
  return session;
}

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
// Auto-complete when ESP32 sends SEQ_COMPLETE over WebSocket
// ---------------------------------------------------------------------------
esp32Service.emitter.on('message', async (msg) => {
  if (msg !== 'SEQ_COMPLETE') return;
  if (!sequentialOwnerKey) return;
  await autoCompleteSeqSession(sequentialOwnerKey, 'SEQ_COMPLETE');
});

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
// POST /api/iv/connect
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
// POST /api/iv/parallel
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
// POST /api/iv/sequential
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
// POST /api/iv/start
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
      if (sequentialOwnerKey !== null && sequentialOwnerKey !== pKey) {
        return res.status(409).json({
          success: false,
          error: 'Another patient\'s sequential session is already running. Stop it first.',
        });
      }
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

      // Start server-side auto-complete timer
      const durationMs = calcSeqDurationMs(session.config.steps);
      if (durationMs > 0) {
        startSeqTimer(pKey, durationMs);
      }
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
// POST /api/iv/pause  (sequential only)
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

    pauseSeqTimer(pKey);

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
// POST /api/iv/resume  (sequential only)
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

    resumeSeqTimer(pKey);

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
// POST /api/iv/stop
// ---------------------------------------------------------------------------
router.post('/stop', async (req, res) => {
  try {
    const { patientId } = req.body;
    const pKey    = patientKey(patientId);
    const session = patientSessions.get(pKey);

    if (!session) {
      return res.status(400).json({ success: false, error: 'No session found.' });
    }

    const isParallel = session.mode === 'parallel';
    const ownerKey   = isParallel ? parallelOwnerKey : sequentialOwnerKey;
    if (ownerKey !== pKey) {
      return res.status(409).json({ success: false, error: 'This patient does not own the hardware slot for this mode.' });
    }

    const command = isParallel ? 'STOPPARALLEL' : 'STOPSEQ';
    if (!await tryCommand(res, command)) return;

    if (!isParallel) cancelSeqTimer(pKey);

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
// POST /api/iv/finish  — client-side time-elapsed call (idempotent)
// Used by the frontend timer as a belt-and-suspenders complement to the
// server-side timer above.
// ---------------------------------------------------------------------------
router.post('/finish', async (req, res) => {
  try {
    const { patientId } = req.body;
    const pKey    = patientKey(patientId);
    const session = patientSessions.get(pKey);

    if (!session) {
      return res.status(400).json({ success: false, error: 'No session found.' });
    }
    if (session.mode !== 'sequential') {
      return res.status(400).json({ success: false, error: 'Finish is only for sequential sessions.' });
    }
    if (session.status === 'completed') {
      return res.json({ success: true, alreadyDone: true });
    }

    await autoCompleteSeqSession(pKey, 'TIME_ELAPSED');
    res.json({ success: true });
  } catch (err) {
    console.error('[IV /finish]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/iv/status?patientId=xxx
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
      success:         true,
      sessionStatus:   session?.status    || 'idle',
      mode:            session?.mode      || null,
      config:          session?.config    || null,
      patientId:       session?.patientId || null,
      startedAt:       session?.startedAt || null,
      parallelOwner:   parallelOwnerKey,
      sequentialOwner: sequentialOwnerKey,
      esp32Connected:  hw.connected,
      esp32State:      hw.state,
      esp32PortPath:   hw.portPath,
      esp32BaudRate:   hw.baudRate,
      lastResponse:    hw.lastResponse,
      lastError:       hw.lastError,
      lastConnectedAt: hw.lastConnectedAt,
      lastDisconnectedAt: hw.lastDisconnectedAt,
      lastDisconnectCode: hw.lastDisconnectCode,
      lastDisconnectReason: hw.lastDisconnectReason,
      session:         sessionDoc,
    });
  } catch (err) {
    console.error('[IV /status]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
