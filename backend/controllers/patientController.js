const Patient = require('../models/Patient');
const Vital = require('../models/Vital');
const Case = require('../models/Case');
const Billing = require('../models/Billing');
const MedicalRecord = require('../models/MedicalRecord');
const Visit = require('../models/Visit');

// @desc    Get vitals history for patient
// @route   GET /api/v1/patient/vitals
// @access  Private (Patient)
const getVitals = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const { startDate, endDate, limit = 100 } = req.query;

    let query = { patientId: patient._id };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const vitals = await Vital.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(vitals);
  } catch (error) {
    console.error('Get vitals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get medical history
// @route   GET /api/v1/patient/medical-history
// @access  Private (Patient)
const getMedicalHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const cases = await Case.find({ patientId: patient._id })
      .populate('doctorId', 'fullName specialization')
      .sort({ createdAt: -1 });

    const visits = await Visit.find({ patientId: patient._id })
      .sort({ admissionDate: -1 });

    res.json({
      patient: {
        nationalID: patient.nationalID,
        fullName: patient.fullName,
        dateOfBirth: patient.dateOfBirth,
        contactInfo: patient.contactInfo
      },
      cases,
      visits
    });
  } catch (error) {
    console.error('Get medical history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient billing summary
// @route   GET /api/v1/patient/billing
// @access  Private (Patient)
const getBilling = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const billing = await Billing.findOne({ patientId: patient._id })
      .sort({ createdAt: -1 });

    if (!billing) {
      return res.json({
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        paymentStatus: 'no_bills'
      });
    }

    res.json({
      totalAmount: billing.totalAmount,
      paidAmount: billing.paidAmount,
      dueAmount: billing.dueAmount,
      paymentStatus: billing.paymentStatus,
      items: billing.items
    });
  } catch (error) {
    console.error('Get billing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Download medical records (PDF/Image)
// @route   GET /api/v1/patient/download-records
// @access  Private (Patient)
const downloadRecords = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const { startDate, endDate, recordType } = req.query;

    let query = { patientId: patient._id };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (recordType) {
      query.recordType = recordType;
    }

    const records = await MedicalRecord.find(query)
      .sort({ createdAt: -1 });

    const recordsWithUrls = records.map(record => ({
      _id: record._id,
      recordType: record.recordType,
      fileName: record.fileName,
      fileUrl: `/api/v1/files/${record._id}`,
      description: record.description,
      createdAt: record.createdAt
    }));

    res.json(recordsWithUrls);
  } catch (error) {
    console.error('Download records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient profile
// @route   GET /api/v1/patient/profile
// @access  Private (Patient)
const getProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getVitals,
  getMedicalHistory,
  getBilling,
  downloadRecords,
  getProfile
};
