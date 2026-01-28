const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  heartRate: {
    type: Number,
    required: true
  },
  spo2: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    default: 'sensor'
  },
  isCritical: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

vitalSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Vital', vitalSchema);
