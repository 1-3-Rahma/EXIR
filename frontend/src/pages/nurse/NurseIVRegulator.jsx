import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { IV_API_BASE } from '../../services/api';
import ModeSelector from '../../components/IVRegulator/ModeSelector';
import ParallelForm from '../../components/IVRegulator/ParallelForm';
import SequentialForm from '../../components/IVRegulator/SequentialForm';
import ControlButtons from '../../components/IVRegulator/ControlButtons';
import StatusDisplay from '../../components/IVRegulator/StatusDisplay';
import ConnectionPanel from '../../components/IVRegulator/ConnectionPanel';
import Layout from '../../components/common/Layout';
import { IV_BASE_URL } from '../../services/api';

const NurseIVRegulator = () => {
  const { t } = useTranslation();
  const { patientId } = useParams();
  const location = useLocation();
  const patientName = location.state?.patientName || null;
  const patientRoom = location.state?.room || null;

  const [selectedMode, setSelectedMode]     = useState(null);
  const [configured, setConfigured]         = useState(false);
  const [lastCommand, setLastCommand]       = useState(null);
  const [sessionStatus, setSessionStatus]   = useState('idle');
  const [esp32Status, setEsp32Status]       = useState(null);
  const [activePatientId, setActivePatientId] = useState(null);
  const [sessionSteps, setSessionSteps]     = useState([]);

  const handleModeSelected = (mode) => {
    setSelectedMode(mode);
    setConfigured(false);
    setSessionStatus('idle');
    setLastCommand(null);
  };

  const handleConfigured = (cmdOrCmds, steps) => {
    setLastCommand(Array.isArray(cmdOrCmds) ? cmdOrCmds.join('\n') : cmdOrCmds);
    setConfigured(true);
    setSessionStatus('idle');
    if (steps) setSessionSteps(steps);
  };

  const handleStatusChange = (newStatus) => {
    setSessionStatus(newStatus);
  };

  const handleExternalStatus = useCallback((statusObj) => {
    if (typeof statusObj === 'string') {
      setSessionStatus(statusObj);
    } else if (statusObj && typeof statusObj === 'object') {
      const status = statusObj.sessionStatus || 'idle';
      setSessionStatus(status);
      if (statusObj.config) {
        setConfigured(true);
        if (statusObj.config.steps) setSessionSteps(statusObj.config.steps);
      }
      // Restore mode so ControlButtons re-appear after navigation without reload
      if (statusObj.mode && (status === 'running' || status === 'paused')) {
        setSelectedMode(statusObj.mode);
      }
      setActivePatientId(statusObj.patientId || null);
      setEsp32Status({
        connected: statusObj.esp32Connected,
        portPath:  statusObj.esp32PortPath,
        baudRate:  statusObj.esp32BaudRate,
        state:     statusObj.esp32State,
      });
    }
  }, []);

  // Immediately restore this patient's session state on mount/patientId change
  useEffect(() => {
    const url = patientId
<<<<<<< HEAD
      ? `${IV_API_BASE}/status?patientId=${encodeURIComponent(patientId)}`
      : `${IV_API_BASE}/status`;
=======
      ? `${IV_BASE_URL}/status?patientId=${encodeURIComponent(patientId)}`
      : `${IV_BASE_URL}/status`;
>>>>>>> 851cb544ab9fb44341a3f6d8abcfe6d9c0a2175a
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (data.success) handleExternalStatus(data); })
      .catch(() => {});
  }, [handleExternalStatus, patientId]);

  return (
    <Layout appName="EXIR" role="nurse">
      <div className="iv-page">
        <div className="iv-page-header">
          <h1 className="iv-page-title">{t('ivRegulator.controlTitle')}</h1>
          {patientName ? (
            <p className="iv-page-subtitle">
              {t('ivRegulator.patient')} <strong>{patientName}</strong>
              {patientRoom && patientRoom !== 'N/A' ? ` · ${t('common.room')} ${patientRoom}` : ''}
            </p>
          ) : (
            <p className="iv-page-subtitle">
              {t('ivRegulator.configureControl')}
            </p>
          )}
        </div>

        <div className="iv-page-body">
          {/* Left column: configuration */}
          <div className="iv-config-column">
            {/* Step 1 — choose mode */}
            <ModeSelector
              currentMode={selectedMode}
              onModeSelected={handleModeSelected}
            />

            {/* Step 2 — configure pumps or valves */}
            {selectedMode === 'parallel' && (
              <ParallelForm patientId={patientId} onConfigured={handleConfigured} />
            )}
            {selectedMode === 'sequential' && (
              <SequentialForm patientId={patientId} onConfigured={handleConfigured} />
            )}

            {/* Step 3 — control buttons (shown once mode is selected) */}
            {selectedMode && (
              <>
                {lastCommand && (
                  <div className="iv-last-command">
                    <span className="iv-last-command-label">{t('ivRegulator.preparedCommand')}</span>
                    <code className="iv-last-command-value">{lastCommand}</code>
                  </div>
                )}
                <ControlButtons
                  sessionStatus={sessionStatus}
                  mode={selectedMode}
                  configured={configured}
                  patientId={patientId}
                  steps={sessionSteps}
                  onStatusChange={handleStatusChange}
                  onNewSession={() => {
                    setSelectedMode(null);
                    setConfigured(false);
                    setLastCommand(null);
                    setSessionStatus('idle');
                    setActivePatientId(null);
                    setSessionSteps([]);
                  }}
                />
              </>
            )}
          </div>

          {/* Right column: connection manager + live status */}
          <div className="iv-status-column">
            <ConnectionPanel
              esp32Status={esp32Status}
              onConnectionChange={() => {/* StatusDisplay will pick up the change on next poll */}}
            />
            <div style={{ marginTop: '1rem' }}>
              <StatusDisplay patientId={patientId} onExternalStatusChange={handleExternalStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Inline styles — scoped to IV pages so existing CSS is untouched */}
      <style>{`
        .iv-page { padding: 1.5rem; }
        .iv-page-header { margin-bottom: 1.5rem; }
        .iv-page-title { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0; }
        .iv-page-subtitle { color: #64748b; margin: 0.25rem 0 0; }
        .iv-page-body { display: flex; gap: 1.5rem; align-items: flex-start; flex-wrap: wrap; }
        .iv-config-column { flex: 1; min-width: 320px; display: flex; flex-direction: column; gap: 1.25rem; }
        .iv-status-column { width: 340px; min-width: 260px; }

        /* Mode selector */
        .iv-section-title { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.75rem; }
        .iv-mode-cards { display: flex; gap: 1rem; flex-wrap: wrap; }
        .iv-mode-card {
          flex: 1; min-width: 200px; padding: 1rem; border: 2px solid #e2e8f0;
          border-radius: 0.75rem; background: #fff; cursor: pointer; text-align: left;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .iv-mode-card:hover { border-color: #6366f1; box-shadow: 0 0 0 3px #e0e7ff; }
        .iv-mode-card--active { border-color: #6366f1; background: #f5f3ff; }
        .iv-mode-card h3 { margin: 0.5rem 0 0.25rem; font-size: 1rem; }
        .iv-mode-card p { margin: 0; font-size: 0.85rem; color: #64748b; }
        .iv-mode-icon { font-size: 1.5rem; }
        .iv-mode-badge {
          display: inline-block; margin-top: 0.5rem; padding: 0.15rem 0.5rem;
          background: #6366f1; color: #fff; border-radius: 9999px; font-size: 0.75rem;
        }
        .iv-loading-hint { color: #64748b; font-size: 0.85rem; margin-top: 0.5rem; }

        /* Forms */
        .iv-form { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; }
        .iv-form-title { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; }
        .iv-form-grid { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .iv-form-header, .iv-form-row {
          display: grid;
          grid-template-columns: 80px 1fr 100px;
          gap: 0.75rem;
          align-items: center;
        }
        .iv-form-header--sequential,
        .iv-form-row--sequential { grid-template-columns: 100px 1fr 1fr 90px; }
        .iv-form-header { font-size: 0.8rem; font-weight: 600; color: #64748b; padding-bottom: 0.25rem; border-bottom: 1px solid #f1f5f9; }
        .iv-pump-label { font-weight: 500; font-size: 0.9rem; }
        .iv-input-group { display: flex; flex-direction: column; }
        .iv-input, .iv-select {
          padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 0.4rem;
          font-size: 0.9rem; width: 100%; box-sizing: border-box;
        }
        .iv-input:focus, .iv-select:focus { outline: none; border-color: #6366f1; }
        .iv-input--error { border-color: #ef4444; }
        .iv-field-error { color: #ef4444; font-size: 0.75rem; margin-top: 0.2rem; }
        .iv-calc { font-size: 0.85rem; color: #475569; }

        /* Buttons */
        .iv-btn {
          padding: 0.6rem 1.2rem; border: none; border-radius: 0.5rem;
          font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
        }
        .iv-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .iv-btn--primary { background: #6366f1; color: #fff; }
        .iv-btn--primary:hover:not(:disabled) { background: #4f46e5; }
        .iv-control-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .iv-btn--start  { background: #22c55e; color: #fff; }
        .iv-btn--pause  { background: #eab308; color: #fff; }
        .iv-btn--resume { background: #3b82f6; color: #fff; }
        .iv-btn--stop   { background: #ef4444; color: #fff; }

        /* Error banners */
        .iv-error-banner {
          background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c;
          padding: 0.65rem 0.9rem; border-radius: 0.5rem; font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }
        .iv-error-banner--hw { margin-top: 0.75rem; margin-bottom: 0; }

        /* Last command preview */
        .iv-last-command {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem;
          padding: 0.6rem 0.9rem; font-size: 0.85rem;
        }
        .iv-last-command-label { color: #64748b; margin-right: 0.5rem; }
        .iv-last-command-value { font-family: monospace; color: #1e293b; word-break: break-all; }

        /* Status panel */
        .iv-status-panel {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem;
        }
        .iv-status-panel--error { border-color: #fca5a5; background: #fef2f2; }
        .iv-status-title { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; }
        .iv-status-grid { display: flex; flex-direction: column; gap: 0.6rem; }
        .iv-status-row { display: flex; align-items: center; justify-content: space-between; }
        .iv-status-label { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        .iv-status-value { font-size: 0.85rem; color: #1e293b; }
        .iv-status-value--mono { font-family: monospace; font-size: 0.8rem; word-break: break-all; text-align: right; max-width: 55%; }
        .iv-status-badge {
          padding: 0.2rem 0.6rem; border-radius: 9999px; color: #fff;
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em;
        }

        /* Sequential steps table */
        .iv-sequential-steps { margin-top: 1rem; }
        .iv-sequential-steps h4 { font-size: 0.85rem; font-weight: 600; color: #64748b; margin: 0 0 0.5rem; }
        .iv-step-row {
          display: grid; grid-template-columns: 70px 100px 70px 1fr;
          gap: 0.5rem; font-size: 0.8rem; padding: 0.35rem 0;
          border-bottom: 1px solid #f1f5f9; color: #334155;
        }

        /* Connection panel */
        .iv-connection-panel {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem;
        }
        .iv-connection-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
        .iv-connection-title { margin: 0; font-size: 1rem; font-weight: 600; }
        .iv-hw-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
        .iv-connection-current { font-size: 0.82rem; color: #64748b; margin: 0 0 0.75rem; }
        .iv-port-row { display: flex; gap: 0.5rem; align-items: center; }
        .iv-port-select { flex: 1; }
        .iv-connection-controls { display: flex; flex-direction: column; gap: 0.5rem; }
        .iv-connection-actions { display: flex; gap: 0.6rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .iv-btn--ghost {
          background: transparent; border: 1px solid #cbd5e1; color: #475569;
          padding: 0.45rem 0.7rem; border-radius: 0.4rem; font-size: 1rem; cursor: pointer;
        }
        .iv-btn--ghost:hover:not(:disabled) { background: #f1f5f9; }
        .iv-success-banner {
          background: #f0fdf4; border: 1px solid #86efac; color: #15803d;
          padding: 0.6rem 0.9rem; border-radius: 0.5rem; font-size: 0.875rem; margin-bottom: 0.75rem;
        }
.iv-session-complete {
          margin-top: 0.75rem; padding: 0.65rem 0.9rem;
          background: #f0fdf4; border: 1px solid #86efac; border-radius: 0.5rem;
          color: #15803d; font-size: 0.875rem; display: flex; align-items: center;
        }
      `}</style>
    </Layout>
  );
};

export default NurseIVRegulator;
