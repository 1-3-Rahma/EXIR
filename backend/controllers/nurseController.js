const Assignment = require('../models/Assignment');
const Case = require('../models/Case');
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

// @desc    Get patients assigned to nurse (include doctor-set status: Case.patientStatus = single source for both UIs)
// @route   GET /api/v1/nurse/assigned-patients
// @access  Private (Nurse)
const getAssignedPatients = async (req, res) => {
  try {
    const nurseId = req.user._id;

    const assignments = await Assignment.find({ nurseId, isActive: true })
      .populate('patientId', '_id nationalID fullName dateOfBirth contactInfo gender')
      .populate('doctorId', 'fullName');

    const patientIds = assignments.map(a => a.patientId._id);
    const criticalCases = await Case.find({
      patientId: { $in: patientIds },
      status: 'open',
      patientStatus: 'critical'
    }).select('patientId');
    const criticalPatientIds = new Set(criticalCases.map(c => c.patientId.toString()));

    const patients = assignments.map(a => {
      const pid = a.patientId._id.toString();
      return {
        _id: a.patientId._id,
        nationalID: a.patientId.nationalID,
        fullName: a.patientId.fullName,
        dateOfBirth: a.patientId.dateOfBirth,
        contactInfo: a.patientId.contactInfo,
        gender: a.patientId.gender,
        assignedDoctor: a.doctorId?.fullName,
        shift: a.shift,
        assignedAt: a.assignedAt,
        patientStatus: criticalPatientIds.has(pid) ? 'critical' : 'stable'
      };
    });

    res.json(patients);
  } catch (error) {
    console.error('Get assigned patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get critical events for nurse (notifications only, for backwards compat)
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
      .populate('relatedPatientId', 'fullName nationalID contactInfo');

    const formatted = criticalNotifications.map(n => ({
      _id: n._id,
      patientName: n.relatedPatientId?.fullName || 'Unknown Patient',
      room: n.relatedPatientId?.contactInfo || 'N/A',
      reason: n.message || n.title || 'Critical alert',
      type: 'critical',
      createdAt: n.createdAt,
      source: 'vitals'
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get critical events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unified urgent cases for nurse (doctor-marked critical + vital alerts)
// @route   GET /api/v1/nurse/urgent-cases
// @access  Private (Nurse)
// When Dr. Ahmed Hassan marks a patient critical, nurse Fatima sees it here with vitals alerts
const getUrgentCases = async (req, res) => {
  try {
    const nurseId = req.user._id;

    const assignments = await Assignment.find({ nurseId, isActive: true })
      .select('patientId');
    const assignedPatientIds = assignments.map(a => a.patientId);

    if (assignedPatientIds.length === 0) {
      return res.json({ count: 0, list: [] });
    }

    const criticalCases = await Case.find({
      patientId: { $in: assignedPatientIds },
      status: 'open',
      patientStatus: 'critical'
    })
      .populate('patientId', 'fullName contactInfo')
      .populate('doctorId', 'fullName')
      .sort({ updatedAt: -1 });

    // When doctor re-converts patient to stable, remove from urgent: exclude these from list and count
    const stableCases = await Case.find({
      patientId: { $in: assignedPatientIds },
      status: 'open',
      patientStatus: 'stable'
    }).select('patientId');
    const stablePatientIds = new Set(stableCases.map(c => c.patientId.toString()));

    const criticalNotifications = await Notification.find({
      userId: nurseId,
      type: 'critical',
      relatedPatientId: { $in: assignedPatientIds }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('relatedPatientId', 'fullName contactInfo');

    const byPatient = new Map();

    criticalCases.forEach(c => {
      if (!c.patientId) return;
      const pid = c.patientId._id.toString();
      if (!byPatient.has(pid)) {
        byPatient.set(pid, {
          _id: `case-${c._id}`,
          patientId: c.patientId._id,
          patientName: c.patientId.fullName || 'Unknown Patient',
          room: c.patientId.contactInfo || 'N/A',
          reason: `Marked critical by Dr. ${c.doctorId?.fullName || 'Doctor'}`,
          source: 'doctor',
          createdAt: c.updatedAt,
          doctorName: c.doctorId?.fullName
        });
      }
    });

    criticalNotifications.forEach(n => {
      const patient = n.relatedPatientId;
      if (!patient || !patient._id) return;
      const pid = patient._id.toString();
      if (stablePatientIds.has(pid)) return; // doctor re-converted to stable: remove from urgent list
      const existing = byPatient.get(pid);
      if (!existing || new Date(n.createdAt) > new Date(existing.createdAt)) {
        byPatient.set(pid, {
          _id: n._id,
          patientId: patient._id,
          patientName: patient.fullName || 'Unknown Patient',
          room: patient.contactInfo || 'N/A',
          reason: n.message || 'Critical vital alert',
          source: 'vitals',
          createdAt: n.createdAt
        });
      }
    });

    // Exclude doctor-reconverted-to-stable: they are not in criticalCases and are skipped in notifications
    const list = Array.from(byPatient.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ count: list.length, list });
  } catch (error) {
    console.error('Get urgent cases error:', error);
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

// @desc    Get medications for assigned patients (prescriptions + IV orders from Case)
// @route   GET /api/v1/nurse/medications
// @access  Private (Nurse)
const getMedications = async (req, res) => {
  try {
    const nurseId = req.user._id;

    const assignments = await Assignment.find({ nurseId, isActive: true })
      .populate('patientId', 'fullName nationalID contactInfo');
    const patientIds = assignments.map(a => a.patientId._id);

    const medications = [];

    // Get prescriptions and IV orders from Case for assigned patients
    const cases = await Case.find({
      patientId: { $in: patientIds },
      status: 'open',
      $or: [
        { 'medications.0': { $exists: true } },
        { 'ivOrders.0': { $exists: true } }
      ]
    })
      .populate('patientId', 'fullName nationalID contactInfo');

    cases.forEach(c => {
      const patientName = c.patientId?.fullName || 'Unknown';
      const patientId = c.patientId?._id;
      const room = c.patientId?.contactInfo || 'N/A';

      if (c.medications && c.medications.length > 0) {
        c.medications.forEach((med, idx) => {
          medications.push({
            _id: med._id || `rx-${c._id}-${idx}`,
            patientId,
            patientName,
            room,
            medication: med.medicineName,
            dosage: `${med.timesPerDay}x/day`,
            frequency: `${med.timesPerDay} times per day`,
            route: 'Oral',
            status: 'active',
            type: 'prescription',
            priority: 'medium',
            scheduledTime: 'As scheduled',
            notes: med.note,
            instructions: med.note
          });
        });
      }

      if (c.ivOrders && c.ivOrders.length > 0) {
        c.ivOrders.forEach((iv, idx) => {
          medications.push({
            _id: iv._id || `iv-${c._id}-${idx}`,
            patientId,
            patientName,
            room,
            medication: `IV: ${iv.fluidName}`,
            dosage: iv.volume ? `${iv.volume} @ ${iv.rate || 'N/A'}` : 'N/A',
            frequency: 'IV',
            route: 'IV',
            status: 'active',
            type: 'iv',
            priority: 'high',
            scheduledTime: 'Administer as ordered',
            notes: iv.instructions,
            instructions: iv.instructions
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

        const sys = latestVital.bloodPressure?.systolic;
        const dia = latestVital.bloodPressure?.diastolic;
        const hr = latestVital.heartRate ?? null;
        const temp = latestVital.temperature ?? null;
        const o2 = latestVital.oxygenSaturation ?? latestVital.spo2 ?? null;
        const resp = latestVital.respiratoryRate ?? null;

        const vitals = {
          bp: {
            systolic: sys ?? 0,
            diastolic: dia ?? 0,
            status: (sys != null && dia != null) ? getVitalStatus('bp', sys, dia) : 'normal',
            trend: 'stable'
          },
          hr: {
            value: hr ?? 0,
            status: hr != null ? getVitalStatus('hr', hr) : 'normal',
            trend: 'stable'
          },
          temp: {
            value: temp ?? 0,
            status: temp != null ? getVitalStatus('temp', temp) : 'normal',
            trend: 'stable'
          },
          o2: {
            value: o2 ?? 0,
            status: o2 != null ? getVitalStatus('o2', o2) : 'normal',
            trend: 'stable'
          },
          resp: {
            value: resp ?? 0,
            status: resp != null ? getVitalStatus('resp', resp) : 'normal',
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
  getUrgentCases,
  getPatientVitals,
  getVitalsOverview,
  getDashboardStats,
  getMedications,
  getFormattedVitalsOverview,
  recordVitals,
  getVitalRanges
};
