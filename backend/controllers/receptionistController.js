const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const Billing = require('../models/Billing');
const User = require('../models/User');

// @desc    Register a new patient
// @route   POST /api/v1/receptionist/register-patient
// @access  Private (Receptionist)
const registerPatient = async (req, res) => {
  try {
    const { nationalID, fullName, dateOfBirth, gender, contactInfo, emergencyContact, phone } = req.body;

    if (!nationalID || !fullName) {
      return res.status(400).json({ message: 'National ID and full name are required' });
    }

    let patient = await Patient.findOne({ nationalID });

    if (patient) {
      return res.status(400).json({
        message: 'Patient with this National ID already exists',
        patientId: patient._id
      });
    }

    patient = await Patient.create({
      nationalID,
      fullName,
      dateOfBirth: dateOfBirth || null,
      gender: gender || 'other',
      contactInfo: contactInfo || '',
      emergencyContact: emergencyContact || '',
      phone: phone || contactInfo,
      registeredByReceptionistId: req.user._id
    });

    res.status(201).json({
      message: 'Patient registered successfully',
      patient
    });
  } catch (error) {
    console.error('Register patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient profile
// @route   GET /api/v1/receptionist/patient/:patientId
// @access  Private (Receptionist)
const getPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({
      _id: patient._id,
      nationalID: patient.nationalID,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      contactInfo: patient.contactInfo
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search patient by National ID
// @route   GET /api/v1/receptionist/patient/search/:nationalID
// @access  Private (Receptionist)
const searchPatientByNationalID = async (req, res) => {
  try {
    const { nationalID } = req.params;

    const patient = await Patient.findOne({ nationalID });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Search patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient visit history
// @route   GET /api/v1/receptionist/patient/:patientId/visits
// @access  Private (Receptionist)
const getPatientVisits = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const visits = await Visit.find({ patientId })
      .sort({ admissionDate: -1 });

    const formattedVisits = visits.map(v => ({
      visitId: v._id,
      admissionDate: v.admissionDate,
      dischargeDate: v.dischargeDate,
      status: v.status
    }));

    res.json(formattedVisits);
  } catch (error) {
    console.error('Get patient visits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient billing
// @route   GET /api/v1/receptionist/patient/:patientId/billing
// @access  Private (Receptionist)
const getPatientBilling = async (req, res) => {
  try {
    const { patientId } = req.params;

    const billing = await Billing.findOne({ patientId })
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
      paymentStatus: billing.paymentStatus
    });
  } catch (error) {
    console.error('Get patient billing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check discharge status
// @route   GET /api/v1/receptionist/patient/:patientId/discharge-status
// @access  Private (Receptionist)
const getDischargeStatus = async (req, res) => {
  try {
    const { patientId } = req.params;

    const billing = await Billing.findOne({ patientId })
      .sort({ createdAt: -1 });

    const dueAmount = billing ? billing.dueAmount : 0;
    const isCleared = dueAmount <= 0;

    res.json({
      isCleared,
      dueAmount
    });
  } catch (error) {
    console.error('Get discharge status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update patient info
// @route   PUT /api/v1/receptionist/patient/:patientId
// @access  Private (Receptionist)
const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { fullName, contactInfo, emergencyContact, phone } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (fullName) patient.fullName = fullName;
    if (contactInfo) patient.contactInfo = contactInfo;
    if (emergencyContact) patient.emergencyContact = emergencyContact;
    if (phone) patient.phone = phone;

    await patient.save();

    res.json({
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerPatient,
  getPatient,
  searchPatientByNationalID,
  getPatientVisits,
  getPatientBilling,
  getDischargeStatus,
  updatePatient
};
