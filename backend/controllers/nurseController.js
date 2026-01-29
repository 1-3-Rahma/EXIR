const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const Vital = require('../models/Vital');
const Patient = require('../models/Patient');
const Task = require('../models/Task');
const MedicalRecord = require('../models/MedicalRecord');

// Normal vital ranges for reference
const NORMAL_VITAL_RANGES = {
  bloodPressure: { systolicMin: 90, systolicMax: 120, diastolicMin: 60, diastolicMax: 80, unit: 'mmHg' },
  heartRate: { min: 60, max: 100, unit: 'bpm' },
  temperature: { min: 97.8, max: 99.1, unit: '°F' },
  oxygenSaturation: { min: 95, max: 100, unit: '%' },
  respiratoryRate: { min: 12, max: 20, unit: '/min' }
};

// Helper to check vital status
const getVitalStatus = (type, value, value2 = null) => {
  switch (type) {
    case 'bp':
      const systolic = value;
      const diastolic = value2;
      if (systolic < 80 || systolic > 140 || diastolic < 50 || diastolic > 100) return 'critical';
      if (systolic < NORMAL_VITAL_RANGES.bloodPressure.systolicMin ||
          systolic > NORMAL_VITAL_RANGES.bloodPressure.systolicMax ||
          diastolic < NORMAL_VITAL_RANGES.bloodPressure.diastolicMin ||
          diastolic > NORMAL_VITAL_RANGES.bloodPressure.diastolicMax) return 'warning';
      return 'normal';
    case 'hr':
      if (value < 50 || value > 120) return 'critical';
      if (value < NORMAL_VITAL_RANGES.heartRate.min || value > NORMAL_VITAL_RANGES.heartRate.max) return 'warning';
      return 'normal';
    case 'temp':
      if (value < 96 || value > 101) return 'critical';
      if (value < NORMAL_VITAL_RANGES.temperature.min || value > NORMAL_VITAL_RANGES.temperature.max) return 'warning';
      return 'normal';
    case 'o2':
      if (value < 90) return 'critical';
      if (value < NORMAL_VITAL_RANGES.oxygenSaturation.min) return 'warning';
      return 'normal';
    case 'resp':
      if (value < 8 || value > 25) return 'critical';
      if (value < NORMAL_VITAL_RANGES.respiratoryRate.min || value > NORMAL_VITAL_RANGES.respiratoryRate.max) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
};

// @desc    Get patients assigned to nurse
// @route   GET /api/v1/nurse/assigned-patients
// @access  Private (Nurse)
const getAssignedPatients = async (req, res) => {
  try {
    const nurseId = req.user._id;

    const assignments = await Assignment.find({ nurseId, isActive: true })
      .populate('patientId', '_id nationalID fullName dateOfBirth contactInfo')
      .populate('doctorId', 'fullName');

    const patients = assignments.map(a => ({
      _id: a.patientId._id,
      nationalID: a.patientId.nationalID,
      fullName: a.patientId.fullName,
      dateOfBirth: a.patientId.dateOfBirth,
      contactInfo: a.patientId.contactInfo,
      assignedDoctor: a.doctorId?.fullName,
      shift: a.shift,
      assignedAt: a.assignedAt
    }));

    res.json(patients);
  } catch (error) {
    console.error('Get assigned patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get critical events for nurse
// @route   GET /api/v1/nurse/critical-events
// @access  Private (Nurse)
const getCriticalEvents = async (req, res) => {
  try {
    const nurseId = req.user._id;

    const criticalNotifications = await Notification.find({
      userId: nurseId,
      type: 'critical'
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('relatedPatientId', 'fullName nationalID');

    res.json(criticalNotifications);
  } catch (error) {
    console.error('Get critical events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient vitals (for assigned patients)
// @route   GET /api/v1/nurse/patient/:patientId/vitals
// @access  Private (Nurse)
const getPatientVitals = async (req, res) => {
  try {
    const nurseId = req.user._id;
    const { patientId } = req.params;

    const assignment = await Assignment.findOne({
      nurseId,
      patientId,
      isActive: true
    });

    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this patient' });
    }

    const vitals = await Vital.find({ patientId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(vitals);
  } catch (error) {
    console.error('Get patient vitals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get latest vitals for all assigned patients
// @route   GET /api/v1/nurse/vitals-overview
// @access  Private (Nurse)
const getVitalsOverview = async (req, res) => {
  try {
    const nurseId = req.user._id;

    const assignments = await Assignment.find({ nurseId, isActive: true })
      .populate('patientId', 'fullName nationalID');

    const overview = await Promise.all(
      assignments.map(async (assignment) => {
        const latestVital = await Vital.findOne({ patientId: assignment.patientId._id })
          .sort({ createdAt: -1 });

        return {
          patient: {
            _id: assignment.patientId._id,
            fullName: assignment.patientId.fullName,
            nationalID: assignment.patientId.nationalID
          },
          latestVital: latestVital || null
        };
      })
    );

    res.json(overview);
  } catch (error) {
    console.error('Get vitals overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get nurse dashboard stats
// @route   GET /api/v1/nurse/dashboard
// @access  Private (Nurse)
const getDashboardStats = async (req, res) => {
  try {
    const nurseId = req.user._id;

    // Get assigned patients count
    const assignments = await Assignment.find({ nurseId, isActive: true });
    const patientCount = assignments.length;

    // Get today's tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingTasks = await Task.countDocuments({
      createdBy: nurseId,
      status: { $in: ['pending', 'in_progress'] }
    });

    // Get critical alerts count
    const criticalAlerts = await Notification.countDocuments({
      userId: nurseId,
      type: 'critical',
      read: false
    });

    res.json({
      success: true,
      data: {
        assignedPatients: patientCount,
        pendingTasks,
        criticalAlerts,
        normalRanges: NORMAL_VITAL_RANGES
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get medications for assigned patients
// @route   GET /api/v1/nurse/medications
// @access  Private (Nurse)
const getMedications = async (req, res) => {
  try {
    const nurseId = req.user._id;

    // Get assigned patient IDs
    const assignments = await Assignment.find({ nurseId, isActive: true });
    const patientIds = assignments.map(a => a.patientId);

    // Get medical records with medications
    const records = await MedicalRecord.find({
      patientId: { $in: patientIds },
      'medications.0': { $exists: true }
    })
      .populate('patientId', 'fullName nationalID')
      .select('patientId medications');

    // Format medications list
    const medications = [];
    records.forEach(record => {
      if (record.medications && record.medications.length > 0) {
        record.medications.forEach(med => {
          medications.push({
            _id: med._id || `${record._id}-${med.name}`,
            patientId: record.patientId._id,
            patientName: record.patientId.fullName,
            medication: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            route: med.route || 'Oral',
            status: med.status || 'active',
            startDate: med.startDate,
            endDate: med.endDate,
            notes: med.notes
          });
        });
      }
    });

    res.json({
      success: true,
      data: medications
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get formatted vitals overview with status
// @route   GET /api/v1/nurse/vitals-formatted
// @access  Private (Nurse)
const getFormattedVitalsOverview = async (req, res) => {
  try {
    const nurseId = req.user._id;

    const assignments = await Assignment.find({ nurseId, isActive: true })
      .populate('patientId', 'fullName nationalID room');

    const overview = await Promise.all(
      assignments.map(async (assignment) => {
        const latestVital = await Vital.findOne({ patientId: assignment.patientId._id })
          .sort({ createdAt: -1 });

        if (!latestVital) {
          return null;
        }

        // Format vitals with status
        const vitals = {
          bp: {
            systolic: latestVital.bloodPressure?.systolic || 0,
            diastolic: latestVital.bloodPressure?.diastolic || 0,
            status: getVitalStatus('bp', latestVital.bloodPressure?.systolic, latestVital.bloodPressure?.diastolic),
            trend: 'stable'
          },
          hr: {
            value: latestVital.heartRate || 0,
            status: getVitalStatus('hr', latestVital.heartRate),
            trend: 'stable'
          },
          temp: {
            value: latestVital.temperature || 0,
            status: getVitalStatus('temp', latestVital.temperature),
            trend: 'stable'
          },
          o2: {
            value: latestVital.oxygenSaturation || 0,
            status: getVitalStatus('o2', latestVital.oxygenSaturation),
            trend: 'stable'
          },
          resp: {
            value: latestVital.respiratoryRate || 0,
            status: getVitalStatus('resp', latestVital.respiratoryRate),
            trend: 'stable'
          }
        };

        // Check for alerts
        let alert = null;
        if (vitals.bp.status === 'critical' || vitals.hr.status === 'critical' ||
            vitals.o2.status === 'critical' || vitals.temp.status === 'critical') {
          alert = {
            message: 'Critical vital signs detected',
            action: 'Immediate attention required'
          };
        }

        return {
          _id: assignment.patientId._id,
          name: assignment.patientId.fullName,
          room: assignment.patientId.room || 'N/A',
          updatedAt: latestVital.createdAt,
          vitals,
          alert
        };
      })
    );

    // Filter out null values (patients without vitals)
    const filteredOverview = overview.filter(o => o !== null);

    res.json({
      success: true,
      data: filteredOverview,
      normalRanges: NORMAL_VITAL_RANGES
    });
  } catch (error) {
    console.error('Get formatted vitals overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Record new vital signs for a patient
// @route   POST /api/v1/nurse/vitals
// @access  Private (Nurse)
const recordVitals = async (req, res) => {
  try {
    const nurseId = req.user._id;
    const { patientId, bloodPressure, heartRate, temperature, oxygenSaturation, respiratoryRate, notes } = req.body;

    // Verify nurse is assigned to this patient
    const assignment = await Assignment.findOne({
      nurseId,
      patientId,
      isActive: true
    });

    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this patient' });
    }

    const vital = new Vital({
      patientId,
      recordedBy: nurseId,
      bloodPressure,
      heartRate,
      temperature,
      oxygenSaturation,
      respiratoryRate,
      notes
    });

    await vital.save();

    // Check for critical values and create notification if needed
    const bpStatus = getVitalStatus('bp', bloodPressure?.systolic, bloodPressure?.diastolic);
    const hrStatus = getVitalStatus('hr', heartRate);
    const tempStatus = getVitalStatus('temp', temperature);
    const o2Status = getVitalStatus('o2', oxygenSaturation);

    if (bpStatus === 'critical' || hrStatus === 'critical' || tempStatus === 'critical' || o2Status === 'critical') {
      const patient = await Patient.findById(patientId);
      await Notification.create({
        userId: nurseId,
        type: 'critical',
        title: 'Critical Vital Signs',
        message: `Critical vital signs recorded for ${patient?.fullName || 'patient'}`,
        relatedPatientId: patientId
      });
    }

    res.status(201).json({
      success: true,
      data: vital
    });
  } catch (error) {
    console.error('Record vitals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get normal vital ranges reference
// @route   GET /api/v1/nurse/vital-ranges
// @access  Private (Nurse)
const getVitalRanges = async (req, res) => {
  res.json({
    success: true,
    data: NORMAL_VITAL_RANGES
  });
};

module.exports = {
  getAssignedPatients,
  getCriticalEvents,
  getPatientVitals,
  getVitalsOverview,
  getDashboardStats,
  getMedications,
  getFormattedVitalsOverview,
  recordVitals,
  getVitalRanges
};
