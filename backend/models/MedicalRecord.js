const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  recordType: {
    type: String,
    enum: ['lab', 'imaging', 'report', 'other'],
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

medicalRecordSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
