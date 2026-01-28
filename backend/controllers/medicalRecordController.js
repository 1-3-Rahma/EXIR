const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const path = require('path');
const fs = require('fs');

// @desc    Upload medical record (lab results, imaging)
// @route   POST /api/v1/medical-records/upload
// @access  Private
const uploadRecord = async (req, res) => {
  try {
    const { patientId, recordType, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    if (!patientId) {
      return res.status(400).json({ message: 'Please provide patientId' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Patient not found' });
    }

    const record = await MedicalRecord.create({
      patientId,
      recordType: recordType || 'other',
      fileName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      description: description || ''
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      record: {
        _id: record._id,
        fileName: record.fileName,
        recordType: record.recordType,
        fileUrl: `/api/v1/files/${record._id}`
      }
    });
  } catch (error) {
    console.error('Upload record error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get medical records for a patient
// @route   GET /api/v1/medical-records/patient/:patientId
// @access  Private
const getPatientRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { recordType } = req.query;

    let query = { patientId };
    if (recordType) {
      query.recordType = recordType;
    }

    const records = await MedicalRecord.find(query)
      .populate('uploadedBy', 'fullName')
      .sort({ createdAt: -1 });

    const recordsWithUrls = records.map(record => ({
      _id: record._id,
      recordType: record.recordType,
      fileName: record.fileName,
      fileUrl: `/api/v1/files/${record._id}`,
      description: record.description,
      uploadedBy: record.uploadedBy?.fullName,
      createdAt: record.createdAt
    }));

    res.json(recordsWithUrls);
  } catch (error) {
    console.error('Get patient records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Download a medical record file
// @route   GET /api/v1/files/:recordId
// @access  Private
const downloadFile = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (!fs.existsSync(record.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${record.fileName}"`);

    const fileStream = fs.createReadStream(record.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a medical record
// @route   DELETE /api/v1/medical-records/:recordId
// @access  Private
const deleteRecord = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (fs.existsSync(record.filePath)) {
      fs.unlinkSync(record.filePath);
    }

    await MedicalRecord.findByIdAndDelete(recordId);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadRecord,
  getPatientRecords,
  downloadFile,
  deleteRecord
};
