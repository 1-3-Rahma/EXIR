const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['critical', 'update', 'info', 'assignment', 'medication', 'appointment'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  relatedPatientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  relatedVitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vital'
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
