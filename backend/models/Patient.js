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
    required: true
  },
  contactInfo: {
    type: String,
    default: ''
  },
  emergencyContact: {
    type: String,
    default: ''
  },
  emergencyContactName: {
    type: String,
    required: true
  },
  emergencyContactPhone: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{11}$/.test(v);
      },
      message: 'Emergency contact phone must be exactly 11 digits'
    }
  },
  emergencyContactRelation: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{11}$/.test(v);
      },
      message: 'Phone number must be exactly 11 digits'
    }
  },
  email: {
    type: String,
    default: ''
  },
  address: {
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
