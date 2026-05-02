import React from 'react';

const ModeSelector = ({ currentMode, onModeSelected }) => {
  return (
    <div className="iv-mode-selector">
      <h2 className="iv-section-title">Select Infusion Mode</h2>

      <div className="iv-mode-cards">
        <button
          className={`iv-mode-card ${currentMode === 'parallel' ? 'iv-mode-card--active' : ''}`}
          onClick={() => onModeSelected('parallel')}
        >
          <div className="iv-mode-icon">⇉</div>
          <h3>Parallel Mode</h3>
          <p>
            Pumps 1, 2, and 3 deliver fluid simultaneously at independently
            configured flow rates. Use when multiple IV lines must run at the
            same time.
          </p>
          {currentMode === 'parallel' && <span className="iv-mode-badge">Active</span>}
        </button>

        <button
          className={`iv-mode-card ${currentMode === 'sequential' ? 'iv-mode-card--active' : ''}`}
          onClick={() => onModeSelected('sequential')}
        >
          <div className="iv-mode-icon">↓</div>
          <h3>Sequential Mode</h3>
          <p>
            Bags are delivered one after another through valves 5, 6, and 7
            using shared pump 4. Each step runs until the programmed volume
            is reached, then the next step starts automatically.
          </p>
          {currentMode === 'sequential' && <span className="iv-mode-badge">Active</span>}
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;
