import React, { useState, useEffect } from 'react';

/**
 * ControlButtons — mode-aware control panel.
 *
 * PARALLEL mode (firmware: PARALLEL / STOPPARALLEL):
 *   Start → enabled when idle + config ready
 *   Stop  → enabled when running
 *   Pause / Resume not supported (firmware has no PAUSE for parallel)
 *
 * SEQUENTIAL mode (firmware: SEQSET already sent, PRIME, START, PAUSE, RESUME, STOPSEQ):
 *   Prime  → enabled after steps are configured (primed = false)
 *   Start  → enabled after priming completes
 *   Pause  → enabled when running
 *   Resume → enabled when paused
 *   Stop   → enabled when running or paused
 */
const ControlButtons = ({ sessionStatus, mode, configured, primed: primedProp, onStatusChange, onNewSession }) => {
  const [loading, setLoading]       = useState(null);
  const [error, setError]           = useState(null);
  const [primed, setPrimed]         = useState(primedProp || false);
  const [primingCountdown, setPrimingCountdown] = useState(0); // seconds remaining

  // Sync primed from parent (StatusDisplay polling)
  useEffect(() => {
    setPrimed(primedProp || false);
  }, [primedProp]);

  const callApi = async (action) => {
    setLoading(action);
    setError(null);
    try {
      const res  = await fetch(`http://localhost:5000/api/iv/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.status === 503 || !data.success) {
        throw new Error(data.error || `${action} failed — check ESP32 connection`);
      }

      if (action === 'prime') {
        // PRIME blocks the ESP32 for ~10-12 s.
        // We start a client-side countdown so the nurse knows when it's safe to press Start.
        setPrimed(true);
        startPrimingCountdown(12);
      } else {
        const nextStatus =
          action === 'start'  ? 'running'   :
          action === 'pause'  ? 'paused'    :
          action === 'resume' ? 'running'   :
          action === 'stop'   ? 'completed' : sessionStatus;
        if (onStatusChange) onStatusChange(nextStatus);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // Count down from `seconds` to 0, updating every second
  const startPrimingCountdown = (seconds) => {
    setPrimingCountdown(seconds);
    const tick = setInterval(() => {
      setPrimingCountdown((prev) => {
        if (prev <= 1) { clearInterval(tick); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const isIdle      = sessionStatus === 'idle';
  const isRunning   = sessionStatus === 'running';
  const isPaused    = sessionStatus === 'paused';
  const isCompleted = sessionStatus === 'completed';
  const isPriming   = primingCountdown > 0;

  // Parallel: Start enabled when idle + configured
  // Sequential: Start enabled when idle + configured + primed + not currently priming
  const canStart = isIdle && configured &&
    (mode === 'parallel' || (mode === 'sequential' && primed && !isPriming));

  return (
    <div className="iv-controls">
      {error && (
        <div className="iv-error-banner iv-error-banner--hw">{error}</div>
      )}

      {/* ── SEQUENTIAL: PRIME button ─────────────────────────────────── */}
      {mode === 'sequential' && !isRunning && !isPaused && !isCompleted && (
        <div className="iv-prime-row">
          <button
            className={`iv-btn iv-btn--prime ${primed && !isPriming ? 'iv-btn--prime-done' : ''}`}
            onClick={() => callApi('prime')}
            disabled={!configured || loading !== null || isPriming}
            title="Prime all three lines before starting (takes ~10–12 s)"
          >
            {loading === 'prime'
              ? 'Sending PRIME…'
              : isPriming
              ? `Priming… ${primingCountdown}s`
              : primed
              ? '✓ Primed — click again to re-prime'
              : 'Prime Lines'}
          </button>
          {!primed && configured && (
            <span className="iv-prime-hint">Required before Start</span>
          )}
        </div>
      )}

      {/* ── MAIN CONTROL BUTTONS ─────────────────────────────────────── */}
      <div className="iv-control-buttons">
        {/* Start */}
        <button
          className="iv-btn iv-btn--start"
          onClick={() => callApi('start')}
          disabled={!canStart || loading !== null}
          title={
            !configured        ? 'Configure first'           :
            mode === 'sequential' && !primed ? 'Prime lines first' :
            isPriming          ? 'Wait for priming to finish' : 'Start infusion'
          }
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

        {/* Stop — both modes (sends STOPPARALLEL or STOPSEQ) */}
        <button
          className="iv-btn iv-btn--stop"
          onClick={() => callApi('stop')}
          disabled={(!isRunning && !isPaused) || loading !== null}
        >
          {loading === 'stop' ? 'Stopping…' : '⏹ Stop'}
        </button>
      </div>

      {/* After stop: prompt nurse to start a new session */}
      {isCompleted && (
        <div className="iv-session-complete">
          <span>✓ Infusion completed.</span>
          <button
            className="iv-btn iv-btn--primary"
            onClick={() => { setPrimed(false); if (onNewSession) onNewSession(); }}
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
