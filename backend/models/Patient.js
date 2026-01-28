const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  nationalID: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: false
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  contactInfo: {
    type: String,
    default: ''
  },
  emergencyContact: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: true
  },
  registeredByReceptionistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema);
