const Patient = require('../models/Patient');
const Vital = require('../models/Vital');
const Case = require('../models/Case');
const Billing = require('../models/Billing');
const MedicalRecord = require('../models/MedicalRecord');
const Visit = require('../models/Visit');
const Appointment = require('../models/Appointment');

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

    // Get all visits with billing information and medical records
    const visits = await Visit.find({ patientId: patient._id })
      .populate('registeredBy', 'fullName')
      .populate('supervisingDoctor', 'fullName specialization')
      .sort({ admissionDate: -1 });

    // Get billing and medical records for each visit
    const visitsWithDetails = await Promise.all(
      visits.map(async (visit) => {
        const billing = await Billing.findOne({ visitId: visit._id });

        // Get medical records associated with this visit (by date range or visitId if linked)
        const visitStartDate = new Date(visit.admissionDate);
        visitStartDate.setHours(0, 0, 0, 0);

        const visitEndDate = visit.dischargeDate
          ? new Date(visit.dischargeDate)
          : new Date();
        visitEndDate.setHours(23, 59, 59, 999);

        // Fetch medical records (lab results, imaging, reports) created during visit
        const medicalRecords = await MedicalRecord.find({
          patientId: patient._id,
          createdAt: { $gte: visitStartDate, $lte: visitEndDate }
        }).populate('uploadedBy', 'fullName');

        return {
          _id: visit._id,
          title: visit.title || `${visit.reason.charAt(0).toUpperCase() + visit.reason.slice(1)} Visit`,
          description: visit.description,
          reason: visit.reason,
          hospitalName: visit.hospitalName,
          supervisingDoctor: visit.supervisingDoctor,
          admissionDate: visit.admissionDate,
          dischargeDate: visit.dischargeDate,
          status: visit.status,
          registeredBy: visit.registeredBy,
          billing: billing ? {
            totalAmount: billing.totalAmount,
            paidAmount: billing.paidAmount,
            dueAmount: billing.dueAmount,
            paymentStatus: billing.paymentStatus,
            items: billing.items
          } : null,
          medicalRecords: medicalRecords.map(record => ({
            _id: record._id,
            recordType: record.recordType,
            fileName: record.fileName,
            description: record.description,
            uploadedBy: record.uploadedBy?.fullName || 'Unknown',
            createdAt: record.createdAt
          }))
        };
      })
    );

    // Get all appointments (past and upcoming) with notes
    const appointments = await Appointment.find({ patientId: patient._id })
      .populate('doctorId', 'fullName specialization department')
      .sort({ date: -1 });

    // Get all cases with diagnosis, treatment, medications
    const cases = await Case.find({ patientId: patient._id })
      .populate('doctorId', 'fullName specialization')
      .sort({ createdAt: -1 });

    // Format cases for history display
    const formattedCases = cases.map(c => ({
      _id: c._id,
      status: c.status,
      patientStatus: c.patientStatus,
      diagnosis: c.diagnosis,
      treatmentPlan: c.treatmentPlan,
      notes: c.notes,
      medications: c.medications,
      ivOrders: c.ivOrders,
      doctor: c.doctorId,
      closedAt: c.closedAt,
      createdAt: c.createdAt
    }));

    res.json({
      patient: {
        nationalID: patient.nationalID,
        fullName: patient.fullName,
        dateOfBirth: patient.dateOfBirth,
        contactInfo: patient.contactInfo,
        phone: patient.phone
      },
      visits: visitsWithDetails,
      appointments,
      cases: formattedCases
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

// @desc    Get medical records (lab results, imaging, prescriptions)
// @route   GET /api/v1/patient/download-records
// @access  Private (Patient)
const downloadRecords = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const { startDate, endDate, recordType } = req.query;

    // Get uploaded medical records (lab, imaging, reports)
    let recordQuery = { patientId: patient._id };

    if (startDate || endDate) {
      recordQuery.createdAt = {};
      if (startDate) recordQuery.createdAt.$gte = new Date(startDate);
      if (endDate) recordQuery.createdAt.$lte = new Date(endDate);
    }

    // If filtering by prescription, don't query MedicalRecord for that type
    if (recordType && recordType !== 'prescription') {
      recordQuery.recordType = recordType;
    }

    const medicalRecords = await MedicalRecord.find(
      recordType === 'prescription' ? { patientId: null } : recordQuery
    )
      .populate('uploadedBy', 'fullName')
      .sort({ createdAt: -1 });

    const recordsWithUrls = medicalRecords.map(record => ({
      _id: record._id,
      recordType: record.recordType,
      fileName: record.fileName,
      fileUrl: `/api/v1/files/${record._id}`,
      description: record.description,
      uploadedBy: record.uploadedBy?.fullName || 'Unknown',
      createdAt: record.createdAt,
      source: 'file'
    }));

    // Get prescriptions from Cases (if not filtering by other types)
    let prescriptions = [];
    if (!recordType || recordType === 'prescription') {
      const cases = await Case.find({ patientId: patient._id })
        .populate('doctorId', 'fullName specialization')
        .sort({ createdAt: -1 });

      // Extract medications as prescriptions
      for (const caseItem of cases) {
        if (caseItem.medications && caseItem.medications.length > 0) {
          for (const med of caseItem.medications) {
            prescriptions.push({
              _id: `${caseItem._id}_${med._id || med.medicineName}`,
              recordType: 'prescription',
              fileName: med.medicineName,
              description: `${med.timesPerDay}x daily${med.note ? ' - ' + med.note : ''}`,
              uploadedBy: caseItem.doctorId?.fullName || 'Doctor',
              doctorSpecialization: caseItem.doctorId?.specialization,
              status: med.status,
              caseId: caseItem._id,
              diagnosis: caseItem.diagnosis,
              createdAt: caseItem.createdAt,
              source: 'prescription'
            });
          }
        }
      }
    }

    // Combine and sort by date
    const allRecords = [...recordsWithUrls, ...prescriptions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allRecords);
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

// @desc    Get upcoming appointments for patient
// @route   GET /api/v1/patient/appointments
// @access  Private (Patient)
const getAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      patientId: patient._id,
      date: { $gte: today },
      status: { $in: ['pending', 'confirmed'] }
    })
      .populate('doctorId', 'fullName specialization')
      .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get today's medications for patient
