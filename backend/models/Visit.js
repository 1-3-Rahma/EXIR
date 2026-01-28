const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  hospitalId: {
    type: String,
    required: true
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  dischargeDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['admitted', 'discharged'],
    default: 'admitted'
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

visitSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('Visit', visitSchema);
