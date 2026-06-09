import React, { useEffect, useState } from 'react';
import { IV_BASE_URL } from '../../services/api';

/**
 * StatusDisplay — polls GET /api/iv/status every 2 seconds and renders a
 * real-time hardware + session status panel.
 *
 * Color-coded status badge:
 *   running   → green
 *   paused    → yellow
 *   completed / error → red
 *   idle      → gray
 */
const STATUS_COLORS = {
  running:   '#22c55e',  // green
  paused:    '#eab308',  // yellow
  completed: '#ef4444',  // red
  error:     '#ef4444',  // red
  idle:      '#9ca3af',  // gray
};

const StatusDisplay = ({ onExternalStatusChange, patientId }) => {
  const [status, setStatus] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const url = patientId
          ? `${IV_BASE_URL}/status?patientId=${encodeURIComponent(patientId)}`
          : `${IV_BASE_URL}/status`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setStatus(data);
          setFetchError(null);
          // Notify parent so ControlButtons can sync without its own polling
          // Pass full data object so parent can extract both session status and ESP32 hw state
          if (onExternalStatusChange) onExternalStatusChange(data);
        }
      } catch (err) {
        if (!cancelled) setFetchError('Could not reach server');
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [onExternalStatusChange, patientId]);

  if (fetchError) {
    return (
      <div className="iv-status-panel iv-status-panel--error">
        <p>{fetchError}</p>
      </div>
    );
  }

  if (!status) {
    return <div className="iv-status-panel"><p>Loading status…</p></div>;
  }

  const badgeColor = STATUS_COLORS[status.sessionStatus] || STATUS_COLORS.idle;

  // For sequential mode, calculate remaining time for each step
  const steps = status.config?.steps || [];
  const isSequential = status.mode === 'sequential';

  return (
    <div className="iv-status-panel">
      <h3 className="iv-status-title">System Status</h3>

      <div className="iv-status-grid">
        {/* Session status badge */}
        <div className="iv-status-row">
          <span className="iv-status-label">Session</span>
          <span
            className="iv-status-badge"
            style={{ backgroundColor: badgeColor }}
          >
            {(status.sessionStatus || 'idle').toUpperCase()}
          </span>
        </div>

        {/* Infusion mode */}
        <div className="iv-status-row">
          <span className="iv-status-label">Mode</span>
          <span className="iv-status-value">
            {status.mode ? status.mode.charAt(0).toUpperCase() + status.mode.slice(1) : '—'}
          </span>
        </div>

        {/* ESP32 hardware connection */}
        <div className="iv-status-row">
          <span className="iv-status-label">ESP32</span>
          <span
            className="iv-status-badge"
            style={{ backgroundColor: status.esp32Connected ? '#22c55e' : '#ef4444' }}
          >
            {status.esp32Connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Session started timestamp */}
        {status.startedAt && (
          <div className="iv-status-row">
            <span className="iv-status-label">Started</span>
            <span className="iv-status-value">
              {new Date(status.startedAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        {!status.esp32Connected && status.lastDisconnectedAt && (
          <div className="iv-status-row">
            <span className="iv-status-label">Last disconnected</span>
            <span className="iv-status-value">
              {new Date(status.lastDisconnectedAt).toLocaleTimeString()}
              {status.lastDisconnectCode ? ` (code ${status.lastDisconnectCode})` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Sequential mode — per-step estimated remaining time */}
      {isSequential && steps.length > 0 && (
        <div className="iv-sequential-steps">
          <h4>Step Estimates</h4>
          {steps.map((s, i) => {
            const duration = (s.volumeMl / s.flowRateMlMin).toFixed(1);
            return (
              <div key={i} className="iv-step-row">
                <span>Valve {s.valve}</span>
                <span>{s.flowRateMlMin} mL/min</span>
                <span>{s.volumeMl} mL</span>
                <span>~{duration} min</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ESP32 error hint */}
      {!status.esp32Connected && status.lastError && (
        <div className="iv-error-banner iv-error-banner--hw" style={{ marginTop: '1rem' }}>
          Hardware error: {status.lastError}. Check ESP32 power stability, WiFi, and internet access.
        </div>
      )}
    </div>
  );
};

export default StatusDisplay;
