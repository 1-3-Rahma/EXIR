const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  heartRate: { type: Number },
  spo2: { type: Number },
  temperature: { type: Number },
  bloodPressure: {
    systolic: { type: Number },
    diastolic: { type: Number }
  },
  oxygenSaturation: { type: Number },
  respiratoryRate: { type: Number },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  source: { type: String, default: 'sensor' },
  aiPrediction: {
    predictedClass: { type: Number },
    predictedLabel: { type: String },
    classProbabilities: { type: mongoose.Schema.Types.Mixed }
  },
  aiAlert: {
    alertLevel: { type: String },
    alertMessage: { type: String },
    recommendedAction: { type: String },
    reasons: [{ type: String }]
  },
  riskLevel: { type: String },
  confidenceScore: { type: Number },
  isAbnormal: { type: Boolean, default: false },
  isCritical: { type: Boolean, default: false },
  aiRawResponse: { type: mongoose.Schema.Types.Mixed },
  notes: { type: String }
}, {
  timestamps: true
});

vitalSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Vital', vitalSchema);
