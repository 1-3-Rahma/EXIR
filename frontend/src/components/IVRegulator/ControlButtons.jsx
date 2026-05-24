import React, { useState, useRef, useEffect } from 'react';

const IV_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1$/, '/api');

/**
 * ControlButtons — mode-aware control panel.
 *
 * PARALLEL mode: Start / Stop
 * SEQUENTIAL mode: Start / Pause / Resume / Stop
 * (PRIME is sent automatically by the backend when steps are configured)
 *
 * Sequential mode also runs a client-side countdown timer (derived from
 * volumeMl / flowRateMlMin + delaySeconds per step). When it fires it calls
 * POST /api/iv/finish to release the hardware lock and marks the session
 * completed — no manual Stop needed.
 */
const ControlButtons = ({ sessionStatus, mode, configured, onStatusChange, onNewSession, patientId, steps }) => {
  const [loading, setLoading] = useState(null);
  const [error, setError]     = useState(null);

  const timerRef     = useRef(null);
  const remainingRef = useRef(0);
  const startedAtRef = useRef(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // If an external event (ESP32 SEQ_COMPLETE via polling) completes the session
  // before our timer fires, cancel the timer to avoid a redundant finish call.
  useEffect(() => {
    if (sessionStatus === 'completed') {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current  = null;
      remainingRef.current = 0;
      startedAtRef.current = null;
    }
  }, [sessionStatus]);

  function calcTotalMs(stepsArr) {
    if (!stepsArr || !stepsArr.length) return 0;
    return stepsArr.reduce((total, s) => {
      const infusionMs = (Number(s.volumeMl) / Number(s.flowRateMlMin)) * 60 * 1000;
      const delayMs    = Number(s.delaySeconds) > 0 ? Number(s.delaySeconds) * 1000 : 0;
      return total + infusionMs + delayMs;
    }, 0);
  }

  async function handleAutoComplete() {
    timerRef.current     = null;
    remainingRef.current = 0;
    startedAtRef.current = null;
    try {
      await fetch(`${IV_BASE}/iv/finish`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patientId: patientId || null }),
      });
    } catch (_) {}
    if (onStatusChange) onStatusChange('completed');
  }

  function startTimer(ms) {
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingRef.current = ms;
    startedAtRef.current = Date.now();
    timerRef.current     = setTimeout(handleAutoComplete, ms);
  }

  function pauseTimer() {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const elapsed = Date.now() - (startedAtRef.current || Date.now());
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    startedAtRef.current = null;
  }

  function resumeTimer() {
    if (timerRef.current || remainingRef.current <= 0) return;
    startedAtRef.current = Date.now();
    timerRef.current     = setTimeout(handleAutoComplete, remainingRef.current);
  }

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current     = null;
    remainingRef.current = 0;
    startedAtRef.current = null;
  }

  const callApi = async (action) => {
    setLoading(action);
    setError(null);
    try {
      const res  = await fetch(`${IV_BASE}/iv/${action}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patientId: patientId || null }),
      });
      const data = await res.json();

      if (res.status === 503 || !data.success) {
        throw new Error(data.error || `${action} failed — check ESP32 connection`);
      }

      const nextStatus =
        action === 'start'  ? 'running'   :
        action === 'pause'  ? 'paused'    :
        action === 'resume' ? 'running'   :
        action === 'stop'   ? 'completed' : sessionStatus;
      if (onStatusChange) onStatusChange(nextStatus);

      // Timer management for sequential auto-complete
      if (mode === 'sequential') {
        if (action === 'start') {
          const totalMs = calcTotalMs(steps);
          if (totalMs > 0) startTimer(totalMs);
        } else if (action === 'pause') {
          pauseTimer();
        } else if (action === 'resume') {
          resumeTimer();
        } else if (action === 'stop') {
          clearTimer();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const isIdle      = sessionStatus === 'idle';
  const isRunning   = sessionStatus === 'running';
  const isPaused    = sessionStatus === 'paused';
  const isCompleted = sessionStatus === 'completed';

  const canStart = isIdle && configured;

  return (
    <div className="iv-controls">
      {error && (
        <div className="iv-error-banner iv-error-banner--hw">{error}</div>
      )}

      <div className="iv-control-buttons">
        {/* Start */}
        <button
          className="iv-btn iv-btn--start"
          onClick={() => callApi('start')}
          disabled={!canStart || loading !== null}
          title={!configured ? 'Configure first' : 'Start infusion'}
        >
          {loading === 'start' ? 'Starting…' : '▶ Start'}
        </button>

        {/* Pause — sequential only */}
        {mode === 'sequential' && (
          <button
            className="iv-btn iv-btn--pause"
            onClick={() => callApi('pause')}
            disabled={!isRunning || loading !== null}
          >
            {loading === 'pause' ? 'Pausing…' : '⏸ Pause'}
          </button>
        )}

        {/* Resume — sequential only */}
        {mode === 'sequential' && (
          <button
            className="iv-btn iv-btn--resume"
            onClick={() => callApi('resume')}
            disabled={!isPaused || loading !== null}
          >
            {loading === 'resume' ? 'Resuming…' : '▶ Resume'}
          </button>
        )}

        {/* Stop */}
        <button
          className="iv-btn iv-btn--stop"
          onClick={() => callApi('stop')}
          disabled={(!isRunning && !isPaused) || loading !== null}
        >
          {loading === 'stop' ? 'Stopping…' : '⏹ Stop'}
        </button>
      </div>

      {isCompleted && (
        <div className="iv-session-complete">
          <span>✓ Infusion completed.</span>
          <button
            className="iv-btn iv-btn--primary"
            onClick={() => { if (onNewSession) onNewSession(); }}
            style={{ marginLeft: '0.75rem' }}
          >
            New Session
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlButtons;
