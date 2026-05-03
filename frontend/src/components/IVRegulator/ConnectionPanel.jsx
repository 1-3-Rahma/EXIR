import React from 'react';

/**
 * ConnectionPanel — WiFi mode
 * The ESP32 connects to the backend automatically over WiFi.
 * No manual port selection needed — just shows live connection status.
 */
const ConnectionPanel = ({ esp32Status }) => {
  const isConnected = esp32Status?.connected;
  const ip          = esp32Status?.ip;

  return (
    <div className="iv-connection-panel">
      <div className="iv-connection-header">
        <h3 className="iv-connection-title">ESP32 Connection</h3>
        <span
          className="iv-hw-dot"
          style={{ background: isConnected ? '#22c55e' : '#ef4444' }}
          title={isConnected ? 'Connected via WiFi' : 'Disconnected'}
        />
      </div>

      {isConnected ? (
        <p className="iv-connection-current">
          Connected via WiFi
          {ip && <> &mdash; IP: <strong>{ip}</strong></>}
        </p>
      ) : (
        <div className="iv-connection-waiting">
          <p style={{ margin: '0.5rem 0', fontWeight: 500 }}>
            Waiting for ESP32 to connect…
          </p>
          <p className="iv-connection-hint" style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
            Power on the ESP32 and make sure it is connected to the same WiFi network as this computer.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConnectionPanel;
