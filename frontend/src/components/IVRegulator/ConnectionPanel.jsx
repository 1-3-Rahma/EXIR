import React, { useState, useEffect } from 'react';

/**
 * ConnectionPanel — lets the nurse scan available COM ports,
 * pick the correct one, and connect/disconnect the ESP32 without
 * restarting the server or editing .env.
 */
const ConnectionPanel = ({ esp32Status, onConnectionChange }) => {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchPorts = async () => {
    setLoadingPorts(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/iv/ports');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not list ports');
      setPorts(data.ports);
      // Auto-select the first likely ESP32 port, or the currently connected port
      const likely = data.ports.find((p) => p.likelyESP32);
      if (likely && !selectedPort) setSelectedPort(likely.path);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPorts(false);
    }
  };

  // Load available ports on mount
  useEffect(() => {
    fetchPorts();
  }, []);

  const handleConnect = async () => {
    if (!selectedPort) return;
    setConnecting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('http://localhost:5000/api/iv/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portPath: selectedPort, baudRate }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Connection failed');
      setSuccessMsg(`Connected to ${selectedPort}`);
      if (onConnectionChange) onConnectionChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('http://localhost:5000/api/iv/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Disconnect failed');
      setSuccessMsg('Disconnected from ESP32');
      if (onConnectionChange) onConnectionChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const isConnected = esp32Status?.connected;

  return (
    <div className="iv-connection-panel">
      <div className="iv-connection-header">
        <h3 className="iv-connection-title">ESP32 Connection</h3>
        {/* Live hardware status dot */}
        <span
          className="iv-hw-dot"
          style={{ background: isConnected ? '#22c55e' : '#ef4444' }}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {/* Current port info when connected */}
      {isConnected && esp32Status?.portPath && (
        <p className="iv-connection-current">
          Connected on <strong>{esp32Status.portPath}</strong> at {esp32Status.baudRate} baud
        </p>
      )}

      {error && <div className="iv-error-banner">{error}</div>}
      {successMsg && <div className="iv-success-banner">{successMsg}</div>}

      <div className="iv-connection-controls">
        {/* Port selector */}
        <div className="iv-port-row">
          <select
            className="iv-select iv-port-select"
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            disabled={connecting}
          >
            {ports.length === 0 && (
              <option value="">No ports found</option>
            )}
            {ports.map((p) => (
              <option key={p.path} value={p.path}>
                {p.path}{p.likelyESP32 ? ' ★ ESP32' : ''}{p.manufacturer ? ` — ${p.manufacturer}` : ''}
              </option>
            ))}
          </select>

          {/* Refresh port list */}
          <button
            className="iv-btn iv-btn--ghost"
            onClick={fetchPorts}
            disabled={loadingPorts || connecting}
            title="Refresh port list"
          >
            {loadingPorts ? '…' : '↻'}
          </button>
        </div>

        {/* Baud rate — rarely needs changing but useful for custom firmware */}
        <select
          className="iv-select"
          value={baudRate}
          onChange={(e) => setBaudRate(Number(e.target.value))}
          disabled={connecting}
          style={{ marginTop: '0.5rem' }}
        >
          {[9600, 19200, 38400, 57600, 115200, 230400].map((b) => (
            <option key={b} value={b}>{b} baud</option>
          ))}
        </select>

        {/* Action buttons */}
        <div className="iv-connection-actions">
          <button
            className="iv-btn iv-btn--primary"
            onClick={handleConnect}
            disabled={!selectedPort || connecting}
          >
            {connecting ? 'Connecting…' : isConnected ? 'Reconnect' : 'Connect'}
          </button>

          {isConnected && (
            <button
              className="iv-btn iv-btn--stop"
              onClick={handleDisconnect}
              disabled={connecting}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionPanel;
