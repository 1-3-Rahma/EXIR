import React, { useState } from 'react';

/**
 * ModeSelector — lets the nurse pick Parallel or Sequential infusion mode.
 * Calls POST /api/iv/mode on selection and notifies the parent via onModeSelected.
 */
const ModeSelector = ({ currentMode, onModeSelected }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectMode = async (mode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/iv/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to set mode');
      onModeSelected(mode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="iv-mode-selector">
      <h2 className="iv-section-title">Select Infusion Mode</h2>

      {error && (
        <div className="iv-error-banner">
          {error}
        </div>
      )}

      <div className="iv-mode-cards">
        {/* Parallel mode — pumps 1-3 run simultaneously */}
        <button
          className={`iv-mode-card ${currentMode === 'parallel' ? 'iv-mode-card--active' : ''}`}
          onClick={() => selectMode('parallel')}
          disabled={loading}
        >
          <div className="iv-mode-icon">⇉</div>
          <h3>Parallel Mode</h3>
          <p>
            Pumps 1, 2, and 3 deliver fluid simultaneously at independently
            configured flow rates. Use when multiple IV lines must run at the
            same time.
          </p>
          {currentMode === 'parallel' && (
            <span className="iv-mode-badge">Active</span>
          )}
        </button>

        {/* Sequential mode — valves 5-7 deliver one bag at a time via pump 4 */}
        <button
          className={`iv-mode-card ${currentMode === 'sequential' ? 'iv-mode-card--active' : ''}`}
          onClick={() => selectMode('sequential')}
          disabled={loading}
        >
          <div className="iv-mode-icon">↓</div>
          <h3>Sequential Mode</h3>
          <p>
            Bags are delivered one after another through valves 5, 6, and 7
            using shared pump 4. Each step runs until the programmed volume
            is reached, then the next step starts automatically.
          </p>
          {currentMode === 'sequential' && (
            <span className="iv-mode-badge">Active</span>
          )}
        </button>
      </div>

      {loading && <p className="iv-loading-hint">Setting mode…</p>}
    </div>
  );
};

export default ModeSelector;
