import React, { useState } from 'react';

/**
 * ControlButtons — mode-aware control panel.
 *
 * PARALLEL mode: Start / Stop
 * SEQUENTIAL mode: Start / Pause / Resume / Stop
 * (PRIME is sent automatically by the backend when steps are configured)
 */
const ControlButtons = ({ sessionStatus, mode, configured, onStatusChange, onNewSession, patientId }) => {
  const [loading, setLoading] = useState(null);
  const [error, setError]     = useState(null);

  const callApi = async (action) => {
    setLoading(action);
    setError(null);
    try {
      const res  = await fetch(`http://localhost:5000/api/iv/${action}`, {
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
