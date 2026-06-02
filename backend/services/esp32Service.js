/**
 * ESP32 Hardware Communication Service — WiFi / WebSocket mode
 *
 * The ESP32 connects TO this server (not the other way around).
 * Call init(httpServer) once after the HTTP server is created.
 *
 * Command protocol (same as the old serial version):
 *   Parallel:   PARALLEL <f1> <f2> <f3>
 *   Sequential: SEQSET <valve> <flow> <vol> [delay]  →  PRIME  →  START
 *   Control:    PAUSE | RESUME | STOPPARALLEL | STOPSEQ
 */

const WebSocket      = require('ws');
const EventEmitter   = require('events');

const emitter = new EventEmitter();  // iv.js listens here for ESP32 messages

let wss           = null;
let espSocket     = null;   // the currently-connected ESP32 WebSocket
let connectionState = 'disconnected';
let lastResponse  = null;
let lastError     = null;
let espIp         = null;

// ---------------------------------------------------------------------------
// init(httpServer)
// Attaches a WebSocket server to the existing HTTP server on path /esp32.
// Must be called once, after http.createServer() but before server.listen().
// ---------------------------------------------------------------------------
function markDisconnected(ws) {
  if (espSocket === ws) {
    espSocket       = null;
    espIp           = null;
    connectionState = 'disconnected';
    console.log('[ESP32] WiFi connection closed.');
  }
}

function init(httpServer) {
  // Use noServer so we only handle /esp32 upgrades. Attaching ws directly to the
  // HTTP server can break Socket.io (/socket.io) with "Invalid frame header".
  wss = new WebSocket.Server({ noServer: true });

  // prependListener ensures this runs BEFORE Socket.io's upgrade handler,
  // which destroys any upgrade request whose path doesn't match /socket.io.
  httpServer.prependListener('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname !== '/esp32') return;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Heartbeat: ping every 5 s — terminate silently-dead connections immediately
  const pingInterval = setInterval(() => {
    if (!espSocket) return;
    if (espSocket.isAlive === false) {
      console.log('[ESP32] No pong received — terminating dead connection.');
      espSocket.terminate();
      markDisconnected(espSocket);
      return;
    }
    espSocket.isAlive = false;
    espSocket.ping();
  }, 5000);

  wss.on('close', () => clearInterval(pingInterval));

  wss.on('connection', (ws, req) => {
    // If a previous ESP32 is still connected, close it first
    if (espSocket && espSocket.readyState === WebSocket.OPEN) {
      espSocket.close();
    }

    ws.isAlive     = true;
    espSocket       = ws;
    espIp           = req.socket.remoteAddress;
    connectionState = 'connected';
    lastError       = null;
    console.log(`[ESP32] WiFi connected from ${espIp}`);

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      lastResponse = data.toString().trim();
      console.log(`[ESP32 ←] ${lastResponse}`);
      emitter.emit('message', lastResponse);
    });

    ws.on('close', () => markDisconnected(ws));

    ws.on('error', (err) => {
      connectionState = 'error';
      lastError       = err.message;
      console.error(`[ESP32] WebSocket error: ${err.message}`);
    });
  });

  console.log('[ESP32] WiFi WebSocket server ready on path /esp32');
}

// ---------------------------------------------------------------------------
// sendCommand(commandString)
// Sends a text command to the connected ESP32 over WebSocket.
// ---------------------------------------------------------------------------
function sendCommand(command) {
  return new Promise((resolve, reject) => {
    if (!espSocket || espSocket.readyState !== WebSocket.OPEN) {
      const reason = lastError || 'ESP32 not connected via WiFi';
      return reject(
        new Error(`${reason}. Make sure the ESP32 is powered on and on the same WiFi network.`)
      );
    }

    const line = command.trim() + '\n';
    console.log(`[ESP32 →] ${command.trim()}`);

    espSocket.send(line, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// connect() / disconnect() — kept as stubs so iv.js routes still work
// ---------------------------------------------------------------------------
async function connect() {
  return { message: 'WiFi mode: ESP32 connects automatically when powered on.' };
}

async function disconnect() {
  if (espSocket && espSocket.readyState === WebSocket.OPEN) {
    espSocket.close();
  }
  return { message: 'ESP32 WiFi connection closed.' };
}

// ---------------------------------------------------------------------------
// listPorts() — returns empty list (no serial ports in WiFi mode)
// ---------------------------------------------------------------------------
async function listPorts() {
  return [];
}

// ---------------------------------------------------------------------------
// getStatus()
// ---------------------------------------------------------------------------
function getStatus() {
  return {
    connected:    connectionState === 'connected',
    state:        connectionState,
    portPath:     espIp ? `WiFi — ${espIp}` : null,
    baudRate:     null,
    lastResponse,
    lastError,
    ip:           espIp,
    mode:         'wifi',
  };
}

module.exports = { init, connect, disconnect, listPorts, sendCommand, getStatus, emitter };
