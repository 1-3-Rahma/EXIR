const mongoose = require('mongoose');

/**
 * InfusionSession — one active IV delivery session.
 * Created when a nurse selects a mode; updated on every control action.
 */
const infusionSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    default: () => `IV-${Date.now()}`,
  },

  // 'parallel'  → pumps 1-3 run simultaneously
  // 'sequential' → valves 5-7 execute one at a time via pump 4
  mode: {
    type: String,
    enum: ['parallel', 'sequential'],
    required: true,
  },

  // Full JSON configuration as received from the frontend (pump or step list)
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  status: {
    type: String,
    enum: ['idle', 'running', 'paused', 'completed', 'error'],
    default: 'idle',
  },

  // Sequential mode only: true after PRIME command completes on ESP32
  primed:    { type: Boolean, default: false },

  startedAt: { type: Date, default: null },
  stoppedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },

  // Inline audit trail — each control action appends one entry
  logs: [
    {
      timestamp: { type: Date, default: Date.now },
      event:     { type: String },   // e.g. 'START', 'PAUSE', 'STOP'
      command:   { type: String },   // raw string sent to ESP32
    },
  ],
});

module.exports = mongoose.model('InfusionSession', infusionSessionSchema);
