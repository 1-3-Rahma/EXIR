const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  patientStatus: {
    type: String,
    enum: ['stable', 'critical'],
    default: 'stable'
  },
  treatmentPlan: {
    type: String,
    default: ''
  },
  diagnosis: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  closedAt: {
    type: Date,
    default: null
  },
  medications: [{
    medicineName: { type: String, required: true },
    timesPerDay: { type: Number, required: true },
    note: { type: String, default: '' },
    status: { type: String, enum: ['active', 'given'], default: 'active' },
    givenAt: { type: Date, default: null },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }],
  ivOrders: [{
    fluidName: { type: String, required: true },
    volume: { type: String, default: '' },
    rate: { type: String, default: '' },
    instructions: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'given'], default: 'active' },
    givenAt: { type: Date, default: null },
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }]
}, {
  timestamps: true
});

caseSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('Case', caseSchema);
