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
  }
}, {
  timestamps: true
});

caseSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('Case', caseSchema);
