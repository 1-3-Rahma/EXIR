const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const Vital = require('../models/Vital');
const Patient = require('../models/Patient');

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

module.exports = {
  getAssignedPatients,
  getCriticalEvents,
  getPatientVitals,
  getVitalsOverview
};
