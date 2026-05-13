const mongoose = require('mongoose');

const patientCommentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorRole: {
    type: String,
    required: true
  },
  commentText: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

patientCommentSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('PatientComment', patientCommentSchema);
