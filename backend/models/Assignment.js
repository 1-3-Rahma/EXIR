const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

assignmentSchema.index({ nurseId: 1, isActive: 1 });
assignmentSchema.index({ patientId: 1, isActive: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
