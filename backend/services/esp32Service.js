/**
 * ESP32 Hardware Communication Service
 *
 * Hardware notes:
 *   - Pumps 1-3: PWM-controlled (parallel mode)
 *   - Pump 4: shared sequential pump
 *   - Valves 2-4: pair with Pumps 1-3 in parallel mode
 *   - Valves 5-7: sequential mode (active-low relay: LOW = open)
 *   - Drop factor: 20 gtt/mL → gtt/min = mL/min × 20
 *
 * Command protocol:
 *   Parallel:   "P1 2.0 P2 1.5 P3 3.0 START_PARALLEL"
 *   Sequential: "SET 5 2.0 10 SET 6 1.5 12 SET 7 3.0 9 START"
 *   Control:    PAUSE | RESUME | STOP | STATUS
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// ---------------------------------------------------------------------------
// Module-level connection state
// ---------------------------------------------------------------------------
let port = null;
let parser = null;
let connectionState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
let lastResponse = null;
let lastError = null;
let currentPortPath = null;
let currentBaudRate = null;

// ---------------------------------------------------------------------------
// connect(portPath, baudRate)
// Opens a new serial connection, closing any existing one first.
// Returns a Promise that resolves when the port is open.
// ---------------------------------------------------------------------------
async function connect(portPath, baudRate) {
  if (port && port.isOpen) {
    await new Promise((resolve) => port.close(() => resolve()));
  }

  port = null;
  parser = null;
  connectionState = 'connecting';
  lastError = null;
  currentPortPath = portPath;
  currentBaudRate = baudRate;

  console.log(`[ESP32] Connecting to ${portPath} at ${baudRate} baud…`);

  return new Promise((resolve, reject) => {
    try {
      const newPort = new SerialPort({ path: portPath, baudRate, autoOpen: false });

      // ReadlineParser splits the incoming byte stream on \r\n so each 'data'
      // event is exactly one complete response line from the ESP32.
      const newParser = newPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      newParser.on('data', (line) => {
        lastResponse = line.trim();
        console.log(`[ESP32 ←] ${lastResponse}`);
      });

      newPort.on('error', (err) => {
        connectionState = 'error';
        lastError = err.message;
        console.error(`[ESP32] Serial error: ${err.message}`);
      });

      newPort.on('close', () => {
        connectionState = 'disconnected';
        console.log(`[ESP32] Port ${portPath} closed.`);
      });

      newPort.open((err) => {
        if (err) {
          connectionState = 'error';
          lastError = err.message;
          console.error(`[ESP32] Failed to open ${portPath}: ${err.message}`);
          reject(new Error(`ESP32 not connected: ${err.message}`));
        } else {
          port = newPort;
          parser = newParser;
          connectionState = 'connected';
          lastError = null;
          console.log(`[ESP32] Connected on ${portPath}`);
          resolve({ portPath, baudRate });
        }
      });
    } catch (err) {
      connectionState = 'error';
      lastError = err.message;
      console.error(`[ESP32] Initialisation error: ${err.message}`);
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// disconnect()
// Gracefully closes the serial port.
// ---------------------------------------------------------------------------
async function disconnect() {
  if (port && port.isOpen) {
    await new Promise((resolve) => port.close(() => resolve()));
  }
  port = null;
  parser = null;
  connectionState = 'disconnected';
  lastError = null;
  console.log('[ESP32] Disconnected.');
}

// ---------------------------------------------------------------------------
// listPorts()
// Lists all OS-visible serial ports, flagging likely ESP32 adapters.
// ---------------------------------------------------------------------------
async function listPorts() {
  const ports = await SerialPort.list();
  return ports.map((p) => ({
    path: p.path,
    manufacturer: p.manufacturer || '',
    likelyESP32:
      /silicon labs|cp210|ch340|ch341|ftdi|esp32/i.test(p.manufacturer || '') ||
      /silicon labs|cp210|ch340|ch341|ftdi|esp32/i.test(p.pnpId || ''),
  }));
}

// ---------------------------------------------------------------------------
// sendCommand(commandString)
// Writes a command string to the serial port AND waits for drain() to ensure
// the bytes are physically transmitted to the ESP32 before returning.
//
// KEY FIX: port.write() only queues data in the Node.js internal buffer.
// Without port.drain(), the bytes may never leave the USB-serial adapter.
// This was the root cause of hardware not responding to STOP / RESUME / etc.
// ---------------------------------------------------------------------------
function sendCommand(command) {
  return new Promise((resolve, reject) => {
    if (!port || !port.isOpen) {
      const reason = lastError || 'serial port not open';
      return reject(
        new Error(`ESP32 not connected: ${reason}. Use the Connection panel to select the correct port.`)
      );
    }

    const line = command.trim() + '\n';
    console.log(`[ESP32 →] ${command.trim()}`);

    // write() queues the bytes; drain() blocks until all bytes have been
    // handed off to the OS driver and are physically on their way to the chip.
    port.write(line, 'utf8', (writeErr) => {
      if (writeErr) {
        console.error(`[ESP32] Write error: ${writeErr.message}`);
        return reject(writeErr);
      }

      port.drain((drainErr) => {
        if (drainErr) {
          console.error(`[ESP32] Drain error: ${drainErr.message}`);
          return reject(drainErr);
        }
        resolve();
      });
    });
  });
}

// ---------------------------------------------------------------------------
// getStatus()
// Returns the current hardware connection state.
// ---------------------------------------------------------------------------
function getStatus() {
  return {
    connected: connectionState === 'connected',
    state: connectionState,
    portPath: currentPortPath,
    baudRate: currentBaudRate,
    lastResponse,
    lastError,
  };
}

// ---------------------------------------------------------------------------
// Auto-connect on module load using values from .env
// ---------------------------------------------------------------------------
(async () => {
  const connectionType = process.env.ESP32_CONNECTION || 'serial';
  if (connectionType !== 'serial') {
    console.log(`[ESP32] Connection type "${connectionType}" — serial not initialised.`);
    return;
  }

  const portPath = process.env.ESP32_SERIAL_PORT || 'COM3';
  const baudRate = parseInt(process.env.ESP32_BAUD_RATE || '115200', 10);

  try {
    await connect(portPath, baudRate);
  } catch (err) {
    console.error(`[ESP32] Auto-connect failed: ${err.message}`);
    console.error('[ESP32] Open the IV Regulator page and use the Connection panel to reconnect.');
  }
})();

module.exports = { connect, disconnect, listPorts, sendCommand, getStatus };