// @route   GET /api/v1/patient/medications
// @access  Private (Patient)
const getMedications = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    // Get active case with medications
    const activeCase = await Case.findOne({
      patientId: patient._id,
      status: 'open'
    }).populate('doctorId', 'fullName specialization');

    if (!activeCase) {
      return res.json({ medications: [], ivOrders: [] });
    }

    // Filter active medications
    const activeMedications = activeCase.medications.filter(
      med => med.status === 'active'
    );

    // Filter active IV orders
    const activeIvOrders = activeCase.ivOrders.filter(
      iv => iv.status === 'active'
    );

    res.json({
      caseId: activeCase._id,
      doctor: activeCase.doctorId,
      diagnosis: activeCase.diagnosis,
      treatmentPlan: activeCase.treatmentPlan,
      medications: activeMedications,
      ivOrders: activeIvOrders
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient dashboard data
// @route   GET /api/v1/patient/dashboard
// @access  Private (Patient)
const getDashboard = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get upcoming appointments
    const upcomingAppointments = await Appointment.find({
      patientId: patient._id,
      date: { $gte: today },
      status: { $in: ['pending', 'confirmed'] }
    })
      .populate('doctorId', 'fullName specialization')
      .sort({ date: 1, time: 1 })
      .limit(5);

    // Get active case with medications
    const activeCase = await Case.findOne({
      patientId: patient._id,
      status: 'open'
    }).populate('doctorId', 'fullName specialization');

    let todayMedications = [];
    if (activeCase) {
      todayMedications = activeCase.medications.filter(
        med => med.status === 'active'
      );
    }

    res.json({
      patient: {
        fullName: patient.fullName,
        nationalID: patient.nationalID
      },
      upcomingAppointments,
      todayMedications,
      stats: {
        upcomingAppointmentsCount: upcomingAppointments.length,
        todayMedicationsCount: todayMedications.length
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getVitals,
  getMedicalHistory,
  getBilling,
  downloadRecords,
  getProfile,
  getAppointments,
  getMedications,
  getDashboard
};
