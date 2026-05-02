const mongoose = require('mongoose');

/**
 * InfusionLog — granular per-command audit log.
 * Separate from the inline logs array in InfusionSession so that log
 * queries can be made without loading the full session document.
 */
const infusionLogSchema = new mongoose.Schema({
  sessionId:  { type: String, required: true, index: true },
  timestamp:  { type: Date, default: Date.now },

  // High-level event name: 'START', 'PAUSE', 'RESUME', 'STOP', 'COMMAND_SENT', 'CONFIG'
  event:      { type: String, required: true },

  // The exact string written to the ESP32 serial port (may be null for CONFIG events)
  command:    { type: String, default: null },

  // The last response line read back from the ESP32 at the time of the event
  response:   { type: String, default: null },
});

module.exports = mongoose.model('InfusionLog', infusionLogSchema);
