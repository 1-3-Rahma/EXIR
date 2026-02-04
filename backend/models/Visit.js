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
  hospitalName: {
    type: String,
    default: 'EXIR Medical Center'
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    enum: ['checkup', 'surgery', 'consultation', 'test', 'emergency', 'follow-up', 'admission', 'other'],
    default: 'checkup'
  },
  supervisingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
